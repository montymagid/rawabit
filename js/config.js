// إعدادات الاتصال بـ Supabase الخاص بمنصة "روابط"
const SUPABASE_URL = "https://yrepoludvtiivfdypihd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZXBvbHVkdnRpaXZmZHlwaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMDA5NzEsImV4cCI6MjEwMjc3Njk3MX0.ghJoJgqzcFr6ZqWgiT9hYFfs7yCQlYTSLFVJsYCzFdg";

// نبني الاتصال داخل try/catch عشان لو مكتبة Supabase ما اتحملت (مشكلة إنترنت/حاجب إعلانات)،
// الموقع يفضل شغال (القوائم، الوضع الداكن، اللغة) بدل ما ينهار بالكامل صامتا.
let supabaseClient = null;
window.__RAWABIT_BACKEND_READY__ = false;
try {
  if (!window.supabase) throw new Error("Supabase library did not load");
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.__RAWABIT_BACKEND_READY__ = true;
} catch (err) {
  console.error("Rawabit: Supabase client failed to initialize:", err);
}
