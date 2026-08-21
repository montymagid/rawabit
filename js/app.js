/* ==========================================================================
   روابط | Rawabit — Application logic
   ========================================================================== */

const ICONS = {
  plane:"✈️", sparkles:"✨", shirt:"👗", smartphone:"📱", dumbbell:"🏋️",
  home:"🏠", baby:"🍼", tag:"🏷️"
};

const state = {
  user:null, profile:null, categories:[],
  activeCategory:"all", searchQuery:"",
  editingPostId:null, mediaFile:null, mediaType:null,
  authTab:"login", page:"home"
};

/* ---------------- Theme & Lang ---------------- */
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('rw_theme', theme);
  document.querySelectorAll('.theme-icon-sun').forEach(e=>e.classList.toggle('hidden', theme==='dark'));
  document.querySelectorAll('.theme-icon-moon').forEach(e=>e.classList.toggle('hidden', theme!=='dark'));
}
function applyLang(lang){
  localStorage.setItem('rw_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = DICT[lang].dir;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{
    el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
  document.querySelectorAll('.lang-label').forEach(e=> e.textContent = lang==='ar' ? 'EN' : 'AR');
  renderCategoryChips();
  refreshCurrentPage();
}

/* ---------------- Toast ---------------- */
let toastTimer;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('show'), 2600);
}

