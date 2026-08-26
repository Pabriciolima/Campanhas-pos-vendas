import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ksyygambidrptnwndjhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXlnYW1iaWRycHRud25kamhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3OTgyNTAsImV4cCI6MjA2MTM3NDI1MH0.fiK1NBwc1mIO3KQkYrPwzTf2cDqoWJAIyqDd8saAsDk";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    realtime: {
      params: {
        eventsPerSecond: 5
      }
    }
  }
);
