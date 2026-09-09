// Isi dua nilai ini dari Supabase Dashboard -> Project Settings -> API.
// Gunakan anon/publishable key. JANGAN gunakan service_role key di browser.
const SUPABASE_URL = "https://voxdsbzoxvsvbwgfjzrc.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_jI5x0yuVUj1VpmXWFwnhRA_EA61TUCO";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
