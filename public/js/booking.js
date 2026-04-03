/* ============================================================
   booking.js — Booking page logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  // Guard: must be logged in
  let currentUser = null;
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    const data = await res.json();
    currentUser = data.user;
  } catch {
    window.location.href = '/login.html';
    return;
  }

  const form = document.getElementById('booking-form');
  const serviceSelect = document.getElementById('service-type');
  const dateInput = document.getElementById('booking-date');
  const slotContainer = document.getElementById('slot-container');
  const slotGrid = document.getElementById('slot-grid');
  const slotLoading = document.getElementById('slot-loading');
  const selectedSlotInput = document.getElementById('selected-slot');
  const msgEl = document.getElementById('booking-msg');
  const submitBtn = document.getElementById('booking-submit');

  // Pre-fill service from query param
  const params = new URLSearchParams(window.location.search);
  const preService = params.get('service');
  if (preService && serviceSelect) {
    const opt = [...serviceSelect.options].find(o => o.value === preService || o.text === preService);
    if (opt) serviceSelect.value = opt.value;
  }

  // Set min date = today, disable Sundays
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  if (dateInput) {
    dateInput.min = `${yyyy}-${mm}-${dd}`;

    dateInput.addEventListener('change', async () => {
      const val = dateInput.value;
      if (!val) {
        slotContainer.style.display = 'none';
        return;
      }

      // Reject Sundays on client side
      const d = new Date(val + 'T00:00:00');
      if (d.getDay() === 0) {
        dateInput.value = '';
        showMsg('error', 'Bookings are not available on Sundays. Please select another day.');
        slotContainer.style.display = 'none';
        return;
      }

      clearMsg();
      selectedSlotInput.value = '';
      slotGrid.innerHTML = '';
      slotContainer.style.display = 'block';
      slotLoading.style.display = 'block';

      try {
        const res = await fetch(`/api/timeslots/available?date=${val}`, { credentials: 'include' });
        const { slots } = await res.json();
        slotLoading.style.display = 'none';

        if (!slots || slots.length === 0) {
          slotGrid.innerHTML = '<p style="color:var(--gray-400);font-size:0.9rem;">No available slots for this date.</p>';
          return;
        }

        slotGrid.innerHTML = slots.map(s => `
          <button type="button" class="slot-btn" data-time="${s.time}">
            ${window.RTD.formatTime(s.time)}
          </button>
        `).join('');

        slotGrid.querySelectorAll('.slot-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            slotGrid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedSlotInput.value = btn.dataset.time;
          });
        });
      } catch {
        slotLoading.style.display = 'none';
        slotGrid.innerHTML = '<p style="color:#e53e3e;font-size:0.9rem;">Failed to load time slots. Please try again.</p>';
      }
    });
  }

  // Form submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMsg();

      const serviceType = serviceSelect?.value;
      const date = dateInput?.value;
      const timeSlot = selectedSlotInput?.value;
      const notes = document.getElementById('notes')?.value?.trim();

      if (!serviceType) { showMsg('error', 'Please select a service type.'); return; }
      if (!date) { showMsg('error', 'Please select a date.'); return; }
      if (!timeSlot) { showMsg('error', 'Please select a time slot.'); return; }

      window.RTD.setLoading(submitBtn, true);

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ serviceType, date, timeSlot, notes }),
        });

        const data = await res.json();

        if (res.ok) {
          showConfirmation(data.booking, serviceType, date, timeSlot);
        } else {
          showMsg('error', data.error || 'Booking failed. Please try again.');
          window.RTD.setLoading(submitBtn, false, 'Request Consultation');
        }
      } catch {
        showMsg('error', 'Connection error. Please try again.');
        window.RTD.setLoading(submitBtn, false, 'Request Consultation');
      }
    });
  }

  function showConfirmation(booking, service, date, time) {
    const formSection = document.getElementById('booking-form-section');
    const confirmSection = document.getElementById('booking-confirm');
    if (formSection) formSection.style.display = 'none';
    if (confirmSection) {
      confirmSection.style.display = 'block';
      const el = document.getElementById('confirm-details');
      if (el) {
        el.innerHTML = `
          <div class="confirm-row"><span>Service:</span><strong>${service}</strong></div>
          <div class="confirm-row"><span>Date:</span><strong>${window.RTD.formatDate(date)}</strong></div>
          <div class="confirm-row"><span>Time:</span><strong>${window.RTD.formatTime(time)} EST</strong></div>
          <div class="confirm-row"><span>Status:</span><span class="badge badge-pending">Pending</span></div>
        `;
      }
    }
  }

  function showMsg(type, text) {
    if (msgEl) {
      msgEl.className = `form-message ${type}`;
      msgEl.textContent = text;
      msgEl.style.display = 'block';
    }
  }

  function clearMsg() {
    if (msgEl) { msgEl.style.display = 'none'; }
  }
});
