import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ksyygambidrptnwndjhr.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXlnYW1iaWRycHRud25kamhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3OTgyNTAsImV4cCI6MjA2MTM3NDI1MH0.fiK1NBwc1mIO3KQkYrPwzTf2cDqoWJAIyqDd8saAsDk";

/*
 * ============================================================
 * SUPABASE SINGLETON GLOBAL
 * ============================================================
 * Evita a criação de múltiplos GoTrueClient dentro da mesma aba.
 *
 * IMPORTANTE:
 * Todos os módulos do sistema devem importar este MESMO arquivo
 * sem query string diferente:
 *
 *   import { supabase } from "./supabase-config.js";
 *
 * Evite:
 *   ./supabase-config.js?v=...
 *
 * porque URLs de módulo diferentes podem fazer o navegador
 * executar este arquivo novamente.
 */

const SUPABASE_GLOBAL_KEY = "__MONACO_CAMPANHAS_SUPABASE__";

function criarSupabaseCompartilhado() {
  if (globalThis[SUPABASE_GLOBAL_KEY]) {
    return globalThis[SUPABASE_GLOBAL_KEY];
  }

  const cliente = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        /*
         * O Hub de Campanhas não usa login do Supabase Auth.
         * Mantemos a sessão desabilitada como já funcionava antes.
         */
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,

        /*
         * Mesmo com persistSession=false, uma chave própria evita
         * colisões caso alguma biblioteca consulte o storage de auth.
         */
        storageKey: "monaco-campanhas-supabase-auth"
      },

      realtime: {
        params: {
          eventsPerSecond: 5
        }
      }
    }
  );

  globalThis[SUPABASE_GLOBAL_KEY] = cliente;

  return cliente;
}

export const supabase = criarSupabaseCompartilhado();

export {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
};
