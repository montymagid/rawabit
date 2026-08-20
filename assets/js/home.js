document.addEventListener('DOMContentLoaded', async () => {
  const heroForm = document.getElementById('hero-search-form');
  if(heroForm){
    heroForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const q = document.getElementById('hero-search-input').value.trim();
      window.location.href = '/search.html' + (q ? ('?q=' + encodeURIComponent(q)) : '');
    });
  }

  // categories
  const { data: cats } = await window.sb.from('categories').select('*').order('sort_order');
  const catGrid = document.getElementById('categories-grid');
  if(catGrid){
    if(cats && cats.length){
      catGrid.innerHTML = cats.map(c => `
        <a class="cat-card" href="/search.html?category=${c.id}&q=">
          <div class="ic">${c.icon||'🛍️'}</div>
          <span>${escapeHtml(c.name)}</span>
        </a>`).join('');
    } else {
      catGrid.innerHTML = '<p style="color:var(--ink-soft)">لا توجد تصنيفات بعد.</p>';
    }
  }

  // latest products (from approved stores only)
  const { data: products } = await window.sb
    .from('products')
    .select('*, stores!inner(store_name, status, slug)')
    .eq('status','active')
    .eq('stores.status','approved')
    .order('created_at', { ascending:false })
    .limit(8);

  const grid = document.getElementById('latest-products');
  if(grid){
    if(products && products.length){
      grid.innerHTML = products.map(productCardHtml).join('');
    } else {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="em-icon">🛒</div><p>لا توجد منتجات معروضة بعد.</p></div>`;
    }
  }
});

function productCardHtml(p){
  const storeName = p.stores ? p.stores.store_name : '';
  return `
  <a class="product-card" href="/search.html?q=${encodeURIComponent(p.name)}">
    <div class="pc-img"><img src="${p.image_url || 'https://picsum.photos/seed/'+p.id+'/500/500'}" alt="${escapeHtml(p.name)}" loading="lazy"></div>
    <div class="pc-body">
      <div class="pc-store">${escapeHtml(storeName)}</div>
      <div class="pc-name">${escapeHtml(p.name)}</div>
      <div class="pc-price-row">
        <span class="pc-price num">${fmtPrice(p.price)} ر.س</span>
        ${p.original_price ? `<span class="pc-old num">${fmtPrice(p.original_price)}</span>` : ''}
      </div>
      <div class="pc-foot">
        <span class="stars">${stars(p.rating)}</span>
        <span style="font-size:11px;color:var(--ink-soft);">${p.rating_count||0} تقييم</span>
      </div>
    </div>
  </a>`;
}
