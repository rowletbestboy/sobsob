const logoutBtn = document.getElementById('logoutBtn');
const cafeNameEl = document.getElementById('cafeName');
const cafeDescriptionEl = document.getElementById('cafeDescription');
const cafeLocationEl = document.getElementById('cafeLocation');
const postsContainer = document.getElementById('postsContainer');
const postBtn = document.getElementById('postBtn');
const reviewText = document.getElementById('reviewText');
const ratingInput = document.getElementById('rating');
const photoInput = document.getElementById('photoInput');
const previewContainer = document.getElementById('previewContainer');
const stars = document.querySelectorAll('#starRating .star');
const slideshowImg = document.getElementById('slideshow');
const prevBtn = document.getElementById('prevSlide');
const nextBtn = document.getElementById('nextSlide');

const urlParams = new URLSearchParams(window.location.search);
const cafeId = urlParams.get('id');
const API_BASE = 'https://sobsob.onrender.com/api';

// -----------------------------
// LOGOUT
// -----------------------------
logoutBtn?.addEventListener('click', () => {
localStorage.removeItem('token');
localStorage.removeItem('user');
window.location.href = 'login.html';
});

// -----------------------------
// STAR RATING
// -----------------------------
stars.forEach(star => {
star.addEventListener('click', () => {
const value = parseInt(star.dataset.value);
ratingInput.value = value;
stars.forEach(s => s.textContent = '☆');
for (let i = 0; i < value; i++) stars[i].textContent = '⭐';
});
});

// -----------------------------
// IMAGE PREVIEW
// -----------------------------
photoInput?.addEventListener('change', () => {
previewContainer.innerHTML = '';
Array.from(photoInput.files).forEach(file => {
const reader = new FileReader();
reader.onload = e => {
const img = document.createElement('img');
img.src = e.target.result;
img.className = 'post-img';
img.style.maxWidth = '100%';
img.style.maxHeight = '200px';
img.style.objectFit = 'cover';
previewContainer.appendChild(img);
};
reader.readAsDataURL(file);
});
});

// -----------------------------
// SLIDESHOW
// -----------------------------
let currentSlide = 0;
let slideImages = [];

function initSlideshow(images) {
if (!slideshowImg || !images.length) return;
slideImages = images;
currentSlide = 0;
slideshowImg.src = slideImages[currentSlide];


// Arrow buttons
prevBtn?.addEventListener('click', () => {
    currentSlide = (currentSlide - 1 + slideImages.length) % slideImages.length;
    slideshowImg.src = slideImages[currentSlide];
});
nextBtn?.addEventListener('click', () => {
    currentSlide = (currentSlide + 1) % slideImages.length;
    slideshowImg.src = slideImages[currentSlide];
});

// Auto-slide
setInterval(() => {
    currentSlide = (currentSlide + 1) % slideImages.length;
    slideshowImg.src = slideImages[currentSlide];
}, 4000);


}

// -----------------------------
// LOAD CAFÉ INFO
// -----------------------------
const cafeData = [
{ id: 1, name: "Brewngan", description: "Cozy spot with classic brews near the bay.", location: "Borongan Bay" },
{ id: 2, name: "Cafe Bon", description: "Pastas? Pastries? Food? We have it all!", location: "Main Street" }
// add more cafes here
];

function loadCafe() {
if (!cafeId) return;
const cafe = cafeData.find(c => c.id === Number(cafeId));
if (!cafe) return;


cafeNameEl.textContent = cafe.name;
cafeDescriptionEl.textContent = cafe.description;
cafeLocationEl.textContent = cafe.location;

const images = [
    `/frontend/assets/img/cafes/cafe${cafeId}-1.jpg`,
    `/frontend/assets/img/cafes/cafe${cafeId}-2.jpg`,
    `/frontend/assets/img/cafes/cafe${cafeId}-3.jpg`
];
initSlideshow(images);

loadPosts();


}

// -----------------------------
// LOAD POSTS
// -----------------------------
async function loadPosts() {
try {
const res = await fetch(`${API_BASE}/reviews/cafe/${cafeId}`);
if (!res.ok) throw new Error(res.statusText);
const posts = await res.json();
renderPosts(posts);
} catch (err) {
console.error("Failed to load posts:", err);
postsContainer.innerHTML = "<p>Unable to load posts.</p>";
}
}

