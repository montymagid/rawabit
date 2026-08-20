document.addEventListener('DOMContentLoaded', async () => {
  const info = await getSessionUser();
  if(!info || !info.profile || info.profile.role !== 'admin'){
    document.getElementById('guard-screen').style.display = 'flex';
    return;
  }
  document.getElementById('dash-app').style.display = 'grid';

  setupTabs();
  loadOverview();
  loadRequests();
  loadStores();
  loadProducts();
  loadCategories();
  loadSettings();
  loadDemoStores();

  document.getElementById('logout-link').addEventListener('click', async (e)=>{ e.preventDefault(); await window.sb.auth.signOut(); location.href='/index.html'; });
  document.getElementById('cat-form').addEventListener('submit', addCategory);
  document.getElementById('settings-form').addEventListener('submit', saveSettings);
  document.getElementById('action-cancel-btn').addEventListener('click', closeActionModal);
});

function setupTabs(){
  const titles = { overview:'نظرة عامة', requests:'طلبات التسجيل', stores:'كل المتاجر', products:'كل المنتجات', categories:'التصنيفات', settings:'إعدادات المنصة' };
  document.querySelectorAll('[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll('.dash-nav a[data-tab]').forEach(a=>a.classList.remove('active'));
      document.querySelectorAll(`.dash-nav a[data-tab="${tab}"]`).forEach(a=>a.classList.add('active'));
      document.querySelectorAll('[data-panel]').forEach(p => p.style.display = (p.dataset.panel === tab) ? 'block' : 'none');
      document.getElementById('page-title').textContent = titles[tab] || '';
    });
  });
}

async function loadOverview(){
  const { data: stores } = await window.sb.from('stores').select('id, status');
  const { count: productCount } = await window.sb.from('products').select('id', {count:'exact', head:true});
  const s = stores || [];
  document.getElementById('s-stores').textContent = s.filter(x=>x.status==='approved').length;
  document.getElementById('s-pending').textContent = s.filter(x=>x.status==='pending').length;
  document.getElementById('s-suspended').textContent = s.filter(x=>x.status==='suspended').length;
  document.getElementById('s-products').textContent = productCount || 0;
  document.getElementById('req-badge').textContent = s.filter(x=>x.status==='pending').length || '';

  const { data: pending } = await window.sb.from('stores').select('*').eq('status','pending').order('created_at',{ascending:false}).limit(5);
  const el = document.getElementById('overview-requests');
  el.innerHTML = (pending && pending.length) ? pending.map(requestRowHtml).join('') : `<div class="empty-state"><div class="em-icon">✅</div><p>لا توجد طلبات جديدة بانتظار المراجعة.</p></div>`;
}

function requestRowHtml(store){
  return `
  <div style="display:flex; align-items:center; gap:14px; padding:14px 0; border-bottom:1px solid var(--line); flex-wrap:wrap;">
    <img class="row-thumb" src="${store.logo_url || 'https://api.dicebear.com/7.x/initials/svg?seed='+encodeURIComponent(store.store_name)}">
    <div style="flex:1; min-width:180px;">
      <b>${escapeHtml(store.store_name)}</b>
      <div style="font-size:12.5px; color:var(--ink-soft);">${escapeHtml(store.email)} · ${escapeHtml(store.city||'-')}</div>
    </div>
    <span style="font-size:11.5px; color:#9CA79E;">${new Date(store.created_at).toLocaleDateString('ar-SA')}</span>
    <div style="display:flex; gap:8px;">
      <button class="btn btn-primary btn-sm" onclick="openAction('approve','${store.id}','${escapeHtml(store.store_name)}','${escapeHtml(store.email)}')">قبول</button>
      <button class="btn btn-danger btn-sm" onclick="openAction('reject','${store.id}','${escapeHtml(store.store_name)}','${escapeHtml(store.email)}')">رفض</button>
    </div>
  </div>`;
}

async function loadRequests(){
  const { data: pending } = await window.sb.from('stores').select('*').eq('status','pending').order('created_at',{ascending:false});
  const el = document.getElementById('requests-list');
  el.innerHTML = (pending && pending.length) ? pending.map(requestFullRowHtml).join('') : `<div class="empty-state"><div class="em-icon">✅</div><p>لا توجد طلبات بانتظار المراجعة حاليًا.</p></div>`;
}

