document.addEventListener('DOMContentLoaded', () => {
  // Find the notifications link in the navbar(s)
  const notifLinks = Array.from(document.querySelectorAll('a[href*="notifications.html"]'));
  if (!notifLinks.length) return;

  const token = localStorage.getItem('token');
  const API_BASE = 'https://sob-c30g.onrender.com/api';

  // Ensure a badge exists on each notifications link
  notifLinks.forEach(link => {
    let badge = link.querySelector('.notif-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notif-badge';
      badge.textContent = '';
      link.appendChild(badge);
    }
  });

  // Fetch notifications for logged-in user and update badge count
  async function updateBadge() {
    try {
      const res = await fetch(`${API_BASE}/notifications`, { 
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        // hide badge on unauthenticated or error
        notifLinks.forEach(link => link.querySelector('.notif-badge').style.display = 'none');
        return;
      }
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : (data.count || 0);

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
      console.error('Failed to update notification badge', err);
    }
  }

  // Initial update
  updateBadge();
  // Poll every 30s
  setInterval(updateBadge, 30000);
});
