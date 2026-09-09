// Isi dua nilai ini dari Supabase Dashboard -> Project Settings -> API.
// Gunakan anon/publishable key. JANGAN gunakan service_role key di browser.
const SUPABASE_URL = "MASUKKAN_SUPABASE_URL";
const SUPABASE_ANON_KEY = "MASUKKAN_SUPABASE_ANON_KEY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
