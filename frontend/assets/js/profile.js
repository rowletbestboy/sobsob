// ======================== CONFIG ======================== //
const API_URL = "https://sobsob.onrender.com/api";
const token = localStorage.getItem("token");

// Redirect if not logged in
if (!token) {
  alert("You must login first!");
  window.location.href = "/frontend/views/login.html";
}

// ======================== DOM ELEMENTS ======================== //
const profileImage = document.getElementById("profileImage");
const profilePicInput = document.getElementById("profilePicInput");
const triggerFileInput = document.getElementById("triggerFileInput");
const uploadPicBtn = document.getElementById("uploadPicBtn");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const contactInput = document.getElementById("contact");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const reviewsList = document.getElementById("reviewsList");
const logoutBtn = document.getElementById("logoutBtn");

// ======================== LOAD PROFILE ======================== //
async function loadProfile() {
  try {
    const res = await fetch(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to load profile");

    const data = await res.json();
    const profile = data.profile;

    // Display profile info
    profileName.textContent = profile.name || "Your Name";
    profileEmail.textContent = profile.email || "";
    bioInput.value = profile.bio || "";
    locationInput.value = profile.location || "";
    contactInput.value = profile.contact || "";

    // Set profile image
    if (profile.profile_pic) {
      profileImage.src = profile.profile_pic;
    }
  } catch (err) {
    console.error("Error loading profile:", err);
    alert("Failed to load profile. Please try again.");
  }
}

// ======================== PROFILE PIC UPLOAD ======================== //
triggerFileInput.addEventListener("click", () => {
  profilePicInput.click();
});

profilePicInput.addEventListener("change", async () => {
  const file = profilePicInput.files[0];
  if (!file) return;

  // Show upload button
  uploadPicBtn.style.display = "inline-block";

  uploadPicBtn.addEventListener("click", async () => {
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      uploadPicBtn.textContent = "Uploading...";
      uploadPicBtn.disabled = true;

      const res = await fetch(`${API_URL}/profile/avatar`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      profileImage.src = data.profile_pic;
      uploadPicBtn.textContent = "Upload";
      uploadPicBtn.disabled = false;
      uploadPicBtn.style.display = "none";
      alert("Profile picture updated!");
      profilePicInput.value = "";
    } catch (err) {
      console.error("Error uploading picture:", err);
      alert("Failed to upload picture. Please try again.");
      uploadPicBtn.textContent = "Upload";
      uploadPicBtn.disabled = false;
    }
  }, { once: true }); // Only attach listener once
});

// ======================== SAVE PROFILE ======================== //
saveProfileBtn.addEventListener("click", async () => {
  const body = {
    name: profileName.textContent,
    bio: bioInput.value,
    location: locationInput.value,
    contact: contactInput.value
  };

  try {
    saveProfileBtn.textContent = "Saving...";
    saveProfileBtn.disabled = true;

    const res = await fetch(`${API_URL}/profile/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error("Failed to save");

    saveProfileBtn.textContent = "Save Changes";
    saveProfileBtn.disabled = false;
    alert("Profile updated successfully!");
  } catch (err) {
    console.error("Error saving profile:", err);
    alert("Failed to save profile. Please try again.");
    saveProfileBtn.textContent = "Save Changes";
    saveProfileBtn.disabled = false;
  }
});

// ======================== LOAD REVIEWS ======================== //
async function loadReviews() {
  try {
    const res = await fetch(`${API_URL}/profile/reviews`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to load reviews");

    const data = await res.json();
    const reviews = data.reviews;

    reviewsList.innerHTML = "";

    if (reviews.length === 0) {
      reviewsList.innerHTML = '<div class="no-reviews">You haven\'t written any reviews yet. Go explore some cafes!</div>';
      return;
    }

    reviews.forEach(review => {
      const div = document.createElement("div");
      div.className = "review-card";
      div.dataset.reviewId = review.id;

      // Parse photos (handle backend returning stringified JSON or an array)
      let photosHTML = "";
      if (review.photo) {
        let photos = [];
        if (Array.isArray(review.photo)) {
          photos = review.photo;
        } else {
          try {
            photos = JSON.parse(review.photo);
          } catch (e) {
            console.log("Could not parse photos for review", review.id);
            photos = [];
          }
        }

        if (Array.isArray(photos) && photos.length > 0) {
          // Ensure absolute URLs for images served from backend
          photos = photos.map(p => p && p.startsWith('http') ? p : `https://sobsob.onrender.com${p}`);
          photosHTML = photos.map(p => `<img src="${p}" class="review-photo" alt="Review photo">`).join("");
        }
      }

      // Format date
      const date = new Date(review.created_at);
      const dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Star rating
      const stars = "⭐".repeat(review.rating) + "☆".repeat(5 - review.rating);

      div.innerHTML = `
        <div class="review-header">
          <div>
            <div class="review-cafe-name">${review.cafe_name || "Unknown Cafe"}</div>
            <div class="review-date">${dateStr}</div>
          </div>
        </div>
        <div class="review-rating">${stars} ${review.rating}/5</div>
        <div class="review-text">${review.text || "(No text)"}</div>
        ${photosHTML ? `<div class="review-photos">${photosHTML}</div>` : ""}
        <div class="review-actions">
          <button class="review-btn review-edit-btn" data-id="${review.id}">Edit</button>
          <button class="review-btn review-delete-btn" data-id="${review.id}">Delete</button>
          <button class="review-btn review-like-btn" data-id="${review.id}" style="padding:6px 12px;background:#f0f0f0;border:1px solid #ddd;border-radius:4px;cursor:pointer;font-size:14px;transition:all 0.2s;">
            ❤️ <span class="review-like-count" data-id="${review.id}">0</span>
          </button>
        </div>
      `;

      reviewsList.appendChild(div);
    });

    // Attach event listeners
    attachReviewListeners();
  } catch (err) {
    console.error("Error loading reviews:", err);
    reviewsList.innerHTML = '<div class="no-reviews">Failed to load reviews. Please try again.</div>';
  }
}

