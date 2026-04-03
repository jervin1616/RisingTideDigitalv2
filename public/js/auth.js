/* ============================================================
   auth.js — Login and register form logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // --- Login form ---
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    // If already logged in, redirect
    fetch('/api/auth/me', { credentials: 'include' }).then(async (res) => {
      if (res.ok) {
        const { user } = await res.json();
        window.location.href = user.role === 'admin' ? '/admin.html' : '/dashboard.html';
      }
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const msgEl = document.getElementById('form-msg');
      const submitBtn = loginForm.querySelector('[type="submit"]');

      if (!email || !password) {
        showFieldError('email', !email ? 'Email is required' : '');
        showFieldError('password', !password ? 'Password is required' : '');
        return;
      }

      setBtn(submitBtn, true);

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (res.ok) {
          // Redirect to intended page or dashboard
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get('redirect');
          if (redirect) {
            window.location.href = decodeURIComponent(redirect);
          } else {
            window.location.href = data.user.role === 'admin' ? '/admin.html' : '/dashboard.html';
          }
        } else {
          window.RTD?.showMessage(msgEl, 'error', data.error || 'Login failed. Please try again.');
          setBtn(submitBtn, false);
        }
      } catch {
        window.RTD?.showMessage(msgEl, 'error', 'Connection error. Please try again.');
        setBtn(submitBtn, false);
      }
    });
  }

  // --- Register form ---
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    // If already logged in, redirect
    fetch('/api/auth/me', { credentials: 'include' }).then(async (res) => {
      if (res.ok) {
        window.location.href = '/dashboard.html';
      }
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const password = document.getElementById('password').value;
      const confirm = document.getElementById('confirm-password').value;
      const msgEl = document.getElementById('form-msg');
      const submitBtn = registerForm.querySelector('[type="submit"]');

      let valid = true;

      if (!name) { showFieldError('name', 'Name is required'); valid = false; }
      if (!email) { showFieldError('email', 'Email is required'); valid = false; }
      if (!password) { showFieldError('password', 'Password is required'); valid = false; }
      else if (password.length < 8) { showFieldError('password', 'Password must be at least 8 characters'); valid = false; }
      if (password !== confirm) { showFieldError('confirm-password', 'Passwords do not match'); valid = false; }

      if (!valid) return;

      setBtn(submitBtn, true);

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, email, password, phone }),
        });

        const data = await res.json();

        if (res.ok) {
          window.location.href = '/dashboard.html';
        } else {
          window.RTD?.showMessage(msgEl, 'error', data.error || 'Registration failed. Please try again.');
          setBtn(submitBtn, false);
        }
      } catch {
        window.RTD?.showMessage(msgEl, 'error', 'Connection error. Please try again.');
        setBtn(submitBtn, false);
      }
    });
  }
});

function showFieldError(fieldId, msg) {
  if (!msg) return;
  const field = document.getElementById(fieldId);
  if (field) {
    field.style.borderColor = '#e53e3e';
    const errEl = document.getElementById(`${fieldId}-error`);
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
  }
}

function clearErrors() {
  document.querySelectorAll('.form-error').forEach((el) => {
    el.textContent = '';
    el.style.display = 'none';
  });
  document.querySelectorAll('input').forEach((el) => {
    el.style.borderColor = '';
  });
  const msgEl = document.getElementById('form-msg');
  if (msgEl) { msgEl.style.display = 'none'; msgEl.className = 'form-message'; }
}

function setBtn(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.original = btn.textContent;
    btn.innerHTML = '<span class="loading-spinner"></span>';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.original || btn.textContent;
  }
}