function requestFullRowHtml(store){
  return `
  <div style="padding:18px 0; border-bottom:1px solid var(--line);">
    <div style="display:flex; align-items:flex-start; gap:14px; flex-wrap:wrap;">
      <img class="row-thumb" style="width:52px;height:52px;" src="${store.logo_url || 'https://api.dicebear.com/7.x/initials/svg?seed='+encodeURIComponent(store.store_name)}">
      <div style="flex:1; min-width:220px;">
        <b style="font-size:15px;">${escapeHtml(store.store_name)}</b>
        <div style="font-size:13px; color:var(--ink-soft); margin-top:4px;">${escapeHtml(store.email)} · ${escapeHtml(store.phone||'-')} · ${escapeHtml(store.city||'-')}</div>
        ${store.cr_number ? `<div style="font-size:12.5px; color:var(--ink-soft);">سجل تجاري: ${escapeHtml(store.cr_number)}</div>` : ''}
        ${store.description ? `<p style="font-size:13px; color:var(--ink-soft); margin-top:8px;">${escapeHtml(store.description)}</p>` : ''}
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary btn-sm" onclick="openAction('approve','${store.id}','${escapeHtml(store.store_name)}','${escapeHtml(store.email)}')">قبول الطلب</button>
        <button class="btn btn-danger btn-sm" onclick="openAction('reject','${store.id}','${escapeHtml(store.store_name)}','${escapeHtml(store.email)}')">رفض</button>
      </div>
    </div>
  </div>`;
}