// ======================== REVIEW ACTIONS ======================== //
function attachReviewListeners() {
  const editBtns = document.querySelectorAll(".review-edit-btn");
  const deleteBtns = document.querySelectorAll(".review-delete-btn");
  const likeBtns = document.querySelectorAll(".review-like-btn");

  // Attach like handlers
  likeBtns.forEach(btn => {
    const reviewId = btn.dataset.id;
    
    // Fetch like count
    fetch(`https://sobsob.onrender.com/api/reviews/${reviewId}/likes`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const count = data.likes?.length || 0;
          const countEl = document.querySelector(`.review-like-count[data-id="${reviewId}"]`);
          if (countEl) countEl.textContent = count;
        }
      })
      .catch(err => console.error('Failed to fetch likes', err));
    
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!token) return alert('Login to like reviews');
      
      const isLiked = btn.classList.contains('liked');
      const method = isLiked ? 'DELETE' : 'POST';
      const url = `https://sobsob.onrender.com/api/reviews/${reviewId}/like`;
      
      try {
        const res = await fetch(url, {
          method,
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          btn.classList.toggle('liked');
          const countEl = document.querySelector(`.review-like-count[data-id="${reviewId}"]`);
          if (countEl) countEl.textContent = data.likes || 0;
        } else {
          alert('Failed to update like');
        }
      } catch (err) {
        console.error('Error toggling like', err);
      }
    });
  });

  editBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const reviewId = btn.dataset.id;
      const reviewCard = btn.closest(".review-card");
      const textElement = reviewCard.querySelector(".review-text");
      const ratingElement = reviewCard.querySelector(".review-rating");

      // Extract current rating
      const starMatch = ratingElement.textContent.match(/(\d)\/5/);
      const currentRating = starMatch ? parseInt(starMatch[1]) : 0;

      // Create edit form
      const editHTML = `
        <div class="edit-form">
          <textarea id="edit-text-${reviewId}" placeholder="Edit your review...">${textElement.textContent}</textarea>
          <div style="margin: 1rem 0;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Rating:</label>
            <div id="edit-rating-${reviewId}" style="display: flex; gap: 0.5rem; font-size: 24px;">
              ${[1, 2, 3, 4, 5].map(i => `<span class="edit-star" data-value="${i}" style="cursor: pointer; opacity: ${i <= currentRating ? 1 : 0.3};">⭐</span>`).join("")}
            </div>
          </div>
          <div style="display: flex; gap: 0.8rem;">
            <button class="review-btn review-edit-btn" id="save-edit-${reviewId}" style="background: var(--warm-orange); color: #fff;">Save</button>
            <button class="review-btn" id="cancel-edit-${reviewId}" style="background: #ccc; color: #333;">Cancel</button>
          </div>
        </div>
      `;

      // Replace review content with edit form
      const actionsDiv = reviewCard.querySelector(".review-actions");
      reviewCard.insertBefore((() => {
        const div = document.createElement("div");
        div.innerHTML = editHTML;
        return div.firstElementChild;
      })(), actionsDiv);

      // Hide original content
      textElement.style.display = "none";
      ratingElement.style.display = "none";
      actionsDiv.style.display = "none";

      // Rating selection
      let selectedRating = currentRating;
      const stars = document.querySelectorAll(`#edit-rating-${reviewId} .edit-star`);
      stars.forEach(star => {
        star.addEventListener("click", () => {
          selectedRating = parseInt(star.dataset.value);
          stars.forEach(s => {
            s.style.opacity = parseInt(s.dataset.value) <= selectedRating ? 1 : 0.3;
          });
        });
      });

      // Save edit
      document.getElementById(`save-edit-${reviewId}`).addEventListener("click", async () => {
        const newText = document.getElementById(`edit-text-${reviewId}`).value;

        try {
          const res = await fetch(`${API_URL}/profile/reviews/${reviewId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              text: newText,
              rating: selectedRating
            })
          });

          if (!res.ok) throw new Error("Failed to update review");

          alert("Review updated!");
          loadReviews();
        } catch (err) {
          console.error("Error updating review:", err);
          alert("Failed to update review. Please try again.");
        }
      });

      // Cancel edit
      document.getElementById(`cancel-edit-${reviewId}`).addEventListener("click", () => {
        const editForm = reviewCard.querySelector(".edit-form");
        editForm.remove();
        textElement.style.display = "";
        ratingElement.style.display = "";
        actionsDiv.style.display = "";
      });
    });
  });

  deleteBtns.forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete this review?")) return;

      const reviewId = btn.dataset.id;

      try {
        const res = await fetch(`${API_URL}/profile/reviews/${reviewId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to delete review");

        alert("Review deleted!");
        loadReviews();
      } catch (err) {
        console.error("Error deleting review:", err);
        alert("Failed to delete review. Please try again.");
      }
    });
  });
}

// ======================== LOGOUT ======================== //
logoutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  window.location.href = "/frontend/views/login.html";
});

// ======================== INIT ======================== //
loadProfile();
loadReviews();