function esc(s){
  if(s===null||s===undefined) return '';
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtDate(d){
  return new Date(d).toLocaleDateString(localStorage.getItem('rw_lang')==='ar' ? 'ar-EG':'en-GB', {day:'numeric',month:'short',year:'numeric'});
}
function lang(){ return localStorage.getItem('rw_lang') || 'ar'; }

/* ---------------- Router ---------------- */
const PAGES = ['home','browse','training','dashboard','admin'];
function goTo(page){
  location.hash = '#/' + page;
}
function handleRoute(){
  const hash = location.hash.replace('#/','') || 'home';
  const page = PAGES.includes(hash) ? hash : 'home';
  state.page = page;
  PAGES.forEach(p=> document.getElementById('page-'+p).classList.toggle('hidden', p!==page));
  document.querySelectorAll('.nav-links a').forEach(a=> a.classList.toggle('active', a.dataset.page===page));
  window.scrollTo({top:0,behavior:'instant'});

  if(page==='home') loadHome();
  if(page==='browse') loadBrowse();
  if(page==='training') loadTraining();
  if(page==='dashboard') loadDashboard();
  if(page==='admin') loadAdmin();
}
function refreshCurrentPage(){ handleRoute(); }
window.addEventListener('hashchange', handleRoute);

/* ---------------- Auth ---------------- */
async function refreshSession(){
  const { data:{ session } } = await supabaseClient.auth.getSession();
  state.user = session?.user || null;
  if(state.user){
    const { data } = await supabaseClient.from('profiles').select('*').eq('id', state.user.id).single();
    state.profile = data;
  } else {
    state.profile = null;
  }
  updateAuthUI();
}
supabaseClient.auth.onAuthStateChange((_evt, _session)=>{ refreshSession(); });

function updateAuthUI(){
  const loggedIn = !!state.user;
  document.getElementById('btn-login').classList.toggle('hidden', loggedIn);
  document.getElementById('btn-join').classList.toggle('hidden', loggedIn);
  document.getElementById('user-menu').classList.toggle('hidden', !loggedIn);
  document.getElementById('nav-dashboard').classList.toggle('hidden', !loggedIn);
  document.getElementById('nav-admin').classList.toggle('hidden', !(loggedIn && state.profile?.role==='admin'));
  if(loggedIn && state.profile){
    document.getElementById('user-avatar-txt').textContent = (state.profile.full_name||'؟').trim()[0];
    document.getElementById('user-name-txt').textContent = state.profile.full_name;
  }
}

function openAuthModal(tab){
  state.authTab = tab || 'login';
  renderAuthTabs();
  document.getElementById('modal-auth').classList.add('open');
}
function closeAuthModal(){ document.getElementById('modal-auth').classList.remove('open'); }
function renderAuthTabs(){
  const isLogin = state.authTab==='login';
  document.getElementById('tab-login-btn').classList.toggle('active', isLogin);
  document.getElementById('tab-signup-btn').classList.toggle('active', !isLogin);
  document.getElementById('login-form').classList.toggle('hidden', !isLogin);
  document.getElementById('signup-form').classList.toggle('hidden', isLogin);
  document.getElementById('auth-title').textContent = isLogin ? t('auth_login_title') : t('auth_signup_title');
  document.getElementById('auth-sub').textContent = isLogin ? t('auth_login_sub') : t('auth_signup_sub');
  document.getElementById('auth-msg').classList.remove('show');
}

async function handleLogin(e){
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-submit-btn');
  btn.disabled = true;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  const msg = document.getElementById('auth-msg');
  if(error){
    msg.textContent = error.message;
    msg.className = 'form-msg show error';
    return;
  }
  closeAuthModal();
  toast(t('toast_login_ok'));
  await refreshSession();
  refreshCurrentPage();
}

async function handleSignup(e){
  e.preventDefault();
  const full_name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const phone = document.getElementById('signup-phone').value.trim();
  const password = document.getElementById('signup-password').value;
  const btn = document.getElementById('signup-submit-btn');
  btn.disabled = true;
  const { data, error } = await supabaseClient.auth.signUp({
    email, password,
    options:{ data:{ full_name } }
  });
  if(!error && data.user){
    await supabaseClient.from('profiles').update({ phone }).eq('id', data.user.id);
  }
  btn.disabled = false;
  const msg = document.getElementById('auth-msg');
  if(error){
    msg.textContent = error.message;
    msg.className = 'form-msg show error';
    return;
  }
  closeAuthModal();
  toast(t('toast_signup_ok'));
  await refreshSession();
  refreshCurrentPage();
}

async function handleLogout(){
  await supabaseClient.auth.signOut();
  toast(t('toast_logout_ok'));
  goTo('home');
  await refreshSession();
  refreshCurrentPage();
}

/* ---------------- Categories ---------------- */
async function loadCategories(){
  const { data } = await supabaseClient.from('categories').select('*').order('sort_order');
  state.categories = data || [];
  renderCategoryChips();
  const sel = document.getElementById('post-category');
  if(sel){
    sel.innerHTML = state.categories.map(c=>`<option value="${c.id}">${lang()==='ar'?c.name_ar:c.name_en}</option>`).join('');
  }
}
function renderCategoryChips(){
  const wraps = document.querySelectorAll('.cat-scroll');
  wraps.forEach(wrap=>{
    const chips = [`<button class="cat-chip ${state.activeCategory==='all'?'active':''}" data-cat="all">🏷️ <span>${t('cat_all')}</span></button>`]
      .concat(state.categories.map(c=>`<button class="cat-chip ${state.activeCategory===c.id?'active':''}" data-cat="${c.id}">${ICONS[c.icon]||'🏷️'} <span>${lang()==='ar'?c.name_ar:c.name_en}</span></button>`));
    wrap.innerHTML = chips.join('');
    wrap.querySelectorAll('.cat-chip').forEach(btn=>{
      btn.onclick = ()=>{
        state.activeCategory = btn.dataset.cat;
        goTo('browse');
        loadBrowse();
      };
    });
  });
}

/* ---------------- Post card ---------------- */
function postCardHTML(p){
  const cat = state.categories.find(c=>c.id===p.category_id);
  const title = lang()==='ar' ? p.title_ar : (p.title_en||p.title_ar);
  const verified = p.profiles?.is_verified;
  return `
  <div class="post-card fade-in" data-id="${p.id}">
    <div class="post-media">
      <img loading="lazy" src="${esc(p.media_url)||'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=800'}" alt="${esc(title)}">
      ${p.is_featured ? `<span class="badge featured">⭐ ${lang()==='ar'?'مميز':'Featured'}</span>` : (cat ? `<span class="badge">${ICONS[cat.icon]||''} ${lang()==='ar'?cat.name_ar:cat.name_en}</span>`:'')}
      ${p.media_type==='video' ? `<span class="badge-video">▶</span>` : ''}
    </div>
    <div class="post-body">
      <div class="post-marketer">
        <span class="av"></span>
        <span>${esc(p.profiles?.full_name||'')}</span>
        ${verified ? `<svg class="verified-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/></svg>`:''}
      </div>
      <p class="post-title">${esc(title)}</p>
      ${p.store_name ? `<div class="post-store">🏬 ${esc(p.store_name)}</div>` : ''}
      <div class="post-footer">
        <button class="code-pill" data-code="${esc(p.coupon_code||'')}" data-postid="${p.id}" onclick="copyCode(event)">
          ${p.coupon_code ? esc(p.coupon_code) : (lang()==='ar'?'عرض عام':'General')}
          ${p.coupon_code ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' : ''}
        </button>
        ${p.discount_text ? `<span class="discount-tag">${esc(p.discount_text)}</span>` : ''}
      </div>
    </div>
  </div>`;
}
function renderGrid(container, posts){
  if(!posts.length){
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
      <p>${t('empty_posts')}</p>
    </div>`;
    return;
  }
  container.innerHTML = posts.map(postCardHTML).join('');
  container.querySelectorAll('.post-card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if(e.target.closest('.code-pill')) return;
      openPostDetail(card.dataset.id);
    });
  });
}
async function copyCode(e){
  e.stopPropagation();
  const btn = e.currentTarget;
  const code = btn.dataset.code;
  const postId = btn.dataset.postid;
  if(code){
    try{ await navigator.clipboard.writeText(code); }catch(err){}
    toast(t('copied'));
    const { data } = await supabaseClient.from('posts').select('clicks').eq('id', postId).single();
    if(data) await supabaseClient.from('posts').update({ clicks:(data.clicks||0)+1 }).eq('id', postId);
  } else {
    openPostDetail(postId);
  }
}

