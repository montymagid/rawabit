let CURRENT_STORE = null;
let CATEGORIES = [];

document.addEventListener('DOMContentLoaded', async () => {
  const info = await getSessionUser();
  if(!info){ location.href = '/login.html'; return; }

  if(info.profile && info.profile.role === 'admin'){ location.href = '/admin/dashboard.html'; return; }

  const { data: store, error } = await window.sb.from('stores').select('*').eq('owner_id', info.user.id).maybeSingle();

  const guard = document.getElementById('guard-screen');
  const app = document.getElementById('dash-app');

  if(!store){
    showGuard('🚫', 'لا يوجد متجر مرتبط', 'هذا الحساب غير مرتبط بأي متجر على روابط.');
    return;
  }
  if(store.status === 'pending'){
    showGuard('⏳', 'طلبك قيد المراجعة', 'فريق روابط يراجع بيانات متجرك حاليًا. سيصلك بريد إلكتروني فور الموافقة.');
    return;
  }
  if(store.status === 'rejected'){
    showGuard('❌', 'تم رفض طلب التسجيل', store.rejection_reason || 'لأي استفسار، تواصل مع فريق الدعم على support@rawabit.sa');
    return;
  }
  if(store.status === 'suspended'){
    showGuard('⛔', 'متجرك موقوف مؤقتًا', (store.suspension_reason ? ('السبب: ' + store.suspension_reason) : 'تواصل مع الدعم لمعرفة السبب.') + ' — للتواصل: support@rawabit.sa');
    return;
  }

  CURRENT_STORE = store;
  guard.style.display = 'none';
  app.style.display = 'grid';

  const { data: cats } = await window.sb.from('categories').select('*').order('sort_order');
  CATEGORIES = cats || [];
  const catSelect = document.getElementById('p-category');
  CATEGORIES.forEach(c => { const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; catSelect.appendChild(o); });

  setupTabs();
  setupAddTabs();
  loadOverview();
  loadProducts();
  loadProfile();
  loadNotifications();

  document.getElementById('logout-link').addEventListener('click', async (e)=>{ e.preventDefault(); await window.sb.auth.signOut(); location.href='/index.html'; });
  document.getElementById('aff-fetch-btn').addEventListener('click', fetchAffiliateData);
  document.getElementById('product-form').addEventListener('submit', saveProduct);
  document.getElementById('product-cancel-btn').addEventListener('click', resetProductForm);
  document.getElementById('profile-form').addEventListener('submit', saveProfile);
});

function showGuard(icon, title, msg){
  document.getElementById('guard-screen').style.display = 'flex';
  document.getElementById('guard-icon').textContent = icon;
  document.getElementById('guard-title').textContent = title;
  document.getElementById('guard-msg').textContent = msg;
}

function setupTabs(){
  const titles = { overview:'نظرة عامة', products:'منتجاتي', add:'إضافة منتج', profile:'بيانات المتجر', notifications:'التنبيهات' };
  document.querySelectorAll('[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll('.dash-nav a[data-tab]').forEach(a=>a.classList.remove('active'));
      document.querySelectorAll(`.dash-nav a[data-tab="${tab}"]`).forEach(a=>a.classList.add('active'));
      document.querySelectorAll('[data-panel]').forEach(p => p.style.display = (p.dataset.panel === tab) ? 'block' : 'none');
      document.getElementById('page-title').textContent = titles[tab] || '';
      if(tab === 'add') resetProductForm();
    });
  });
}

function setupAddTabs(){
  document.querySelectorAll('[data-addtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-addtab]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.addtab;
      document.querySelector('[data-addpanel="affiliate"]').style.display = mode === 'affiliate' ? 'block' : 'none';
      document.querySelector('[data-addpanel="manual"]').style.display = mode === 'manual' ? 'block' : 'none';
    });
  });
}

async function loadOverview(){
  const { data: products } = await window.sb.from('products').select('*').eq('store_id', CURRENT_STORE.id);
  const list = products || [];
  document.getElementById('stat-products').textContent = list.length;
  document.getElementById('stat-active').textContent = list.filter(p=>p.status==='active').length;
  const avg = list.length ? (list.reduce((s,p)=>s+Number(p.price),0)/list.length) : 0;
  document.getElementById('stat-avg').textContent = fmtPrice(avg.toFixed(0));
  document.getElementById('stat-since').textContent = new Date(CURRENT_STORE.created_at).toLocaleDateString('ar-SA');

  const recent = list.sort((a,b)=> new Date(b.created_at)-new Date(a.created_at)).slice(0,5);
  const el = document.getElementById('overview-products');
  el.innerHTML = recent.length ? recent.map(p => `
    <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--line);">
      <img class="row-thumb" src="${p.image_url || 'https://picsum.photos/seed/'+p.id+'/100/100'}">
      <div style="flex:1;"><b style="font-size:13.5px;">${escapeHtml(p.name)}</b></div>
      <span class="num">${fmtPrice(p.price)} ر.س</span>
    </div>`).join('') : `<div class="empty-state"><div class="em-icon">📦</div><p>لم تُضِف أي منتج بعد.</p></div>`;
}

