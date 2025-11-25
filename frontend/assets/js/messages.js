const API_BASE = 'https://sob-c30g.onrender.com/api';
const token = localStorage.getItem('token');
const currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
const currentUserId = currentUser?.id;

if (!token) {
  alert('Please login first');
  window.location.href = '/frontend/views/login.html';
}

const friendsList = document.getElementById('friendsList');
const messagesChat = document.querySelector('.messages-chat');
const logoutBtn = document.getElementById('logoutBtn');
let selectedFriendId = null;
let autoRefreshInterval = null;

logoutBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/frontend/views/login.html';
});

async function loadFriends() {
  try {
    const res = await fetch(`${API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to load conversations');

    const conversations = await res.json();
    friendsList.innerHTML = '';

    if (conversations.length === 0) {
      friendsList.innerHTML = '<li class="no-conversations">No friends yet. Go add some!</li>';
      return;
    }

    conversations.forEach(conv => {
      const li = document.createElement('li');
      li.className = 'message-item';
      li.dataset.friendId = conv.friend_id;

      const avatar = document.createElement('img');
      avatar.src = conv.profile_pic || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23ddd" width="100" height="100"/><circle cx="50" cy="35" r="20" fill="%23999"/><path d="M50 60 Q30 75 20 90 L80 90 Q70 75 50 60" fill="%23999"/></svg>';
      avatar.className = 'message-item-avatar';

      const info = document.createElement('div');
      info.className = 'message-item-info';

      const name = document.createElement('div');
      name.className = 'message-item-name';
      name.textContent = conv.name;

      info.appendChild(name);

      li.appendChild(avatar);
      li.appendChild(info);

      if (conv.unread_count > 0) {
        const badge = document.createElement('div');
        badge.className = 'message-item-badge';
        badge.textContent = conv.unread_count > 99 ? '99+' : conv.unread_count;
        li.appendChild(badge);
      }

      li.addEventListener('click', () => openChat(conv.friend_id, conv.name));
      friendsList.appendChild(li);
    });
  } catch (err) {
    console.error('Error loading friends:', err);
    friendsList.innerHTML = '<li class="no-conversations">Error loading conversations</li>';
  }
}

async function openChat(friendId, friendName) {
  selectedFriendId = friendId;

  // Update UI
  document.querySelectorAll('.message-item').forEach(item => item.classList.remove('active'));
  document.querySelector(`[data-friend-id="${friendId}"]`)?.classList.add('active');

  // Load chat
  await loadChatHistory(friendId);

  // Render chat UI
  renderChatWindow(friendId, friendName);

  // Clear auto-refresh interval if exists
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);

  // Auto-refresh chat every 2 seconds
  autoRefreshInterval = setInterval(() => {
    if (selectedFriendId === friendId) {
      loadChatHistory(friendId);
    }
  }, 2000);
}

let chatMessages = [];

async function loadChatHistory(friendId) {
  try {
    const res = await fetch(`${API_BASE}/messages/conversation/${friendId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to load chat');

    chatMessages = await res.json();
    if (messagesChat && selectedFriendId === friendId) {
      renderChatMessages();
    }
  } catch (err) {
    console.error('Error loading chat:', err);
  }
}

function renderChatWindow(friendId, friendName) {
  messagesChat.innerHTML = `
    <div class="messages-chat-header">
      <span>${friendName}</span>
      <button class="close-chat" onclick="closeMobileChat()">×</button>
    </div>
    <div class="messages-chat-body" id="chatBody">
      <!-- Messages will be rendered here -->
    </div>
    <div class="messages-chat-footer">
      <input type="text" id="messageInput" placeholder="Type a message..." />
      <button id="sendBtn">Send</button>
    </div>
  `;

  renderChatMessages();

  // Attach send button listener
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

function renderChatMessages() {
  const chatBody = document.getElementById('chatBody');
  if (!chatBody) return;

  chatBody.innerHTML = '';

  chatMessages.forEach(msg => {
    const div = document.createElement('div');
    div.className = `message-bubble ${msg.sender_id === currentUserId ? 'own' : 'other'}`;

    const time = new Date(msg.created_at);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
      <div class="bubble">${escapeHtml(msg.text)}</div>
      <div class="message-time">${timeStr}</div>
    `;

    chatBody.appendChild(div);
  });

  // Auto-scroll to bottom
  chatBody.scrollTop = chatBody.scrollHeight;
}

async function sendMessage() {
  if (!selectedFriendId) return;

  const input = document.getElementById('messageInput');
  const text = input.value.trim();

  if (!text) return;

  try {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        receiverId: selectedFriendId,
        text
      })
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to send message');
      return;
    }

    input.value = '';
    await loadChatHistory(selectedFriendId);
    renderChatMessages();
  } catch (err) {
    console.error('Error sending message:', err);
    alert('Failed to send message');
  }
}

function closeMobileChat() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  selectedFriendId = null;
  messagesChat.innerHTML = `
    <div class="messages-empty">
      <p>Select a friend to start chatting</p>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Load friends on page load
loadFriends();
