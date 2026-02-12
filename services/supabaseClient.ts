
import { createClient } from '@supabase/supabase-js';

// Accessing Vite environment variables
// Casting import.meta to any to avoid TypeScript error 'Property env does not exist on type ImportMeta'
const env = (import.meta as any).env;
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
// Fails safely if no keys are provided (runs in offline/local mode)
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;