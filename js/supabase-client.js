// ---------------------------------------------------------------------------
// supabase-client.js — Initialise & export the Supabase client singleton
// Depends on: config.js (loaded first), @supabase/supabase-js (CDN)
// ---------------------------------------------------------------------------

const supabaseClient = window.supabase.createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_KEY,
);