/* ---------------- Home ---------------- */
async function loadHome(){
  if(!state.categories.length) await loadCategories();
  const featWrap = document.getElementById('featured-grid');
  const latestWrap = document.getElementById('latest-grid');
  featWrap.innerHTML = latestWrap.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;

  const { data: featured } = await supabaseClient.from('posts').select('*, profiles(full_name,is_verified,username)')
    .eq('status','published').eq('is_featured', true).order('created_at',{ascending:false}).limit(4);
  const { data: latest } = await supabaseClient.from('posts').select('*, profiles(full_name,is_verified,username)')
    .eq('status','published').order('created_at',{ascending:false}).limit(8);

  renderGrid(featWrap, featured||[]);
  renderGrid(latestWrap, latest||[]);

  const { count: mCount } = await supabaseClient.from('profiles').select('*',{count:'exact',head:true}).eq('role','marketer');
  const { count: pCount } = await supabaseClient.from('posts').select('*',{count:'exact',head:true}).eq('status','published');
  document.getElementById('stat-marketers').textContent = (mCount||0) + '+';
  document.getElementById('stat-posts').textContent = (pCount||0) + '+';
  document.getElementById('stat-categories').textContent = state.categories.length;
}

/* ---------------- Browse ---------------- */
async function loadBrowse(){
  if(!state.categories.length) await loadCategories();
  const grid = document.getElementById('browse-grid');
  grid.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;
  document.getElementById('browse-search-input').value = state.searchQuery;

  let query = supabaseClient.from('posts').select('*, profiles(full_name,is_verified,username)').eq('status','published');
  if(state.activeCategory !== 'all') query = query.eq('category_id', state.activeCategory);
  if(state.searchQuery){
    const q = state.searchQuery.replace(/[%,]/g,'');
    query = query.or(`title_ar.ilike.%${q}%,title_en.ilike.%${q}%,coupon_code.ilike.%${q}%,product_name.ilike.%${q}%,store_name.ilike.%${q}%,description_ar.ilike.%${q}%`);
  }
  query = query.order('is_featured',{ascending:false}).order('created_at',{ascending:false});
  const { data, error } = await query;
  renderGrid(grid, data||[]);
  renderCategoryChips();
}
function doSearch(q){
  state.searchQuery = q;
  goTo('browse');
  loadBrowse();
}

/* ---------------- Post detail ---------------- */
async function openPostDetail(id){
  const { data: p } = await supabaseClient.from('posts').select('*, profiles(full_name,is_verified,username)').eq('id', id).single();
  if(!p) return;
  await supabaseClient.from('posts').update({ views:(p.views||0)+1 }).eq('id', id);
  const cat = state.categories.find(c=>c.id===p.category_id);
  const title = lang()==='ar' ? p.title_ar : (p.title_en||p.title_ar);
  const desc = lang()==='ar' ? p.description_ar : (p.description_en||p.description_ar);
  document.getElementById('post-detail-body').innerHTML = `
    <div class="pd-media">${p.media_type==='video' ? `<img src="${esc(p.media_url)}">` : `<img src="${esc(p.media_url)||''}">`}</div>
    <div class="pd-head">
      <span class="av post-marketer-av" style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--brand),var(--brand-2));display:inline-block"></span>
      <div>
        <div style="font-weight:700;font-size:14.5px">${esc(p.profiles?.full_name||'')} ${p.profiles?.is_verified?'✅':''}</div>
        ${cat ? `<div style="font-size:12.5px;color:var(--text-soft)">${ICONS[cat.icon]||''} ${lang()==='ar'?cat.name_ar:cat.name_en}</div>`:''}
      </div>
    </div>
    <h3 style="margin:14px 0 8px">${esc(title)}</h3>
    <p style="color:var(--text-soft);line-height:1.9;font-size:14.5px">${esc(desc||'')}</p>
    ${p.store_name ? `<div style="margin-top:10px;font-size:13.5px">🏬 ${lang()==='ar'?'المتجر':'Store'}: <b>${esc(p.store_name)}</b></div>`:''}
    ${p.coupon_code ? `
    <div class="pd-code-box">
      <div><div style="font-size:12px;color:var(--text-soft);margin-bottom:2px">${t('field_code')}</div><b>${esc(p.coupon_code)}</b></div>
      <button class="btn btn-accent btn-sm" onclick="copyCode(event)" data-code="${esc(p.coupon_code)}" data-postid="${p.id}">${t('copy_code')}</button>
    </div>`:''}
    ${p.discount_text ? `<div class="discount-tag" style="font-size:14px;margin-bottom:10px">🎯 ${esc(p.discount_text)}</div>`:''}
    ${p.affiliate_link ? `<a class="btn btn-primary btn-block" target="_blank" rel="noopener" href="${esc(p.affiliate_link)}" onclick="trackClick('${p.id}')">${t('go_buy')} ↗</a>`:''}
  `;
  document.getElementById('modal-post').classList.add('open');
}
async function trackClick(id){
  const { data } = await supabaseClient.from('posts').select('clicks').eq('id', id).single();
  if(data) await supabaseClient.from('posts').update({ clicks:(data.clicks||0)+1 }).eq('id', id);
}

