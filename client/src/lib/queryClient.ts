import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { indexedDBService } from "./indexedDB";

const API_URL = import.meta.env.VITE_API_URL || "";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Check if network is available
const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    // If offline and trying to modify data, save to IndexedDB and sync queue
    if (!isOnline() && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      console.log(`Offline: Queueing ${method} request to ${url}`);
      
      // Process the request to the appropriate IndexedDB store
      const storeName = getStoreNameFromUrl(url);
      if (storeName && data) {
        // Add data to IndexedDB and sync queue
        if (storeName === 'children') {
          await indexedDBService.saveChild(data as any);
        } else if (storeName === 'screenings') {
          await indexedDBService.saveScreening(data as any);
        } else if (storeName === 'users') {
          await indexedDBService.saveUser(data as any);
        }
        
        // Create a mock Response object for offline use
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`Cannot process ${method} request to ${url} while offline`);
    }
    
    // Proceed with online request
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    if (!isOnline()) {
      console.error('Network request failed while offline:', error);
      throw new Error('You are currently offline. Changes will be saved locally and synchronized when you reconnect.');
    }
    throw error;
  }
}

// Helper to get store name from URL
function getStoreNameFromUrl(url: string): string | null {
  if (url.includes('/api/children')) return 'children';
  if (url.includes('/api/screenings')) return 'screenings'; 
  if (url.includes('/api/users')) return 'users';
  return null;
}

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";
export const getQueryFn = <T>({ on401 = 'redirect' }: { on401?: UnauthorizedBehavior } = {}) =>
  async ({ queryKey }: { queryKey: unknown }) => {
    try {
      // If offline, try to get data from IndexedDB
      if (!isOnline()) {
        console.log(`Offline: Fetching data from IndexedDB for ${queryKey[0]}`);
        const storeName = getStoreNameFromUrl(queryKey[0] as string);
        
        if (storeName === 'children') {
          // Handle filters if present in queryKey[1]
          const filters = queryKey.length > 1 ? queryKey[1] as any : undefined;
          return await indexedDBService.getChildren(filters);
        } else if (storeName === 'screenings') {
          const params = queryKey.length > 1 ? queryKey[1] as any : {};
          if (params.childId) {
            return await indexedDBService.getScreeningsByChild(params.childId);
          } else if (params.screenedBy) {
            return await indexedDBService.getScreeningsByUser(params.screenedBy);
          }
          // For individual screening
          const urlParts = (queryKey[0] as string).split('/');
          const id = parseInt(urlParts[urlParts.length - 1]);
          if (!isNaN(id)) {
            const result = await indexedDBService.getScreening(id);
            return result ? [result] : [];
          }
        } else if (storeName === 'users') {
          return await indexedDBService.getUsers();
        }
        
        throw new Error(`Unable to fetch ${queryKey[0]} while offline`);
      }
      
      // Online mode - fetch from server
      const response = await fetch(`${API_URL}${queryKey[0]}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        if (on401 === 'redirect') {
          window.location.href = '/login';
        } else if (on401 === 'throw') {
          throw new Error('Unauthorized');
        }
      }

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return response.json();
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
