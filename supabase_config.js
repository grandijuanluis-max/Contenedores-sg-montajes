// Conector de Supabase y Persistencia Local para Sistema de Contenedores SG MONTAJES SRL
const SUPABASE_URL = 'https://iomxidqmsrmwukphqgpo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbXhpZHFtc3Jtd3VrcGhxZ3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjUwODgsImV4cCI6MjA3MjY0MTA4OH0.qP_O3eN4x2kFwJtVfXy9p_b8b1e4R3u8v6s9e2y5x7w';

window.supabaseClient = null;

try {
    if (typeof supabase !== 'undefined' && supabase && typeof supabase.createClient === 'function') {
        window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase Client initialized successfully for Contenedores.");
    }
} catch (e) {
    console.warn("Supabase init error, using LocalStorage fallback:", e);
}