/* ---------------- Training ---------------- */
async function loadTraining(){
  const vidWrap = document.getElementById('training-videos');
  vidWrap.innerHTML = `<div class="loader"><div class="spinner"></div></div>`;
  const { data: videos } = await supabaseClient.from('training_videos').select('*').order('sort_order');
  vidWrap.innerHTML = (videos||[]).map(v=>`
    <div class="train-card">
      <iframe src="${esc(v.video_url)}" allowfullscreen loading="lazy"></iframe>
      <div class="tb">
        <h4>${esc(lang()==='ar'?v.title_ar:(v.title_en||v.title_ar))}</h4>
        <p>${esc(lang()==='ar'?v.description_ar:(v.description_en||v.description_ar)||'')}</p>
      </div>
    </div>`).join('') || `<div class="empty-state">${t('no_data')}</div>`;

  const { data: mats } = await supabaseClient.from('training_materials').select('*').order('created_at',{ascending:false});
  const pdfWrap = document.getElementById('training-pdfs');
  pdfWrap.innerHTML = (mats||[]).map(m=>`
    <div class="pdf-box">
      <div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></div>
      <div style="flex:1">
        <b>${esc(lang()==='ar'?m.title_ar:(m.title_en||m.title_ar))}</b>
        <span>PDF</span>
      </div>
      <a class="btn btn-ghost btn-sm" href="${esc(m.file_url)}" target="_blank" rel="noopener">${t('download')}</a>
    </div>`).join('');
}

/* ---------------- Dashboard (marketer) ---------------- */
let dashTab = 'overview';
function setDashTab(tab){
  dashTab = tab;
  document.querySelectorAll('#dash-nav a').forEach(a=> a.classList.toggle('active', a.dataset.tab===tab));
  document.querySelectorAll('.dash-panel').forEach(p=> p.classList.toggle('hidden', p.id!=='dpanel-'+tab));
  if(tab==='posts') loadMyPosts();
  if(tab==='featured') loadMyFeatured();
  if(tab==='wallet') loadMyWallet();
}
async function loadDashboard(){
  if(!state.user){
    document.getElementById('dashboard-guard').classList.remove('hidden');
    document.getElementById('dashboard-content').classList.add('hidden');
    return;
  }
  document.getElementById('dashboard-guard').classList.add('hidden');
  document.getElementById('dashboard-content').classList.remove('hidden');
  document.getElementById('dash-name').textContent = state.profile?.full_name || '';
  document.getElementById('dash-plan').textContent = state.profile?.plan==='premium' ? (lang()==='ar'?'باقة مميزة':'Premium plan') : (lang()==='ar'?'باقة مجانية':'Free plan');
  document.getElementById('dash-avatar-txt').textContent = (state.profile?.full_name||'؟').trim()[0];

  const { data: posts } = await supabaseClient.from('posts').select('views,clicks').eq('marketer_id', state.user.id);
  const totalViews = (posts||[]).reduce((s,p)=>s+(p.views||0),0);
  const totalClicks = (posts||[]).reduce((s,p)=>s+(p.clicks||0),0);
  document.getElementById('stat-my-posts').textContent = (posts||[]).length;
  document.getElementById('stat-my-views').textContent = totalViews;
  document.getElementById('stat-my-clicks').textContent = totalClicks;
  document.getElementById('stat-my-wallet').textContent = (state.profile?.wallet_balance||0).toFixed(2);

  loadMyPosts();
  setDashTab(dashTab);
}
function postRowHTML(p){
  const cat = state.categories.find(c=>c.id===p.category_id);
  return `<tr>
    <td style="font-weight:600;max-width:220px">${esc(lang()==='ar'?p.title_ar:(p.title_en||p.title_ar))}</td>
    <td>${cat ? (lang()==='ar'?cat.name_ar:cat.name_en) : '-'}</td>
    <td><code>${esc(p.coupon_code||'-')}</code></td>
    <td><span class="pill ${p.status==='published'?'pub':p.status==='pending'?'pend':'rej'}">${t('status_'+p.status)}</span></td>
    <td>${p.views||0} 👁 / ${p.clicks||0} 🔗</td>
    <td class="row-actions">
      <button class="icon-mini" onclick="editPost('${p.id}')" title="${t('edit')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
      <button class="icon-mini" onclick="deletePost('${p.id}')" title="${t('delete')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg></button>
    </td>
  </tr>`;
}
async function loadMyPosts(){
  const wrap = document.getElementById('my-posts-tbody');
  const preview = document.getElementById('my-posts-tbody-preview');
  wrap.innerHTML = `<tr><td colspan="6"><div class="loader"><div class="spinner"></div></div></td></tr>`;
  const { data } = await supabaseClient.from('posts').select('*').eq('marketer_id', state.user.id).order('created_at',{ascending:false});
  const emptyRow = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-soft)">${t('no_data')}</td></tr>`;
  if(!data || !data.length){ wrap.innerHTML = emptyRow; if(preview) preview.innerHTML = emptyRow; return; }
  wrap.innerHTML = data.map(postRowHTML).join('');
  if(preview) preview.innerHTML = data.slice(0,5).map(postRowHTML).join('');
}
async function deletePost(id){
  if(!confirm(lang()==='ar'?'متأكد من الحذف؟':'Are you sure?')) return;
  const { error } = await supabaseClient.from('posts').delete().eq('id', id);
  if(error){ toast(t('toast_error')); return; }
  toast(t('toast_deleted'));
  loadMyPosts(); loadDashboard();
}
async function editPost(id){
  const { data } = await supabaseClient.from('posts').select('*').eq('id', id).single();
  openPostForm(data);
}

