import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cloud sync layer (Supabase). When VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 * are set the app runs in cloud mode: real auth + one shared campus "world"
 * (a JSON document every member reads/writes, so edits made on one device
 * appear on another). Without them the app silently falls back to the
 * browser-local demo store.
 */

const URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const ANON = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudReady: boolean = !!URL && !!ANON;

export const WORLD_ID = '00000000-0000-0000-0000-000000000001'; // single shared UNILAG demo world
export const WORLD_CODE = 'unilag-demo';

/** Demo accounts map username → auth email (password123). Must match schema.sql. */
export function authEmailFor(username: string): string {
  const u = username.toLowerCase().trim();
  return `${u}@demo.campushustle.app`;
}

export const isDemoEmail = (email: string) => /@demo\.campushustle\.app$/.test(email.toLowerCase());

/** Demo usernames that have matching Supabase Auth accounts (created by schema.sql, password password123). */
export const DEMO_USERNAMES = new Set(['salawu', 'morayo', 'tobi', 'chiamaka', 'admin', 'super']);

let _sb: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!cloudReady) return null;
  if (!_sb) {
    _sb = createClient(URL!, ANON!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return _sb;
}
