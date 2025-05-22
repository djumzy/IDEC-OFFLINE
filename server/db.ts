import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '../shared/postgres-schema';

// PostgreSQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'idec_db',
  ssl: {
    rejectUnauthorized: false // Required for Render PostgreSQL
  }
};

console.log('Database configuration:', {
  ...dbConfig,
  password: dbConfig.password ? '******' : undefined
});

const pool = new Pool(dbConfig);

export async function initDB() {
  console.log('Initializing PostgreSQL database connection');
  
  try {
    // Test the connection
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database');
    client.release();
    
    // Initialize Drizzle with the connection pool
    const db = drizzle(pool, { schema });
    
    return db;
  } catch (error) {
    console.error('Error connecting to PostgreSQL database:', error);
    throw error;
  }
}