/* Post form (create/edit) */
function openPostForm(post){
  state.editingPostId = post?.id || null;
  state.mediaFile = null;
  document.getElementById('post-form').reset();
  document.getElementById('upload-preview').innerHTML = '';
  if(post){
    document.getElementById('post-title-ar').value = post.title_ar||'';
    document.getElementById('post-title-en').value = post.title_en||'';
    document.getElementById('post-desc-ar').value = post.description_ar||'';
    document.getElementById('post-desc-en').value = post.description_en||'';
    document.getElementById('post-category').value = post.category_id||'';
    document.getElementById('post-product').value = post.product_name||'';
    document.getElementById('post-store').value = post.store_name||'';
    document.getElementById('post-code').value = post.coupon_code||'';
    document.getElementById('post-discount').value = post.discount_text||'';
    document.getElementById('post-link').value = post.affiliate_link||'';
    document.getElementById('post-general').checked = !!post.is_general;
    if(post.media_url){
      document.getElementById('upload-preview').innerHTML = post.media_type==='video'
        ? `<video src="${esc(post.media_url)}" controls></video>` : `<img src="${esc(post.media_url)}">`;
      state.mediaFile = { existingUrl: post.media_url, existingType: post.media_type };
    }
  }
  document.getElementById('modal-post-form').classList.add('open');
}
function closePostForm(){ document.getElementById('modal-post-form').classList.remove('open'); }

function handleMediaSelect(e){
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 20*1024*1024){ toast(lang()==='ar'?'الحجم أكبر من 20 ميجا':'File exceeds 20MB'); return; }
  state.mediaFile = file;
  const type = file.type.startsWith('video') ? 'video' : 'image';
  state.mediaType = type;
  const url = URL.createObjectURL(file);
  document.getElementById('upload-preview').innerHTML = type==='video' ? `<video src="${url}" controls></video>` : `<img src="${url}">`;
}

