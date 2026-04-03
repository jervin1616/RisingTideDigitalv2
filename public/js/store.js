/* ============================================================
   store.js — Store page: product listing, filtering, checkout
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('product-grid');
  const filters = document.querySelectorAll('.store-filter-btn');
  const successBanner = document.getElementById('success-banner');
  const cancelBanner = document.getElementById('cancel-banner');

  let allProducts = [];
  let currentUser = null;
  let activeCategory = 'all';

  // Check auth state (don't redirect — just know for purchase flow)
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
    }
  } catch { /* not logged in */ }

  // Handle success / cancel from Stripe
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === 'true') {
    if (successBanner) successBanner.style.display = 'block';
    const sessionId = params.get('session_id');
    if (sessionId && currentUser) {
      try {
        const res = await fetch(`/api/orders/success?session_id=${sessionId}`, { credentials: 'include' });
        if (res.ok) {
          const { order } = await res.json();
          const nameEl = document.getElementById('success-product-name');
          if (nameEl && order.product) nameEl.textContent = order.product.name;
        }
      } catch { /* best effort */ }
    }
    window.history.replaceState({}, '', '/store.html');
  }

  if (params.get('cancelled') === 'true') {
    if (cancelBanner) cancelBanner.style.display = 'block';
    window.history.replaceState({}, '', '/store.html');
  }

  // Load products
  async function loadProducts() {
    if (!grid) return;
    grid.innerHTML = '<div class="store-loading">Loading packages…</div>';

    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      allProducts = data.products || [];
      renderProducts();
    } catch {
      grid.innerHTML = '<p style="color:#e53e3e;text-align:center">Failed to load packages. Please refresh.</p>';
    }
  }

  function renderProducts() {
    if (!grid) return;
    const filtered = activeCategory === 'all'
      ? allProducts
      : allProducts.filter(p => p.category === activeCategory);

    if (filtered.length === 0) {
      grid.innerHTML = '<p style="color:var(--gray-400);text-align:center;grid-column:1/-1">No packages in this category.</p>';
      return;
    }

    grid.innerHTML = filtered.map(p => `
      <div class="product-card" data-id="${p.id}">
        <div class="product-card-header">
          <span class="product-category-tag">${p.category}</span>
          <h3 class="product-name">${p.name}</h3>
          <div class="product-price">${window.RTD.formatPrice(p.price)}</div>
          <p class="product-desc">${p.description}</p>
        </div>
        <ul class="product-features">
          ${(Array.isArray(p.features) ? p.features : []).map(f => `
            <li><span class="check">✓</span> ${f}</li>
          `).join('')}
        </ul>
        <button class="btn btn-primary btn-full purchase-btn" data-id="${p.id}" data-name="${p.name}">
          Purchase — ${window.RTD.formatPrice(p.price)}
        </button>
      </div>
    `).join('');

    grid.querySelectorAll('.purchase-btn').forEach(btn => {
      btn.addEventListener('click', () => handlePurchase(btn.dataset.id, btn.dataset.name));
    });
  }

  async function handlePurchase(productId, productName) {
    if (!currentUser) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent('/store.html');
      return;
    }

    const btn = grid.querySelector(`.purchase-btn[data-id="${productId}"]`);
    window.RTD.setLoading(btn, true);

    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: parseInt(productId) }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Could not initiate checkout. Please try again.');
        window.RTD.setLoading(btn, false, `Purchase — ${window.RTD.formatPrice(btn.dataset.price)}`);
      }
    } catch {
      alert('Connection error. Please try again.');
      window.RTD.setLoading(btn, false);
    }
  }

  // Category filters
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      renderProducts();
    });
  });

  loadProducts();
});
