const SUPABASE_URL = 'https://amkkuwgatjcbiyrykuoy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ';

window.supabaseClient = null;

try {
    if (typeof supabase !== 'undefined' && supabase && typeof supabase.createClient === 'function') {
        window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase Client initialized successfully for Contenedores.");
    }
} catch (e) {
    console.warn("Supabase init error, using LocalStorage fallback:", e);
}