function renderPosts(posts) {
postsContainer.innerHTML = "";
if (!posts.length) {
postsContainer.innerHTML = "<p>No posts yet. Be the first!</p>";
return;
}

const userStr = localStorage.getItem('user');
const currentUser = userStr ? JSON.parse(userStr) : null;
const currentUserId = currentUser?.id;

posts.forEach(p => {
    const div = document.createElement('div');
    div.className = 'post';
    const photosHtml = (p.photo || [])
        .map(src => `<img src="${src}" class="post-img" style="width:100%;max-width:320px;height:auto;object-fit:contain;margin:10px 0;border-radius:6px;">`)
        .join('');
    
    const isOwner = currentUserId && currentUserId === p.user_id;
    const actionButtons = isOwner ? `
        <div class="post-actions" style="margin-top:10px;">
            <button class="edit-btn" data-review-id="${p.id}" style="margin-right:10px;padding:5px 10px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">Edit</button>
            <button class="delete-btn" data-review-id="${p.id}" style="padding:5px 10px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;">Delete</button>
        </div>
    ` : '';
    
    div.innerHTML = `
        <div class="post-header">
            <b><a href="/frontend/views/user-profile.html?userId=${p.user_id}" style="color:#007bff;text-decoration:none;cursor:pointer;">${p.username || 'Anonymous'}</a></b>
            <span class="rating">${'⭐'.repeat(p.rating || 0)}</span>
        </div>
        <p>${p.text}</p>
        ${photosHtml}
        <small>${new Date(p.created_at).toLocaleString()}</small>
        <div class="post-footer" style="margin-top:12px;display:flex;gap:10px;">
          <button class="like-btn" data-review-id="${p.id}" style="padding:6px 12px;background:#f0f0f0;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:14px;transition:all 0.2s;">
            ❤️ <span class="like-count" data-review-id="${p.id}">0</span>
          </button>
        </div>
        ${actionButtons}
    `;
    postsContainer.appendChild(div);
});

// Fetch and display like counts, attach like handlers
async function attachLikeHandlers(posts) {
  const likeButtons = document.querySelectorAll('.like-btn');
  const token = localStorage.getItem('token');
  
  for (const btn of likeButtons) {
    const reviewId = btn.dataset.reviewId;
    
    // Fetch like count
    try {
      const res = await fetch(`${API_BASE}/reviews/${reviewId}/likes`);
      if (res.ok) {
        const data = await res.json();
        const count = data.likes?.length || 0;
        const countEl = document.querySelector(`.like-count[data-review-id="${reviewId}"]`);
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
          const countEl = document.querySelector(`.like-count[data-review-id="${reviewId}"]`);
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

// Attach like handlers
attachLikeHandlers(posts);

// Add event listeners for edit/delete buttons
document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const reviewId = btn.dataset.reviewId;
        if (!confirm('Delete this review?')) return;
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(res.statusText);
            loadPosts();
        } catch (err) {
            console.error("Failed to delete review:", err);
            alert("Failed to delete review.");
        }
    });
});

document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const reviewId = btn.dataset.reviewId;
        const review = posts.find(p => p.id === Number(reviewId));
        if (!review) return;
        
        // Populate form with review data
        reviewText.value = review.text;
        ratingInput.value = review.rating;
        stars.forEach(s => s.textContent = '☆');
        for (let i = 0; i < review.rating; i++) stars[i].textContent = '⭐';
        
        // Scroll to form
        document.querySelector('.review-box')?.scrollIntoView({ behavior: 'smooth' });
        
        // Change button text and update handler
        postBtn.textContent = 'Update Review';
        postBtn.dataset.editingId = reviewId;
    });
});

}

// -----------------------------
// POST REVIEW
// -----------------------------
postBtn?.addEventListener('click', async () => {
const token = localStorage.getItem('token');
if (!token) return alert("Login first!");

const text = reviewText.value.trim();
const rating = Number(ratingInput.value);
if (!text || !rating) return alert("Please fill in content and rating.");

const formData = new FormData();
formData.append('reviewText', text);
formData.append('rating', rating);

// Only add cafeId for new reviews (POST)
if (!postBtn.dataset.editingId) {
    formData.append('cafeId', cafeId);
}

console.log('Files selected:', photoInput.files.length);
Array.from(photoInput.files).forEach(file => {
    console.log('Appending file:', file.name, file.size);
    formData.append('photos', file);
});

try {
    const editingId = postBtn.dataset.editingId;
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_BASE}/reviews/${editingId}` : `${API_BASE}/reviews`;
    
    const res = await fetch(url, {
        method: method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData
    });

    if (!res.ok) throw new Error(res.statusText);

    reviewText.value = '';
    ratingInput.value = 0;
    previewContainer.innerHTML = '';
    stars.forEach(s => s.textContent = '☆');
    photoInput.value = '';
    postBtn.textContent = 'Post Review';
    delete postBtn.dataset.editingId;

    loadPosts();
} catch (err) {
    console.error("Failed to post/update review:", err);
    alert("Failed to post/update review.");
}

});

// -----------------------------
// INIT
// -----------------------------
if (cafeId) loadCafe();
