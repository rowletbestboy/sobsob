const API_BASE = 'https://sob-c30g.onrender.com/api';
const token = localStorage.getItem('token');
const currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
const currentUserId = currentUser?.id;

const urlParams = new URLSearchParams(window.location.search);
const userId = parseInt(urlParams.get('userId'));

const profileContent = document.getElementById('profileContent');
const loadingSpinner = document.querySelector('.loading-spinner');
const addFriendBtn = document.getElementById('addFriendBtn');
const logoutBtn = document.getElementById('logoutBtn');

logoutBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/frontend/views/login.html';
});

// Don't allow viewing own profile from this page
if (currentUserId === userId) {
  window.location.href = '/frontend/views/profile.html';
}

async function loadUserProfile() {
  if (!userId) {
    loadingSpinner.textContent = 'Invalid user ID.';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/profile/${userId}`);
    if (!res.ok) throw new Error('User not found');
    
    const data = await res.json();
    const user = data.profile;

    // Populate profile
    document.getElementById('userName').textContent = user.name || 'Unknown';
    document.getElementById('userBio').textContent = user.bio || '';
    document.getElementById('userEmail').textContent = user.email || '—';
    document.getElementById('userLocation').textContent = user.location || '—';
    document.getElementById('userContact').textContent = user.contact || '—';
    
    const avatar = document.getElementById('userAvatar');
    if (user.profile_pic) {
      avatar.src = user.profile_pic;
    } else {
      avatar.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23ddd" width="100" height="100"/><circle cx="50" cy="35" r="20" fill="%23999"/><path d="M50 60 Q30 75 20 90 L80 90 Q70 75 50 60" fill="%23999"/></svg>';
    }

    // Load user reviews
    await loadUserReviews(userId);

    // Check if already friends and set button state
    await checkFriendStatus();

    // Show content
    loadingSpinner.style.display = 'none';
    profileContent.style.display = 'block';
  } catch (err) {
    console.error('Error loading profile:', err);
    loadingSpinner.textContent = 'Failed to load user profile.';
  }
}

async function loadUserReviews(userId) {
  try {
    const res = await fetch(`${API_BASE}/reviews/user/${userId}`);
    if (!res.ok) throw new Error('Failed to load reviews');

    const data = await res.json();
    const reviews = data.reviews || [];

    const reviewsList = document.getElementById('userReviewsList');
    reviewsList.innerHTML = '';

    if (reviews.length === 0) {
      reviewsList.innerHTML = '<p>This user has not written any reviews yet.</p>';
      return;
    }

    reviews.forEach(review => {
      const div = document.createElement('div');
      div.className = 'user-review-card';

      // Parse and normalize photos
      let photosHTML = '';
      if (review.photo) {
        let photos = [];
        if (Array.isArray(review.photo)) {
          photos = review.photo;
        } else {
          try {
            photos = JSON.parse(review.photo);
          } catch (e) {
            photos = [];
          }
        }

        if (Array.isArray(photos) && photos.length > 0) {
          photos = photos.map(p => p && p.startsWith('http') ? p : `https://sob-c30g.onrender.com${p}`);
          photosHTML = photos.map(p => `<img src="${p}" alt="Review photo">`).join('');
        }
      }

      const date = new Date(review.created_at);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

      div.innerHTML = `
        <div class="review-cafe-name">${review.cafe_name || 'Unknown Cafe'}</div>
        <div class="review-date">${dateStr}</div>
        <div class="review-rating">${stars} ${review.rating}/5</div>
        <div class="review-text">${review.text || '(No text)'}</div>
        ${photosHTML ? `<div class="review-photos">${photosHTML}</div>` : ''}
        <button class="review-like-btn" data-review-id="${review.id}" style="padding:6px 12px;background:#f0f0f0;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:14px;transition:all 0.2s;">
          ❤️ <span class="review-like-count" data-review-id="${review.id}">0</span>
        </button>
      `;

      reviewsList.appendChild(div);
    });

    // Attach like handlers
    attachReviewLikeHandlers();
  } catch (err) {
    console.error('Error loading user reviews:', err);
  }
}

async function attachReviewLikeHandlers() {
  const likeButtons = document.querySelectorAll('.review-like-btn');
  
  for (const btn of likeButtons) {
    const reviewId = btn.dataset.reviewId;
    
    // Fetch like count
    try {
      const res = await fetch(`${API_BASE}/reviews/${reviewId}/likes`);
      if (res.ok) {
        const data = await res.json();
        const count = data.likes?.length || 0;
        const countEl = document.querySelector(`.review-like-count[data-review-id="${reviewId}"]`);
        if (countEl) countEl.textContent = count;
      }
    } catch (err) {
      console.error('Failed to fetch likes', err);
    }
    
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!token) return alert('Login to like reviews');
      
      const isLiked = btn.classList.contains('liked');
      const method = isLiked ? 'DELETE' : 'POST';
      const url = `${API_BASE}/reviews/${reviewId}/like`;
      
      try {
        const res = await fetch(url, {
          method,
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          btn.classList.toggle('liked');
          const countEl = document.querySelector(`.review-like-count[data-review-id="${reviewId}"]`);
          if (countEl) countEl.textContent = data.likes || 0;
        } else {
          alert('Failed to update like');
        }
      } catch (err) {
        console.error('Error toggling like', err);
      }
    });
  }
}

async function checkFriendStatus() {
  if (!token || !currentUserId) return;

  try {
    const res = await fetch(`${API_BASE}/friends/check/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.isFriend) {
        addFriendBtn.textContent = 'Remove Friend';
        addFriendBtn.classList.add('added');
      }
    }
  } catch (err) {
    console.error('Error checking friend status:', err);
  }
}

addFriendBtn.addEventListener('click', async () => {
  if (!token) return alert('Please login to add friends');

  const isFriend = addFriendBtn.classList.contains('added');
  const method = isFriend ? 'DELETE' : 'POST';
  const url = isFriend ? `${API_BASE}/friends/${userId}` : `${API_BASE}/friends`;

  try {
    addFriendBtn.disabled = true;
    addFriendBtn.textContent = isFriend ? 'Removing...' : 'Adding...';

    const options = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (!isFriend) {
      options.body = JSON.stringify({ friendId: userId });
    }

    const res = await fetch(url, options);

    if (res.ok) {
      addFriendBtn.classList.toggle('added');
      addFriendBtn.textContent = isFriend ? 'Add Friend' : 'Remove Friend';
      alert(isFriend ? 'Friend removed' : 'Friend added successfully!');
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to update friend status');
    }
  } catch (err) {
    console.error('Error updating friend status:', err);
    alert('Error updating friend status');
  } finally {
    addFriendBtn.disabled = false;
  }
});

// Load profile on page load
loadUserProfile();
