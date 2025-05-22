import { offlineDebug } from './offline-debug';

class CompressionService {
  private static instance: CompressionService;
  private compressionLevel: number = 6; // Default compression level (0-9)

  private constructor() {}

  static getInstance(): CompressionService {
    if (!CompressionService.instance) {
      CompressionService.instance = new CompressionService();
    }
    return CompressionService.instance;
  }

  setCompressionLevel(level: number) {
    if (level < 0 || level > 9) {
      throw new Error('Compression level must be between 0 and 9');
    }
    this.compressionLevel = level;
  }

  async compress(data: any): Promise<Uint8Array> {
    try {
      offlineDebug.logInfo('Starting data compression', 'compression');
      
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);
      
      // Use CompressionStream API if available
      if ('CompressionStream' in window) {
        const cs = new CompressionStream('gzip');
        const writer = cs.writable.getWriter();
        const reader = cs.readable.getReader();
        
        await writer.write(dataBuffer);
        await writer.close();
        
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        const compressedData = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        );
        let offset = 0;
        for (const chunk of chunks) {
          compressedData.set(chunk, offset);
          offset += chunk.length;
        }
        
        offlineDebug.logInfo(
          'Data compressed successfully',
          'compression',
          {
            originalSize: dataBuffer.length,
            compressedSize: compressedData.length,
            ratio: (compressedData.length / dataBuffer.length * 100).toFixed(2) + '%'
          }
        );
        
        return compressedData;
      } else {
        // Fallback to pako if CompressionStream is not available
        const pako = await import('pako');
        const compressed = pako.gzip(jsonString, { level: this.compressionLevel });
        
        offlineDebug.logInfo(
          'Data compressed using pako',
          'compression',
          {
            originalSize: dataBuffer.length,
            compressedSize: compressed.length,
            ratio: (compressed.length / dataBuffer.length * 100).toFixed(2) + '%'
          }
        );
        
        return compressed;
      }
    } catch (error) {
      offlineDebug.logError(
        'Compression failed',
        'compression',
        { error }
      );
      throw error;
    }
  }

  async decompress(compressedData: Uint8Array): Promise<any> {
    try {
      offlineDebug.logInfo('Starting data decompression', 'compression');
      
      // Use DecompressionStream API if available
      if ('DecompressionStream' in window) {
        const ds = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();
        
        await writer.write(compressedData);
        await writer.close();
        
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        const decompressedData = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        );
        let offset = 0;
        for (const chunk of chunks) {
          decompressedData.set(chunk, offset);
          offset += chunk.length;
        }
        
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(decompressedData);
        
        offlineDebug.logInfo(
          'Data decompressed successfully',
          'compression',
          {
            compressedSize: compressedData.length,
            decompressedSize: decompressedData.length
          }
        );
        
        return JSON.parse(jsonString);
      } else {
        // Fallback to pako if DecompressionStream is not available
        const pako = await import('pako');
        const decompressed = pako.ungzip(compressedData, { to: 'string' });
        
        offlineDebug.logInfo(
          'Data decompressed using pako',
          'compression',
          {
            compressedSize: compressedData.length,
            decompressedSize: decompressed.length
          }
        );
        
        return JSON.parse(decompressed);
      }
    } catch (error) {
      offlineDebug.logError(
        'Decompression failed',
        'compression',
        { error }
      );
      throw error;
    }
  }

  async compressFile(file: File): Promise<Blob> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const compressedData = await this.compress(arrayBuffer);
      return new Blob([compressedData], { type: 'application/gzip' });
    } catch (error) {
      offlineDebug.logError(
        'File compression failed',
        'compression',
        { error, fileName: file.name }
      );
      throw error;
    }
  }

  async decompressFile(compressedFile: Blob): Promise<Blob> {
    try {
      const arrayBuffer = await compressedFile.arrayBuffer();
      const decompressedData = await this.decompress(new Uint8Array(arrayBuffer));
      return new Blob([decompressedData], { type: 'application/octet-stream' });
    } catch (error) {
      offlineDebug.logError(
        'File decompression failed',
        'compression',
        { error, fileName: compressedFile.name }
      );
      throw error;
    }
  }
}

export const compression = CompressionService.getInstance(); 