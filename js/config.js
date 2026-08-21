// إعدادات الاتصال بـ Supabase الخاص بمنصة "روابط"
const SUPABASE_URL = "https://yrepoludvtiivfdypihd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZXBvbHVkdnRpaXZmZHlwaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMDA5NzEsImV4cCI6MjEwMjc3Njk3MX0.ghJoJgqzcFr6ZqWgiT9hYFfs7yCQlYTSLFVJsYCzFdg";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
