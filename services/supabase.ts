import { createClient } from '@supabase/supabase-js';

// Default values for fallback
const DEFAULT_URL = 'https://xxkgxosmtvjhbzoxqnsf.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4a2d4b3NtdHZqaGJ6b3hxbnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTc0MTksImV4cCI6MjA4MDI3MzQxOX0.DjYl3kA43ae4fHG_nOoQhAMAWZE4Miqgk3D9fIYVgLw';

const getEnv = (key: string, defaultValue: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    console.warn("Failed to read env var:", key);
  }
  return defaultValue;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL', DEFAULT_URL).trim();
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY', DEFAULT_KEY).trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Error signing out:', error.message);
  window.location.reload();
};