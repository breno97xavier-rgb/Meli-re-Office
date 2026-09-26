import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string): string | undefined => {
  try {
    // Vite / Browser environment
    if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
      return (import.meta.env as Record<string, string | undefined>)[key];
    }
  } catch {
    // Ignore error in environments without import.meta.env
  }
  try {
    // Node.js / SSR / Test environment
    if (typeof process !== 'undefined' && process.env && key in process.env) {
      return process.env[key];
    }
  } catch {
    // Ignore error in environments without process.env
  }
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://ycagvwsvccgdjzpbhrfi.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey || 'dummy-anon-key-placeholder', {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseInstance;
}

export const supabase = getSupabase();
