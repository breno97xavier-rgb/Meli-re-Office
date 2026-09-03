import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ycagvwsvccgdjzpbhrfi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    if (!isSupabaseConfigured && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[Melière Office] Variáveis de ambiente Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) não estão configuradas. O cliente funcionará em modo restrito.'
      );
    }
    
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
