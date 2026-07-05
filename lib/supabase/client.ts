// Supabase client for Aurora Homes.
//
// Setup: copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and
// EXPO_PUBLIC_SUPABASE_ANON_KEY, then run `supabase/schema.sql` against your
// project. Without those two env vars the app runs entirely on local mock
// data (see lib/mock) so it can be demoed with no backend at all.
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
        detectSessionInUrl: false,
      },
    })
  : null;
