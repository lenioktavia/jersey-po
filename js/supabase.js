// Isi dua nilai ini dari Supabase Dashboard -> Project Settings -> API.
// Gunakan anon/publishable key. JANGAN gunakan service_role key di browser.
const SUPABASE_URL = "https://voxdsbzoxvsvbwgfjzrc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZveGRzYnpveHZzdmJ3Z2ZqenJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NDI0MjQsImV4cCI6MjEwNDQxODQyNH0.E4M98OZObl7QafjyWgWZopfE6KtWqMnvantCBbnLuA8";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