async function handlePostSubmit(e){
  e.preventDefault();
  const btn = document.getElementById('post-submit-btn');
  btn.disabled = true;
  try{
    let media_url = state.mediaFile?.existingUrl || null;
    let media_type = state.mediaFile?.existingType || null;
    if(state.mediaFile instanceof File){
      const ext = state.mediaFile.name.split('.').pop();
      const path = `${state.user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabaseClient.storage.from('post-media').upload(path, state.mediaFile);
      if(upErr) throw upErr;
      const { data: pub } = supabaseClient.storage.from('post-media').getPublicUrl(path);
      media_url = pub.publicUrl;
      media_type = state.mediaType;
    }
    const payload = {
      marketer_id: state.user.id,
      category_id: document.getElementById('post-category').value || null,
      title_ar: document.getElementById('post-title-ar').value.trim(),
      title_en: document.getElementById('post-title-en').value.trim(),
      description_ar: document.getElementById('post-desc-ar').value.trim(),
      description_en: document.getElementById('post-desc-en').value.trim(),
      product_name: document.getElementById('post-product').value.trim(),
      store_name: document.getElementById('post-store').value.trim(),
      coupon_code: document.getElementById('post-code').value.trim(),
      discount_text: document.getElementById('post-discount').value.trim(),
      affiliate_link: document.getElementById('post-link').value.trim(),
      is_general: document.getElementById('post-general').checked,
      media_url, media_type,
      status: 'published'
    };
    let error;
    if(state.editingPostId){
      ({ error } = await supabaseClient.from('posts').update(payload).eq('id', state.editingPostId));
    } else {
      ({ error } = await supabaseClient.from('posts').insert(payload));
    }
    if(error) throw error;
    toast(t('toast_saved'));
    closePostForm();
    loadMyPosts(); loadDashboard();
  }catch(err){
    console.error(err);
    toast(t('toast_error'));
  }finally{
    btn.disabled = false;
  }
}

/* Featured requests (marketer) */
async function requestFeatured(type, amount){
  if(!state.user) return;
  const { error } = await supabaseClient.from('featured_requests').insert({ marketer_id: state.user.id, type, amount });
  if(error){ toast(t('toast_error')); return; }
  toast(t('toast_request_sent'));
  loadMyFeatured();
}
async function loadMyFeatured(){
  const wrap = document.getElementById('my-featured-tbody');
  const { data } = await supabaseClient.from('featured_requests').select('*').eq('marketer_id', state.user.id).order('created_at',{ascending:false});
  if(!data || !data.length){ wrap.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-soft)">${t('no_data')}</td></tr>`; return; }
  wrap.innerHTML = data.map(r=>`<tr>
    <td>${t('ft_'+(r.type==='top_search'?'top_search':r.type==='homepage'?'home':r.type==='repeated_display'?'repeat':'badge'))}</td>
    <td>$${r.amount}</td>
    <td><span class="pill ${r.status==='approved'?'pub':r.status==='pending'?'pend':'rej'}">${r.status}</span></td>
    <td>${fmtDate(r.created_at)}</td>
  </tr>`).join('');
}
async function loadMyWallet(){
  document.getElementById('wallet-balance-big').textContent = '$' + (state.profile?.wallet_balance||0).toFixed(2);
  const { data: settings } = await supabaseClient.from('platform_settings').select('value').eq('key','commission_share_percent').single();
  document.getElementById('wallet-share-pct').textContent = (settings?.value || 15) + '%';
  const wrap = document.getElementById('tx-tbody');
  const { data } = await supabaseClient.from('transactions').select('*').eq('marketer_id', state.user.id).order('created_at',{ascending:false});
  if(!data || !data.length){ wrap.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:24px;color:var(--text-soft)">${t('no_data')}</td></tr>`; return; }
  wrap.innerHTML = data.map(tx=>`<tr><td>${tx.type}</td><td>$${tx.amount}</td><td>${fmtDate(tx.created_at)}</td></tr>`).join('');
}

/* ---------------- Admin ---------------- */
let adminTab = 'overview';
function setAdminTab(tab){
  adminTab = tab;
  document.querySelectorAll('#admin-nav a').forEach(a=> a.classList.toggle('active', a.dataset.tab===tab));
  document.querySelectorAll('.admin-panel').forEach(p=> p.classList.toggle('hidden', p.id!=='apanel-'+tab));
  if(tab==='posts') loadAdminPosts();
  if(tab==='users') loadAdminUsers();
  if(tab==='categories') loadAdminCategories();
  if(tab==='featured') loadAdminFeatured();
  if(tab==='training') loadAdminTraining();
  if(tab==='settings') loadAdminSettings();
}
async function loadAdmin(){
  const isAdmin = state.user && state.profile?.role==='admin';
  document.getElementById('admin-guard').classList.toggle('hidden', isAdmin);
  document.getElementById('admin-content').classList.toggle('hidden', !isAdmin);
  if(!isAdmin) return;
  const { count: mCount } = await supabaseClient.from('profiles').select('*',{count:'exact',head:true}).eq('role','marketer');
  const { count: pendingPosts } = await supabaseClient.from('posts').select('*',{count:'exact',head:true}).eq('status','pending');
  const { count: pendingFeatured } = await supabaseClient.from('featured_requests').select('*',{count:'exact',head:true}).eq('status','pending');
  const { data: approvedFeatured } = await supabaseClient.from('featured_requests').select('amount').eq('status','approved');
  document.getElementById('astat-marketers').textContent = mCount||0;
  document.getElementById('astat-pending-posts').textContent = pendingPosts||0;
  document.getElementById('astat-pending-featured').textContent = pendingFeatured||0;
  document.getElementById('astat-revenue').textContent = '$'+(approvedFeatured||[]).reduce((s,r)=>s+Number(r.amount),0).toFixed(2);
  setAdminTab(adminTab);
}
async function loadAdminPosts(){
  const wrap = document.getElementById('admin-posts-tbody');
  const { data } = await supabaseClient.from('posts').select('*, profiles(full_name)').order('created_at',{ascending:false});
  if(!data || !data.length){ wrap.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-soft)">${t('no_data')}</td></tr>`; return; }
  wrap.innerHTML = data.map(p=>`<tr>
    <td style="max-width:200px">${esc(p.title_ar)}</td>
    <td>${esc(p.profiles?.full_name||'')}</td>
    <td><code>${esc(p.coupon_code||'-')}</code></td>
    <td><span class="pill ${p.status==='published'?'pub':p.status==='pending'?'pend':'rej'}">${t('status_'+p.status)}</span></td>
    <td>${p.views||0}👁/${p.clicks||0}🔗</td>
    <td class="row-actions">
      ${p.status!=='published' ? `<button class="icon-mini" onclick="adminSetPostStatus('${p.id}','published')" title="${t('approve')}">✅</button>`:''}
      ${p.status!=='rejected' ? `<button class="icon-mini" onclick="adminSetPostStatus('${p.id}','rejected')" title="${t('reject')}">🚫</button>`:''}
      <button class="icon-mini" onclick="deletePost('${p.id}').then(loadAdminPosts)" title="${t('delete')}">🗑</button>
    </td>
  </tr>`).join('');
}
async function adminSetPostStatus(id, status){
  await supabaseClient.from('posts').update({ status }).eq('id', id);
  toast(t('toast_saved'));
  loadAdminPosts();
}
async function loadAdminUsers(){
  const wrap = document.getElementById('admin-users-tbody');
  const { data } = await supabaseClient.from('profiles').select('*').order('created_at',{ascending:false});
  wrap.innerHTML = (data||[]).map(u=>`<tr>
    <td>${esc(u.full_name)}</td>
    <td>${esc(u.email||'')}</td>
    <td>${t('role_'+u.role)}</td>
    <td>${u.plan}</td>
    <td>${u.is_verified?'✅':'—'}</td>
    <td class="row-actions">
      <button class="icon-mini" onclick="adminToggleVerify('${u.id}',${!u.is_verified})" title="${t('verify')}">🏅</button>
      <button class="icon-mini" onclick="adminToggleBan('${u.id}','${u.status==='banned'?'active':'banned'}')" title="${t('ban')}">${u.status==='banned'?'🔓':'⛔'}</button>
    </td>
  </tr>`).join('');
}
async function adminToggleVerify(id, val){
  await supabaseClient.from('profiles').update({ is_verified: val }).eq('id', id);
  toast(t('toast_saved')); loadAdminUsers();
}
async function adminToggleBan(id, status){
  await supabaseClient.from('profiles').update({ status }).eq('id', id);
  toast(t('toast_saved')); loadAdminUsers();
}
async function loadAdminCategories(){
  const wrap = document.getElementById('admin-cats-list');
  wrap.innerHTML = state.categories.map(c=>`<tr>
    <td>${ICONS[c.icon]||''} ${esc(c.name_ar)}</td><td>${esc(c.name_en)}</td><td>${esc(c.slug)}</td>
    <td class="row-actions"><button class="icon-mini" onclick="deleteCategory('${c.id}')" title="${t('delete')}">🗑</button></td>
  </tr>`).join('');
}
async function deleteCategory(id){
  if(!confirm(lang()==='ar'?'حذف التصنيف؟':'Delete category?')) return;
  await supabaseClient.from('categories').delete().eq('id', id);
  await loadCategories(); loadAdminCategories();
}
async function addCategory(e){
  e.preventDefault();
  const name_ar = document.getElementById('cat-name-ar').value.trim();
  const name_en = document.getElementById('cat-name-en').value.trim();
  const slug = document.getElementById('cat-slug').value.trim();
  if(!name_ar || !slug) return;
  const { error } = await supabaseClient.from('categories').insert({ name_ar, name_en, slug, icon:'tag', sort_order: state.categories.length+1 });
  if(error){ toast(t('toast_error')); return; }
  document.getElementById('cat-form').reset();
  toast(t('toast_saved'));
  await loadCategories(); loadAdminCategories();
}
async function loadAdminFeatured(){
  const wrap = document.getElementById('admin-featured-tbody');
  const { data } = await supabaseClient.from('featured_requests').select('*, profiles(full_name)').order('created_at',{ascending:false});
  if(!data || !data.length){ wrap.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-soft)">${t('no_data')}</td></tr>`; return; }
  wrap.innerHTML = data.map(r=>`<tr>
    <td>${esc(r.profiles?.full_name||'')}</td>
    <td>${r.type}</td>
    <td>$${r.amount}</td>
    <td><span class="pill ${r.status==='approved'?'pub':r.status==='pending'?'pend':'rej'}">${r.status}</span></td>
    <td class="row-actions">
      ${r.status!=='approved' ? `<button class="icon-mini" onclick="adminSetFeaturedStatus('${r.id}','approved')">✅</button>`:''}
      ${r.status!=='rejected' ? `<button class="icon-mini" onclick="adminSetFeaturedStatus('${r.id}','rejected')">🚫</button>`:''}
    </td>
  </tr>`).join('');
}
async function adminSetFeaturedStatus(id, status){
  const { data: req } = await supabaseClient.from('featured_requests').select('*').eq('id', id).single();
  await supabaseClient.from('featured_requests').update({ status }).eq('id', id);
  if(status==='approved' && req){
    if(req.post_id) await supabaseClient.from('posts').update({ is_featured:true }).eq('id', req.post_id);
    await supabaseClient.from('transactions').insert({ marketer_id: req.marketer_id, type:'featured_ad', amount:req.amount, note:req.type });
  }
  toast(t('toast_saved'));
  loadAdminFeatured();
}
async function loadAdminTraining(){
  const { data: vids } = await supabaseClient.from('training_videos').select('*').order('sort_order');
  document.getElementById('admin-training-list').innerHTML = (vids||[]).map(v=>`<tr>
    <td>${esc(v.title_ar)}</td><td class="row-actions"><button class="icon-mini" onclick="deleteTrainingVideo('${v.id}')">🗑</button></td>
  </tr>`).join('');
  const { data: mats } = await supabaseClient.from('training_materials').select('*');
  document.getElementById('admin-pdf-list').innerHTML = (mats||[]).map(m=>`<tr>
    <td>${esc(m.title_ar)}</td><td class="row-actions"><button class="icon-mini" onclick="deleteTrainingPdf('${m.id}')">🗑</button></td>
  </tr>`).join('');
}
async function deleteTrainingVideo(id){ await supabaseClient.from('training_videos').delete().eq('id', id); loadAdminTraining(); }
async function deleteTrainingPdf(id){ await supabaseClient.from('training_materials').delete().eq('id', id); loadAdminTraining(); }
async function addTrainingVideo(e){
  e.preventDefault();
  const title_ar = document.getElementById('tv-title-ar').value.trim();
  const video_url = document.getElementById('tv-url').value.trim();
  if(!title_ar || !video_url) return;
  await supabaseClient.from('training_videos').insert({ title_ar, video_url, sort_order:99 });
  document.getElementById('tv-form').reset();
  toast(t('toast_saved'));
  loadAdminTraining();
}
async function addTrainingPdf(e){
  e.preventDefault();
  const title_ar = document.getElementById('tp-title-ar').value.trim();
  const file_url = document.getElementById('tp-url').value.trim();
  if(!title_ar || !file_url) return;
  await supabaseClient.from('training_materials').insert({ title_ar, file_url });
  document.getElementById('tp-form').reset();
  toast(t('toast_saved'));
  loadAdminTraining();
}
async function loadAdminSettings(){
  const { data } = await supabaseClient.from('platform_settings').select('value').eq('key','commission_share_percent').single();
  document.getElementById('settings-commission').value = data?.value || 15;
}
async function saveSettings(e){
  e.preventDefault();
  const val = Number(document.getElementById('settings-commission').value);
  await supabaseClient.from('platform_settings').update({ value: val }).eq('key','commission_share_percent');
  toast(t('toast_saved'));
}

/* ---------------- Init ---------------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  applyTheme(localStorage.getItem('rw_theme') || 'light');
  applyLang(localStorage.getItem('rw_lang') || 'ar');

  document.getElementById('theme-toggle').onclick = ()=>{
    applyTheme(document.documentElement.getAttribute('data-theme')==='dark' ? 'light' : 'dark');
  };
  document.getElementById('lang-toggle').onclick = ()=>{
    applyLang(lang()==='ar' ? 'en' : 'ar');
  };
  document.getElementById('btn-login').onclick = ()=> openAuthModal('login');
  document.getElementById('btn-join').onclick = ()=> openAuthModal('signup');
  document.getElementById('btn-logout').onclick = handleLogout;
  document.getElementById('tab-login-btn').onclick = ()=>{ state.authTab='login'; renderAuthTabs(); };
  document.getElementById('tab-signup-btn').onclick = ()=>{ state.authTab='signup'; renderAuthTabs(); };
  document.getElementById('login-form').onsubmit = handleLogin;
  document.getElementById('signup-form').onsubmit = handleSignup;
  document.getElementById('post-form').onsubmit = handlePostSubmit;
  document.getElementById('cat-form').onsubmit = addCategory;
  document.getElementById('tv-form').onsubmit = addTrainingVideo;
  document.getElementById('tp-form').onsubmit = addTrainingPdf;
  document.getElementById('settings-form').onsubmit = saveSettings;
  document.getElementById('media-input').onchange = handleMediaSelect;

  document.querySelectorAll('.js-search-input').forEach(inp=>{
    let tm;
    inp.addEventListener('input', ()=>{
      clearTimeout(tm);
      tm = setTimeout(()=> doSearch(inp.value.trim()), 350);
    });
    inp.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); doSearch(inp.value.trim()); }});
  });

  document.querySelectorAll('[data-close-modal]').forEach(b=> b.onclick = (e)=> e.currentTarget.closest('.modal-backdrop').classList.remove('open'));
  document.querySelectorAll('.modal-backdrop').forEach(m=> m.addEventListener('click', e=>{ if(e.target===m) m.classList.remove('open'); }));

  document.getElementById('btn-new-post').onclick = ()=> openPostForm(null);
  document.getElementById('mobile-menu-btn').onclick = ()=> document.getElementById('mobile-drawer').classList.toggle('open');

  document.querySelectorAll('.nav-links a, .drawer-link').forEach(a=>{
    a.addEventListener('click', ()=>{
      document.getElementById('mobile-drawer')?.classList.remove('open');
    });
  });

  document.querySelectorAll('[data-dash-tab]').forEach(a=> a.onclick=(e)=>{ e.preventDefault(); setDashTab(a.dataset.dashTab); });
  document.querySelectorAll('[data-admin-tab]').forEach(a=> a.onclick=(e)=>{ e.preventDefault(); setAdminTab(a.dataset.adminTab); });

  await loadCategories();
  await refreshSession();
  handleRoute();
});
