document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('notificationsList');
  const emptyEl = document.getElementById('notificationsEmpty');
  const API_BASE = 'https://sobsob.onrender.com/api';
  const token = localStorage.getItem('token');

  console.log('=== NOTIFICATIONS PAGE LOADED ===');
  console.log('Token from localStorage:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
  console.log('User from localStorage:', localStorage.getItem('user'));

  function timeAgo(dateStr) {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.floor(hr / 24);
    return `${day}d`;
  }

  async function fetchNotifications() {
    try {
      console.log('=== FETCHING NOTIFICATIONS ===');
      console.log('API endpoint:', `${API_BASE}/notifications`);
      console.log('Token:', token ? token.substring(0, 20) + '...' : 'MISSING');
      const res = await fetch(`${API_BASE}/notifications`, { 
        credentials: 'include',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Response status:', res.status);
      console.log('Response headers:', {
        'content-type': res.headers.get('content-type'),
        'content-length': res.headers.get('content-length')
      });
      if (!res.ok) {
        const errText = await res.text();
        console.log('Response NOT OK. Body:', errText);
        listEl.innerHTML = '';
        emptyEl.style.display = 'block';
        return;
      }
      const data = await res.json();
      console.log('=== NOTIFICATIONS DATA ===');
      console.log('Array length:', Array.isArray(data) ? data.length : 'NOT AN ARRAY');
      console.log('Full data:', JSON.stringify(data));
      renderList(data || []);
    } catch (err) {
      console.error('=== FETCH ERROR ===', err);
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
    }
  }

  function renderList(items) {
    listEl.innerHTML = '';
    if (!items || items.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    items.forEach(n => {
      const item = document.createElement('div');
      item.className = 'notification-item';
      item.dataset.id = n.id;

      const left = document.createElement('div');
      left.className = 'notification-main';
      left.innerHTML = `<div class="notification-message">${escapeHtml(n.message)}</div><div class="notification-meta">${timeAgo(n.created_at)}</div>`;

      const actions = document.createElement('div');
      actions.className = 'notification-actions';
      const markBtn = document.createElement('button');
      markBtn.className = 'btn-secondary btn-markread';
      markBtn.textContent = 'Mark read';
      markBtn.addEventListener('click', (e) => {
        e.preventDefault();
        markRead(n.id, item);
      });

      actions.appendChild(markBtn);
      item.appendChild(left);
      item.appendChild(actions);
      listEl.appendChild(item);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (s) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s]);
  }

  async function markRead(id, node) {
    try {
      const res = await fetch(`${API_BASE}/notifications/${id}`, { 
        method: 'DELETE', 
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        // remove from DOM
        node.remove();
        // update empty state if needed
        if (!listEl.querySelector('.notification-item')) {
          document.getElementById('notificationsEmpty').style.display = 'block';
        }
        // also update nav badges by polling notifications endpoint quickly
        updateNavBadgeQuick();
      } else {
        console.error('Failed to mark read', await res.text());
      }
    } catch (err) {
      console.error('Error marking notification read', err);
    }
  }

  async function updateNavBadgeQuick() {
    try {
      const res = await fetch(`${API_BASE}/notifications`, { 
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;
      const notifLinks = Array.from(document.querySelectorAll('a[href*="notifications.html"]'));
      notifLinks.forEach(link => {
        const badge = link.querySelector('.notif-badge');
        if (!badge) return;
        if (count > 0) {
          badge.style.display = 'inline-block';
          badge.textContent = count > 99 ? '99+' : String(count);
        } else {
          badge.style.display = 'none';
        }
      });
    } catch (err) {
      // ignore
    }
  }

  fetchNotifications();

});
