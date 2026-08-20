// تهيئة عميل Supabase (يُحمَّل بعد مكتبة supabase-js وبعد config.js)
const { createClient } = supabase;
window.sb = createClient(window.RAWABIT_CONFIG.SUPABASE_URL, window.RAWABIT_CONFIG.SUPABASE_ANON_KEY);
