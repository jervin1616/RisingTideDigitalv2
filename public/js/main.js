/* ============================================================
   main.js — Shared utilities, nav logic, active link
   ============================================================ */

// --- Active nav link ---
(function highlightNav() {
  const path = window.location.pathname.replace(/\/$/, '') || '/index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;
    const normalized = href.replace(/^\.\//, '/');
    if (
      path.endsWith(normalized) ||
      (normalized === '/index.html' && (path === '/' || path === ''))
    ) {
      a.classList.add('active');
    }
  });
})();

// --- Hamburger menu ---
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');

if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });

  // Close on link click
  mobileNav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
    });
  });
}

// --- Auth-aware nav ---
async function initNav() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const navLogin = document.getElementById('nav-login');
    const navDash = document.getElementById('nav-dash');
    const navLogout = document.getElementById('nav-logout');
    const mobileLogin = document.getElementById('mobile-login');
    const mobileDash = document.getElementById('mobile-dash');
    const mobileLogout = document.getElementById('mobile-logout');

    if (res.ok) {
      const { user } = await res.json();
      if (navLogin) navLogin.style.display = 'none';
      if (mobileLogin) mobileLogin.style.display = 'none';
      if (navDash) {
        navDash.style.display = '';
        navDash.href = user.role === 'admin' ? '/admin.html' : '/dashboard.html';
        navDash.textContent = user.role === 'admin' ? 'Admin' : 'Dashboard';
      }
      if (mobileDash) {
        mobileDash.style.display = '';
        mobileDash.href = user.role === 'admin' ? '/admin.html' : '/dashboard.html';
        mobileDash.textContent = user.role === 'admin' ? 'Admin Dashboard' : 'My Dashboard';
      }
      if (navLogout) navLogout.style.display = '';
      if (mobileLogout) mobileLogout.style.display = '';
    } else {
      if (navDash) navDash.style.display = 'none';
      if (mobileDash) mobileDash.style.display = 'none';
      if (navLogout) navLogout.style.display = 'none';
      if (mobileLogout) mobileLogout.style.display = 'none';
    }
  } catch {
    // Silently fail — not logged in
  }
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/index.html';
}

document.querySelectorAll('.logout-btn').forEach((btn) => {
  btn.addEventListener('click', handleLogout);
});

initNav();

// --- Utility: format cents as dollars ---
function formatPrice(cents) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// --- Utility: format date string YYYY-MM-DD to readable ---
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// --- Utility: format 24h time to 12h ---
function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${suffix}`;
}

// --- Utility: relative date ---
function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// --- Utility: show inline form message ---
function showMessage(el, type, text) {
  if (!el) return;
  el.className = `form-message ${type}`;
  el.textContent = text;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// --- Utility: set button loading state ---
function setLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.original = btn.textContent;
    btn.innerHTML = '<span class="loading-spinner"></span>';
  } else {
    btn.disabled = false;
    btn.textContent = originalText || btn.dataset.original || btn.textContent;
  }
}

// --- Home page: dynamic product tiers ---
async function loadHomeTiers() {
  const container = document.getElementById('tier-grid');
  if (!container) return;

  try {
    const res = await fetch('/api/products?category=Web+Design');
    if (!res.ok) throw new Error('Failed to load');
    const { products } = await res.json();

    if (!products || products.length === 0) {
      container.innerHTML = '<p style="color:var(--gray-400);text-align:center;grid-column:1/-1">Packages coming soon.</p>';
      return;
    }

    const tiers = products.slice(0, 3);
    const labels = ['Starter', 'Standard', 'Premium'];
    const icons = ['🌱', '⚓', '🏄'];
    const featured = 1; // middle card

    container.innerHTML = tiers.map((p, i) => `
      <div class="tier-card ${i === featured ? 'featured' : ''}">
        ${i === featured ? '<span class="tier-badge">Most Popular</span>' : ''}
        <div class="tier-icon">${icons[i] || '🌐'}</div>
        <h3 class="tier-name">${p.name}</h3>
        <div class="tier-price">${formatPrice(p.price)}</div>
        <p class="tier-price-note">one-time project fee</p>
        <p class="tier-desc">${p.description}</p>
        <ul class="tier-features">
          ${(Array.isArray(p.features) ? p.features : []).slice(0, 5).map(f => `
            <li class="tier-feature"><span class="check">✓</span> ${f}</li>
          `).join('')}
        </ul>
        <a href="/booking.html?service=${encodeURIComponent(p.name)}" class="btn btn-${i === featured ? 'primary' : 'outline-navy'} btn-full">Get Started</a>
      </div>
    `).join('');
  } catch {
    container.innerHTML = `
      <div class="tier-card"><div class="tier-icon">🌱</div><h3 class="tier-name">Starter</h3><div class="tier-price">$500</div><p class="tier-desc">Perfect for small businesses launching their first professional web presence.</p><a href="/services.html" class="btn btn-outline-navy btn-full">Learn More</a></div>
      <div class="tier-card featured"><span class="tier-badge">Most Popular</span><div class="tier-icon">⚓</div><h3 class="tier-name">Standard</h3><div class="tier-price">$1,000</div><p class="tier-desc">Ideal for growing businesses that need a robust website with more pages.</p><a href="/services.html" class="btn btn-primary btn-full">Learn More</a></div>
      <div class="tier-card"><div class="tier-icon">🏄</div><h3 class="tier-name">Premium</h3><div class="tier-price">$1,500+</div><p class="tier-desc">Full-featured solution for established businesses requiring custom development.</p><a href="/services.html" class="btn btn-outline-navy btn-full">Learn More</a></div>
    `;
  }
}

loadHomeTiers();

// Export utilities for other scripts
window.RTD = { formatPrice, formatDate, formatTime, timeAgo, showMessage, setLoading };
