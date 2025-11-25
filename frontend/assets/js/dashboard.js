document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
});

// ---------------------
// Initialize dashboard
// ---------------------
async function initDashboard() {
  const token = localStorage.getItem("token");
  if (!token) return redirectToLogin();

  const userVerified = await verifySession(token);
  if (!userVerified) return redirectToLogin();

  window.currentUser = JSON.parse(localStorage.getItem("user"));

  setupLogout();
  loadCafes(); // Only feature we want for now
}

// ---------------------
function redirectToLogin() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/frontend/views/login.html";
}

// ---------------------
async function verifySession(token) {
  try {
    const res = await fetch("https://sobsob.onrender.com/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return false;

    const data = await res.json();
    return !!data.id;

  } catch (err) {
    console.error(err);
    return false;
  }
}

// ---------------------
function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/frontend/views/login.html";
  });
}

// ---------------------
// Café cards (static data for local testing)
// ---------------------
function loadCafes() {
  const container = document.querySelector(".cafe-grid");
  if (!container) return;

  container.innerHTML = ""; // Clear container

  const cafes = [
    { id: 1, name: "Brewngan",
       description: "Cozy spot with classic brews near the bay.",
       icon: "../assets/img/cafes/brewnganlogo.jpg"
       },
    { id: 2, name: "Cafe Bon",
       description: "Pastas? Pastries? Food? We have it all!",
        icon: "../assets/img/cafes/cafebonlogo.jpg" 
      },
    { id: 3, name: "Surf and Turf",
       description: "One of the best in the city — and we serve coffee too!",
        icon: "../assets/img/cafes/surflogo.jpg" 
      },
    { id: 4, name: "Backdoor Coffee",
       description: "Come and chill after a long ride.",
        icon: "../assets/img/cafes/backdoorlogo.jpg" 
      },
    { id: 5, name: "Bistro Gang",
       description: "For your late-night study sessions.",
        icon: "../assets/img/cafes/bistrologo.jpg" 
      },
    { id: 6, name: "Bo's Coffee",
       description: "Your nationwide coffee craze!",
        icon: "../assets/img/cafes/boslogo.jpg" 
      },
    { id: 7, name: "Brew and Bistro",
       description: "Good music and great coffee awaits you!",
        icon: "../assets/img/cafes/brewandbistrologo.jpg" 
      },
    { id: 8, name: "Brewers Best",
       description: "Comfort is our top priority.",
        icon: "../assets/img/cafes/brewerslogo.jpg" 
      },
    { id: 9, name: "Dirty Grinder Coffee",
       description: "Chill with dim lights and music.",
        icon: "../assets/img/cafes/dirtylogo.jpg" 
      },
    { id: 10, name: "Growing Grounds",
       description: "Where coffee meets greenery.",
        icon: "../assets/img/cafes/growinglogo.jpg" 
      },
    { id: 11, name: "Kapehan",
       description: "Resort + Restaurant + Coffee.",
        icon: "../assets/img/cafes/kapehanlogo.jpg" 
      },
    { id: 12, name: "Thirdtry Coffee",
       description: "Live the Instagram café aesthetic.",
        icon: "../assets/img/cafes/thirdtrylogo.jpg" 
      }
  ];

  cafes.forEach(cafe => {
    const div = document.createElement("div");
    div.className = "cafe-card";

    div.innerHTML = `
      <img src="${cafe.icon || '../img/default-cafe.jpg'}" alt="${cafe.name}">
      <h3>${cafe.name}</h3>
      <p>${cafe.description}</p>
      <button class="view-btn">View Cafe</button>
    `;

    container.appendChild(div);

    div.querySelector(".view-btn").addEventListener("click", () => {
      window.location.href = `cafe.html?id=${cafe.id}`;
    });
  });
}
