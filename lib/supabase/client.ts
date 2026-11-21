// Supabase client for Zouza: one project shared with zouza.ai. The schema lives in the website
// repo (aurora-homes/supabase/migrations); types/database.ts is generated from it. The client is
// typed with it in plan 3, together with the listings column fix (lib/supabase/listings.ts).
//
// Setup: put EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (the publishable key) in
// .env. Without them the app runs on local mock data (see lib/mock) and accounts are unavailable.
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Email links come back through app/auth/callback, which sets the session itself.
        detectSessionInUrl: false,
        flowType: "implicit",
      },
    })
  : null;
