document.addEventListener('DOMContentLoaded', async () => {
  // Auto-redirect if already logged in
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const res = await fetch('https://sobsob.onrender.com/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) window.location.href = '/frontend/views/dashboard.html';
    } catch (err) { console.error(err); }
  }
});

const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = registerForm.name.value.trim();
  const email = registerForm.email.value.trim();
  const password = registerForm.password.value;

  if (!name || !email || !password) return alert('Please fill in all fields.');

  try {
    const res = await fetch('https://sobsob.onrender.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    // Save token and user automatically (optional)
    // localStorage.setItem('token', data.token); // uncomment if backend sends token
    // localStorage.setItem('user', JSON.stringify(data.user));

    alert(data.message || 'User registered successfully!');
    window.location.href = '/frontend/views/login.html';
  } catch (err) {
    console.error('Register error:', err);
    alert(err.message || 'Server error.');
  }
});
