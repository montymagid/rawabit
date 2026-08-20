/* روابط — أدوات مشتركة: الهيدر، الفوتر، مساعدات عامة */

const LOGO_SVG = `<svg class="brand-mark" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="20" fill="#0B6E4F"/>
  <path d="M14 24c-3 0-5-2.2-5-5s2-5 5-5h2.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M26 16c3 0 5 2.2 5 5s-2 5-5 5h-2.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M15 20h10" stroke="#E3A857" stroke-width="2.6" stroke-linecap="round"/>
</svg>`;

function fmtPrice(n){
  if(n === null || n === undefined) return '';
  return Number(n).toLocaleString('en-US', {maximumFractionDigits:2, minimumFractionDigits: (Number(n)%1===0)?0:2});
}
function escapeHtml(s){
  if(s===null||s===undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function stars(rating){
  const r = Math.round(rating||0);
  return '★'.repeat(r) + '☆'.repeat(5-r);
}
function toast(msg, type='success'){
  let el = document.getElementById('rw-toast');
  if(!el){
    el = document.createElement('div');
    el.id = 'rw-toast';
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:999;padding:13px 22px;border-radius:999px;font-size:14px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.18);transition:opacity .25s ease, bottom .25s ease;';
    document.body.appendChild(el);
  }
  el.style.background = type==='error' ? '#9A2F1E' : (type==='info' ? '#12211A' : '#0B6E4F');
  el.style.color = '#fff';
  el.textContent = msg;
  el.style.opacity = '1';
  el.style.bottom = '24px';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>{ el.style.opacity='0'; el.style.bottom='10px'; }, 3200);
}

async function getSessionUser(){
  const { data: { session } } = await window.sb.auth.getSession();
  if(!session) return null;
  const { data: profile } = await window.sb.from('profiles').select('*').eq('id', session.user.id).single();
  return { user: session.user, profile };
}

function headerTemplate(){
  return `
  <div class="container header-row">
    <a href="/index.html" class="brand">${LOGO_SVG}<span>روابط</span></a>
    <div class="header-search">
      <form id="header-search-form">
        <input type="text" id="header-search-input" placeholder="ابحث عن منتج... مثال: ايفون 16 برو" autocomplete="off">
        <button type="submit" aria-label="بحث"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></button>
      </form>
    </div>
    <nav class="header-nav">
      <a href="/index.html#categories">التصنيفات</a>
      <a href="/index.html#how">كيف تعمل</a>
      <a href="/store-register.html">سجّل متجرك</a>
      <a href="/faq.html">الأسئلة الشائعة</a>
    </nav>
    <div class="header-actions" id="header-actions">
      <a href="/login.html" class="btn btn-ghost btn-sm">دخول</a>
      <a href="/store-register.html" class="btn btn-primary btn-sm">أضف متجرك</a>
    </div>
  </div>`;
}

function footerTemplate(){
  return `
  <div class="container footer-grid">
    <div>
      <div class="footer-brand">روابط</div>
      <p>منصة سعودية لمقارنة أسعار المنتجات بين المتاجر الإلكترونية، لتختار الأفضل وتشتري مباشرة من المصدر بثقة.</p>
    </div>
    <div class="footer-col">
      <h4>المنصة</h4>
      <a href="/index.html#categories">التصنيفات</a>
      <a href="/index.html#how">كيف تعمل روابط</a>
      <a href="/store-register.html">سجّل متجرك</a>
      <a href="/login.html">تسجيل الدخول</a>
    </div>
    <div class="footer-col">
      <h4>الدعم</h4>
      <a href="/faq.html">الأسئلة الشائعة</a>
      <a href="/terms.html">الشروط والأحكام</a>
      <a href="/privacy.html">سياسة الخصوصية</a>
    </div>
    <div class="footer-col">
      <h4>تواصل معنا</h4>
      <a href="mailto:support@rawabit.sa">support@rawabit.sa</a>
      <a href="#">تويتر (X)</a>
      <a href="#">انستقرام</a>
    </div>
  </div>
  <div class="container footer-bottom">
    <span>© 2026 روابط. جميع الحقوق محفوظة.</span>
    <span>صُنع في المملكة العربية السعودية 🇸🇦</span>
  </div>`;
}

function mountHeaderFooter(){
  const h = document.getElementById('site-header');
  const f = document.getElementById('site-footer');
  if(h) h.innerHTML = headerTemplate();
  if(f) f.innerHTML = footerTemplate();

  const form = document.getElementById('header-search-form');
  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const q = document.getElementById('header-search-input').value.trim();
      window.location.href = '/search.html' + (q ? ('?q=' + encodeURIComponent(q)) : '');
    });
  }
  const params = new URLSearchParams(window.location.search);
  if(params.get('q') && document.getElementById('header-search-input')){
    document.getElementById('header-search-input').value = params.get('q');
  }

  refreshHeaderAuthState();
}

async function refreshHeaderAuthState(){
  const actions = document.getElementById('header-actions');
  if(!actions) return;
  const info = await getSessionUser();
  if(!info){ return; }
  const isAdmin = info.profile && info.profile.role === 'admin';
  actions.innerHTML = isAdmin
    ? `<a href="/admin/dashboard.html" class="btn btn-primary btn-sm">لوحة الإدارة</a>
       <button id="logout-btn" class="btn btn-ghost btn-sm">خروج</button>`
    : `<a href="/store/dashboard.html" class="btn btn-primary btn-sm">لوحة متجري</a>
       <button id="logout-btn" class="btn btn-ghost btn-sm">خروج</button>`;
  const lb = document.getElementById('logout-btn');
  if(lb) lb.addEventListener('click', async ()=>{ await window.sb.auth.signOut(); window.location.href='/index.html'; });
}

document.addEventListener('DOMContentLoaded', mountHeaderFooter);