async function loadProducts(){
  const { data: products } = await window.sb.from('products').select('*').eq('store_id', CURRENT_STORE.id).order('created_at', {ascending:false});
  const body = document.getElementById('products-table-body');
  if(!products || products.length === 0){
    body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="em-icon">📦</div><p>لا توجد منتجات بعد. ابدأ بإضافة أول منتج.</p></div></td></tr>`;
    return;
  }
  const sourceLabel = { noon:'نون', amazon:'أمازون', manual:'يدوي', other:'أخرى' };
  body.innerHTML = products.map(p => `
    <tr>
      <td><img class="row-thumb" src="${p.image_url || 'https://picsum.photos/seed/'+p.id+'/100/100'}"></td>
      <td><b>${escapeHtml(p.name)}</b></td>
      <td class="num">${fmtPrice(p.price)} ر.س</td>
      <td>${sourceLabel[p.source]||p.source}</td>
      <td><span class="status-badge ${p.status==='active'?'status-approved':'status-rejected'}">${p.status==='active'?'نشط':'موقوف'}</span></td>
      <td style="white-space:nowrap; display:flex; gap:6px;">
        <button class="icon-btn" onclick="editProduct('${p.id}')">تعديل</button>
        <button class="icon-btn" onclick="askDeleteProduct('${p.id}')">حذف</button>
      </td>
    </tr>`).join('');
}

let __allProductsCache = [];
async function editProduct(id){
  const { data: p } = await window.sb.from('products').select('*').eq('id', id).single();
  if(!p) return;
  document.querySelector('.dash-nav a[data-tab="add"]').click();
  document.getElementById('p-id').value = p.id;
  document.getElementById('p-name').value = p.name || '';
  document.getElementById('p-brand').value = p.brand || '';
  document.getElementById('p-desc').value = p.description || '';
  document.getElementById('p-image').value = p.image_url || '';
  document.getElementById('p-category').value = p.category_id || '';
  document.getElementById('p-price').value = p.price || '';
  document.getElementById('p-original').value = p.original_price || '';
  document.getElementById('p-source').value = p.source || 'manual';
  document.getElementById('p-link').value = p.affiliate_link || '';
  document.getElementById('p-active').checked = p.status === 'active';
  document.getElementById('product-save-btn').textContent = 'حفظ التعديلات';
}

function resetProductForm(){
  document.getElementById('product-form').reset();
  document.getElementById('p-id').value = '';
  document.getElementById('p-active').checked = true;
  document.getElementById('product-save-btn').textContent = 'حفظ المنتج';
  document.getElementById('product-error').classList.remove('show');
  document.getElementById('aff-status').textContent = '';
  document.getElementById('aff-url').value = '';
}

let deleteTargetId = null;
function askDeleteProduct(id){
  deleteTargetId = id;
  document.getElementById('delete-modal').classList.add('show');
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cancel-delete-btn').addEventListener('click', () => { document.getElementById('delete-modal').classList.remove('show'); deleteTargetId=null; });
  document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if(!deleteTargetId) return;
    const { error } = await window.sb.from('products').delete().eq('id', deleteTargetId);
    document.getElementById('delete-modal').classList.remove('show');
    if(error){ toast('تعذّر حذف المنتج', 'error'); return; }
    toast('تم حذف المنتج بنجاح');
    loadProducts(); loadOverview();
    deleteTargetId = null;
  });
});

async function saveProduct(e){
  e.preventDefault();
  const errEl = document.getElementById('product-error');
  errEl.classList.remove('show');
  const id = document.getElementById('p-id').value;
  const payload = {
    store_id: CURRENT_STORE.id,
    name: document.getElementById('p-name').value.trim(),
    brand: document.getElementById('p-brand').value.trim() || null,
    description: document.getElementById('p-desc').value.trim() || null,
    image_url: document.getElementById('p-image').value.trim() || null,
    category_id: document.getElementById('p-category').value || null,
    price: parseFloat(document.getElementById('p-price').value),
    original_price: document.getElementById('p-original').value ? parseFloat(document.getElementById('p-original').value) : null,
    source: document.getElementById('p-source').value,
    affiliate_link: document.getElementById('p-link').value.trim() || null,
    status: document.getElementById('p-active').checked ? 'active' : 'inactive'
  };
  if(!payload.name || isNaN(payload.price)){
    errEl.textContent = 'يرجى تعبئة اسم المنتج والسعر بشكل صحيح.';
    errEl.classList.add('show');
    return;
  }
  const btn = document.getElementById('product-save-btn');
  btn.disabled = true;
  let result;
  if(id){ result = await window.sb.from('products').update(payload).eq('id', id); }
  else { result = await window.sb.from('products').insert(payload); }
  btn.disabled = false;
  if(result.error){
    errEl.textContent = 'حدث خطأ أثناء الحفظ: ' + result.error.message;
    errEl.classList.add('show');
    return;
  }
  toast(id ? 'تم تحديث المنتج' : 'تمت إضافة المنتج بنجاح');
  resetProductForm();
  document.querySelector('.dash-nav a[data-tab="products"]').click();
  loadProducts(); loadOverview();
}

async function fetchAffiliateData(){
  const url = document.getElementById('aff-url').value.trim();
  const statusEl = document.getElementById('aff-status');
  if(!url){ statusEl.textContent = 'الصق رابط المنتج أولاً.'; return; }
  const btn = document.getElementById('aff-fetch-btn');
  btn.disabled = true; btn.innerHTML = '<span class="loader dark"></span> جارٍ الجلب...';
  statusEl.textContent = '';
  try{
    const { data, error } = await window.sb.functions.invoke('fetch-product-meta', { body: { url } });
    if(error) throw error;
    if(data && data.ok){
      document.getElementById('p-name').value = data.title || '';
      document.getElementById('p-image').value = data.image || '';
      if(data.price) document.getElementById('p-price').value = data.price;
      document.getElementById('p-link').value = url;
      document.getElementById('p-source').value = url.includes('amazon') ? 'amazon' : (url.includes('noon') ? 'noon' : 'other');
      statusEl.innerHTML = '✅ تم جلب ما يتوفر من بيانات — راجعها وأكمل الناقص (خصوصًا السعر والصورة) ثم احفظ المنتج.';
    } else {
      throw new Error(data?.message || 'لم نتمكن من قراءة الصفحة');
    }
  }catch(err){
    console.error(err);
    document.getElementById('p-link').value = url;
    document.getElementById('p-source').value = url.includes('amazon') ? 'amazon' : (url.includes('noon') ? 'noon' : 'other');
    statusEl.innerHTML = '⚠️ تعذّر جلب البيانات تلقائيًا من هذا الرابط (بعض المتاجر تمنع القراءة الآلية). عبّئ الاسم والسعر والصورة يدويًا — رابط الشراء تم حفظه.';
  }
  btn.disabled = false; btn.textContent = 'جلب البيانات';
}

function loadProfile(){
  document.getElementById('pr-name').value = CURRENT_STORE.store_name || '';
  document.getElementById('pr-phone').value = CURRENT_STORE.phone || '';
  document.getElementById('pr-city').value = CURRENT_STORE.city || '';
  document.getElementById('pr-email').value = CURRENT_STORE.email || '';
  document.getElementById('pr-desc').value = CURRENT_STORE.description || '';
  document.getElementById('pr-logo').value = CURRENT_STORE.logo_url || '';
  document.getElementById('profile-logo-preview').src = CURRENT_STORE.logo_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(CURRENT_STORE.store_name);
}

async function saveProfile(e){
  e.preventDefault();
  const payload = {
    store_name: document.getElementById('pr-name').value.trim(),
    phone: document.getElementById('pr-phone').value.trim(),
    city: document.getElementById('pr-city').value.trim(),
    email: document.getElementById('pr-email').value.trim(),
    description: document.getElementById('pr-desc').value.trim(),
    logo_url: document.getElementById('pr-logo').value.trim() || null
  };
  const { error } = await window.sb.from('stores').update(payload).eq('id', CURRENT_STORE.id);
  if(error){ toast('تعذّر حفظ التغييرات', 'error'); return; }
  Object.assign(CURRENT_STORE, payload);
  document.getElementById('profile-success').classList.add('show');
  document.getElementById('profile-logo-preview').src = payload.logo_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(payload.store_name);
  setTimeout(()=>document.getElementById('profile-success').classList.remove('show'), 3000);
  toast('تم حفظ بيانات المتجر بنجاح');
}

async function loadNotifications(){
  const { data: notifs } = await window.sb.from('store_notifications').select('*').eq('store_id', CURRENT_STORE.id).order('created_at', {ascending:false});
  const el = document.getElementById('notif-list');
  if(!notifs || notifs.length === 0){
    el.innerHTML = `<div class="empty-state"><div class="em-icon">🔔</div><p>لا توجد تنبيهات حاليًا.</p></div>`;
    return;
  }
  el.innerHTML = notifs.map(n => `
    <div style="padding:14px 0; border-bottom:1px solid var(--line);">
      <b style="font-size:14.5px;">${escapeHtml(n.title)}</b>
      <p style="color:var(--ink-soft); font-size:13.5px; margin-top:6px;">${escapeHtml(n.message)}</p>
      <span style="font-size:11.5px; color:#9CA79E;">${new Date(n.created_at).toLocaleString('ar-SA')}</span>
    </div>`).join('');
}
