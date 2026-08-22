// إعدادات الاتصال بـ Supabase الخاص بمنصة "روابط"
const SUPABASE_URL = "https://dgliysnbdfbwnlsdewxz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnbGl5c25iZGZid25sc2Rld3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTA3NjksImV4cCI6MjEwMjk2Njc2OX0.S1BOOgIYphz9Djixl0n8Togs8GhU4fNdXswNNgAXC94";

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