async function loadStores(){
  const { data: stores } = await window.sb.from('stores').select('*, products(count)').order('created_at',{ascending:false});
  const body = document.getElementById('stores-table-body');
  if(!stores || stores.length===0){ body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">لا توجد متاجر بعد.</td></tr>`; return; }
  const statusMap = { pending:['status-pending','قيد المراجعة'], approved:['status-approved','نشط'], rejected:['status-rejected','مرفوض'], suspended:['status-suspended','موقوف'] };
  body.innerHTML = stores.map(s => {
    const [cls,label] = statusMap[s.status] || ['status-pending', s.status];
    const count = s.products?.[0]?.count ?? 0;
    let actions = '';
    if(s.status === 'approved') actions = `<button class="icon-btn" onclick="openAction('suspend','${s.id}','${escapeHtml(s.store_name)}','${escapeHtml(s.email)}')">إيقاف</button>`;
    if(s.status === 'suspended') actions = `<button class="icon-btn" onclick="openAction('reactivate','${s.id}','${escapeHtml(s.store_name)}','${escapeHtml(s.email)}')">إعادة تفعيل</button>`;
    if(s.status === 'pending') actions = `<button class="icon-btn" onclick="openAction('approve','${s.id}','${escapeHtml(s.store_name)}','${escapeHtml(s.email)}')">قبول</button>`;
    return `<tr>
      <td><img class="row-thumb" src="${s.logo_url || 'https://api.dicebear.com/7.x/initials/svg?seed='+encodeURIComponent(s.store_name)}"></td>
      <td><b>${escapeHtml(s.store_name)}</b><div style="font-size:12px;color:var(--ink-soft);">${escapeHtml(s.email)}</div></td>
      <td>${escapeHtml(s.city||'-')}</td>
      <td>${count}</td>
      <td><span class="status-badge ${cls}">${label}</span></td>
      <td style="white-space:nowrap; display:flex; gap:6px;">${actions}<button class="icon-btn" onclick="deleteStore('${s.id}','${escapeHtml(s.store_name)}')">حذف</button></td>
    </tr>`;
  }).join('');
}

async function loadProducts(){
  const { data: products } = await window.sb.from('products').select('*, stores(store_name)').order('created_at',{ascending:false}).limit(200);
  const body = document.getElementById('admin-products-body');
  if(!products || products.length===0){ body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">لا توجد منتجات بعد.</td></tr>`; return; }
  body.innerHTML = products.map(p => `
    <tr>
      <td><img class="row-thumb" src="${p.image_url || 'https://picsum.photos/seed/'+p.id+'/100/100'}"></td>
      <td><b>${escapeHtml(p.name)}</b></td>
      <td>${escapeHtml(p.stores?.store_name || '-')}</td>
      <td class="num">${fmtPrice(p.price)} ر.س</td>
      <td><span class="status-badge ${p.status==='active'?'status-approved':'status-rejected'}">${p.status==='active'?'نشط':'موقوف'}</span></td>
      <td><button class="icon-btn" onclick="deleteProductAdmin('${p.id}')">حذف</button></td>
    </tr>`).join('');
}

async function deleteProductAdmin(id){
  if(!confirm('حذف هذا المنتج نهائيًا؟')) return;
  await window.sb.from('products').delete().eq('id', id);
  toast('تم حذف المنتج');
  loadProducts(); loadOverview();
}

async function loadCategories(){
  const { data: cats } = await window.sb.from('categories').select('*').order('sort_order');
  const el = document.getElementById('categories-list');
  el.innerHTML = (cats||[]).map(c => `
    <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--line);">
      <span style="font-size:20px;">${c.icon||'🏷️'}</span>
      <b style="flex:1;">${escapeHtml(c.name)}</b>
      <button class="icon-btn" onclick="deleteCategory('${c.id}')">حذف</button>
    </div>`).join('') || '<p style="color:var(--ink-soft);">لا توجد تصنيفات بعد.</p>';
}

async function addCategory(e){
  e.preventDefault();
  const name = document.getElementById('cat-name').value.trim();
  const icon = document.getElementById('cat-icon').value.trim();
  if(!name) return;
  const slug = name.replace(/\s+/g,'-').toLowerCase() + '-' + Date.now();
  const { error } = await window.sb.from('categories').insert({ name, icon, slug });
  if(error){ toast('تعذّر إضافة التصنيف', 'error'); return; }
  document.getElementById('cat-form').reset();
  toast('تمت إضافة التصنيف');
  loadCategories();
}
async function deleteCategory(id){
  if(!confirm('حذف هذا التصنيف؟')) return;
  await window.sb.from('categories').delete().eq('id', id);
  loadCategories();
}

async function loadSettings(){
  const { data: settings } = await window.sb.from('platform_settings').select('*').eq('id',1).single();
  if(!settings) return;
  document.getElementById('st-logo').value = settings.logo_url || '';
  document.getElementById('st-name').value = settings.site_name || 'روابط';
  document.getElementById('st-color').value = settings.primary_color || '#0E7C61';
  document.getElementById('st-email').value = settings.contact_email || '';
  document.getElementById('st-phone').value = settings.contact_phone || '';
  document.getElementById('st-note').value = settings.commission_note || '';
  document.getElementById('st-maint').checked = !!settings.maintenance_mode;
  document.getElementById('settings-logo-preview').src = settings.logo_url || '';
}

async function saveSettings(e){
  e.preventDefault();
  const payload = {
    logo_url: document.getElementById('st-logo').value.trim() || null,
    site_name: document.getElementById('st-name').value.trim() || 'روابط',
    primary_color: document.getElementById('st-color').value,
    contact_email: document.getElementById('st-email').value.trim(),
    contact_phone: document.getElementById('st-phone').value.trim(),
    commission_note: document.getElementById('st-note').value.trim(),
    maintenance_mode: document.getElementById('st-maint').checked
  };
  const { error } = await window.sb.from('platform_settings').update(payload).eq('id',1);
  if(error){ toast('تعذّر حفظ الإعدادات', 'error'); return; }
  document.getElementById('settings-success').classList.add('show');
  setTimeout(()=>document.getElementById('settings-success').classList.remove('show'), 3000);
  document.getElementById('settings-logo-preview').src = payload.logo_url || '';
  toast('تم حفظ إعدادات المنصة بنجاح');
}

async function loadDemoStores(){
  const { data: demos } = await window.sb.from('stores').select('*').eq('is_demo', true);
  const el = document.getElementById('demo-stores-list');
  if(!demos || demos.length===0){ el.innerHTML = '<p style="color:var(--ink-soft);">لا توجد متاجر تجريبية.</p>'; return; }
  el.innerHTML = demos.map(s => `
    <div style="display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--line);">
      <img class="row-thumb" src="${s.logo_url}">
      <b style="flex:1;">${escapeHtml(s.store_name)}</b>
      <span class="status-badge status-approved">تجريبي</span>
      <button class="btn btn-danger btn-sm" onclick="deleteStore('${s.id}','${escapeHtml(s.store_name)}')">حذف المتجر ومنتجاته</button>
    </div>`).join('');
}

async function deleteStore(id, name){
  if(!confirm(`حذف متجر "${name}" وكل منتجاته نهائيًا؟`)) return;
  const { error } = await window.sb.from('stores').delete().eq('id', id);
  if(error){ toast('تعذّر حذف المتجر', 'error'); return; }
  toast('تم حذف المتجر بنجاح');
  loadStores(); loadDemoStores(); loadOverview(); loadProducts();
}

/* ---------------- Action modal (approve / reject / suspend / reactivate) ---------------- */
let actionCtx = null;
function openAction(type, storeId, storeName, storeEmail){
  actionCtx = { type, storeId, storeName, storeEmail };
  const cfg = {
    approve:   { title:'قبول طلب المتجر', desc:`سيتم تفعيل متجر "${storeName}" وسيصله بريد إلكتروني بتأكيد الموافقة.`, reason:false },
    reject:    { title:'رفض طلب المتجر', desc:`سيتم رفض طلب "${storeName}". يمكنك إضافة سبب الرفض ليظهر له.`, reason:true },
    suspend:   { title:'إيقاف المتجر', desc:`سيتم إيقاف متجر "${storeName}" ومنع ظهور منتجاته للعملاء فورًا.`, reason:true },
    reactivate:{ title:'إعادة تفعيل المتجر', desc:`سيتم إعادة تفعيل متجر "${storeName}" وستظهر منتجاته للعملاء مجددًا.`, reason:false },
  }[type];
  document.getElementById('action-modal-title').textContent = cfg.title;
  document.getElementById('action-modal-desc').textContent = cfg.desc;
  document.getElementById('reason-row').style.display = cfg.reason ? 'block' : 'none';
  document.getElementById('action-reason').value = '';
  document.getElementById('action-modal').classList.add('show');
  document.getElementById('action-confirm-btn').onclick = confirmAction;
}
function closeActionModal(){ document.getElementById('action-modal').classList.remove('show'); actionCtx = null; }

async function confirmAction(){
  if(!actionCtx) return;
  const { type, storeId, storeName, storeEmail } = actionCtx;
  const reason = document.getElementById('action-reason').value.trim();
  let update = {};
  let notifTitle = '', notifMsg = '';

  if(type === 'approve'){
    update = { status:'approved', reviewed_at: new Date().toISOString(), rejection_reason: null };
    notifTitle = 'تم قبول متجرك 🎉';
    notifMsg = 'مرحبًا بك في روابط! تم تفعيل متجرك ويمكنك الآن تسجيل الدخول ونشر منتجاتك.';
  } else if(type === 'reject'){
    update = { status:'rejected', reviewed_at: new Date().toISOString(), rejection_reason: reason || null };
    notifTitle = 'تم رفض طلب تسجيل متجرك';
    notifMsg = reason || 'لأي استفسار تواصل مع فريق الدعم.';
  } else if(type === 'suspend'){
    update = { status:'suspended', suspension_reason: reason || null };
    notifTitle = 'تم إيقاف متجرك مؤقتًا';
    notifMsg = reason || 'تواصل مع فريق الدعم لمعرفة التفاصيل.';
  } else if(type === 'reactivate'){
    update = { status:'approved', suspension_reason: null };
    notifTitle = 'تم إعادة تفعيل متجرك';
    notifMsg = 'يمكنك الآن الدخول ومتابعة عرض منتجاتك على روابط.';
  }

  const { error } = await window.sb.from('stores').update(update).eq('id', storeId);
  if(error){ toast('حدث خطأ أثناء تنفيذ الإجراء', 'error'); closeActionModal(); return; }

  await window.sb.from('store_notifications').insert({ store_id: storeId, title: notifTitle, message: notifMsg });

  try{
    await window.sb.functions.invoke('notify-store-event', { body: { type, store_id: storeId, store_name: storeName, store_email: storeEmail, reason } });
  }catch(e){ console.warn('email notify skipped', e); }

  closeActionModal();
  toast('تم تنفيذ الإجراء بنجاح');
  loadOverview(); loadRequests(); loadStores();
}
