import {
  createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL =
  "https://mvmbrlflqgfacmhbebrw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_KBIA8l5iK0yrfT8d35xeKQ_NujhqmcX";

export const SUPABASE_BUCKET =
  "evidencias-produtivos";

export const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );