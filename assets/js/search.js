document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const q = (params.get('q') || '').trim();
  const categoryId = params.get('category') || '';

  document.getElementById('search-title').textContent = q ? `نتائج البحث عن: "${q}"` : 'كل المنتجات';

  // category chips
  const { data: cats } = await window.sb.from('categories').select('*').order('sort_order');
  const filtersEl = document.getElementById('category-filters');
  if(cats){
    filtersEl.innerHTML = [
      `<a class="chip ${!categoryId?'chip-active':''}" style="${!categoryId?'background:var(--emerald-700);color:#fff;border-color:var(--emerald-700);':''}" href="/search.html?q=${encodeURIComponent(q)}">الكل</a>`,
      ...cats.map(c => `<a class="chip" style="${categoryId===c.id?'background:var(--emerald-700);color:#fff;border-color:var(--emerald-700);':''}" href="/search.html?q=${encodeURIComponent(q)}&category=${c.id}">${c.icon||''} ${escapeHtml(c.name)}</a>`)
    ].join('');
  }

  let query = window.sb.from('products')
    .select('*, stores!inner(store_name, status, logo_url, slug)')
    .eq('status','active')
    .eq('stores.status','approved');

  if(q) query = query.ilike('search_text', `%${q.toLowerCase()}%`);
  if(categoryId) query = query.eq('category_id', categoryId);

  const { data: products, error } = await query.order('price', { ascending:true });

  const wrap = document.getElementById('results-wrap');

  if(error){ wrap.innerHTML = `<div class="alert alert-error show">حدث خطأ أثناء تحميل النتائج.</div>`; return; }

  if(!products || products.length === 0){
    wrap.innerHTML = `<div class="empty-state"><div class="em-icon">🔎</div><h3 style="color:var(--ink);">لا توجد نتائج مطابقة</h3><p>جرّب كلمة بحث مختلفة أو تصفح التصنيفات.</p></div>`;
    return;
  }

  // group by normalized product name for real price comparison
  const groups = {};
  products.forEach(p => {
    const key = normalize(p.name);
    if(!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  document.getElementById('search-sub').textContent = `${Object.keys(groups).length} نتيجة مطابقة من ${new Set(products.map(p=>p.store_id)).size} متجر`;

  wrap.innerHTML = Object.values(groups).map(renderGroup).join('');
});

function normalize(s){
  return (s||'').toString().trim().toLowerCase();
}

function renderGroup(items){
  items.sort((a,b) => a.price - b.price);
  const first = items[0];
  const lowest = items[0].price;
  const highest = items[items.length-1].price;
  const img = items.find(i=>i.image_url)?.image_url || `https://picsum.photos/seed/${first.id}/400/400`;

  return `
  <div class="compare-group">
    <div class="cg-head">
      <div style="display:flex; gap:14px; align-items:center;">
        <img src="${img}" alt="" style="width:56px;height:56px;border-radius:12px;object-fit:cover;background:var(--bg-alt);">
        <div>
          <div class="cg-title">${escapeHtml(first.name)}</div>
          <div class="cg-meta">${items.length} عرض متاح ${items.length>1 ? `· من ${fmtPrice(lowest)} إلى ${fmtPrice(highest)} ر.س` : ''}</div>
        </div>
      </div>
      <span class="stars">${stars(first.rating)} <span style="color:var(--ink-soft); font-size:12px;">(${first.rating_count||0})</span></span>
    </div>
    <div class="cg-offers">
      ${items.map((p,i) => offerRow(p, i===0)).join('')}
    </div>
  </div>`;
}

function offerRow(p, isBest){
  const sourceLabel = { noon:'عبر noon.com', amazon:'عبر amazon.sa', manual:'شراء مباشر', other:'شراء مباشر' }[p.source] || 'شراء مباشر';
  const link = p.affiliate_link || `/store-page.html?store=${p.store_id}`;
  return `
  <div class="offer-row ${isBest?'is-best':''}">
    <img src="${p.stores?.logo_url || 'https://picsum.photos/seed/'+p.store_id+'/100/100'}" alt="">
    <div class="offer-store">
      <b>${escapeHtml(p.stores?.store_name || 'متجر')} ${isBest ? '<span class="badge-best" style="position:static;display:inline-block;vertical-align:middle;">✓ الأفضل سعرًا</span>' : ''}</b>
      <span class="offer-source">${sourceLabel}</span>
    </div>
    <div class="offer-price">
      <b class="num">${fmtPrice(p.price)} ر.س</b>
      ${p.original_price ? `<s class="num">${fmtPrice(p.original_price)} ر.س</s>` : ''}
    </div>
    <a class="btn btn-primary btn-sm" href="${link}" target="_blank" rel="noopener sponsored">اشترِ الآن</a>
  </div>`;
}
