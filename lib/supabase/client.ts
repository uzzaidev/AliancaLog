"use client";

// Cliente Supabase para uso no browser (Client Components).
import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
