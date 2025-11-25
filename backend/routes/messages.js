const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// POST send a message
router.post('/', authMiddleware, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, text } = req.body;

    if (!receiverId || !text || text.trim() === '') {
      return res.status(400).json({ error: 'Receiver and message text required' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    // Verify receiver exists
    const receiverCheck = await db.query('SELECT id FROM users WHERE id = $1', [receiverId]);
    if (receiverCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify they are friends
    const friendCheck = await db.query(
      `SELECT id FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [senderId, receiverId]
    );
    if (friendCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You can only message friends' });
    }

    // Insert message
    const result = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, text, created_at)
       VALUES ($1, $2, $3, now())
       RETURNING *`,
      [senderId, receiverId, text.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET conversation with a friend (chat history)
router.get('/conversation/:friendId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId);

    // Verify they are friends
    const friendCheck = await db.query(
      `SELECT id FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );
    if (friendCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not friends' });
    }

    // Get all messages between the two users, ordered by date
    const result = await db.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [userId, friendId]
    );

    // Mark messages as read
    await db.query(
      `UPDATE messages SET is_read = true WHERE receiver_id = $1 AND sender_id = $2`,
      [userId, friendId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all conversations (list of friends with unread count)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT DISTINCT 
         CASE 
           WHEN f.user_id = $1 THEN u.id
           ELSE f.user_id
         END as friend_id,
         u.name,
         u.profile_pic,
         (SELECT COUNT(*) FROM messages WHERE sender_id = (CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END) AND receiver_id = $1 AND is_read = false) as unread_count,
         (SELECT created_at FROM messages WHERE (sender_id = $1 AND receiver_id = (CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END)) OR (sender_id = (CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END) AND receiver_id = $1) ORDER BY created_at DESC LIMIT 1) as last_message_time
       FROM friends f
       JOIN users u ON (f.user_id = $1 AND u.id = f.friend_id) OR (f.friend_id = $1 AND u.id = f.user_id)
       WHERE f.user_id = $1 OR f.friend_id = $1
       ORDER BY last_message_time DESC NULLS LAST`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE message
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.messageId;

    const result = await db.query(
      `DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING *`,
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found or not yours' });
    }

    res.json({ message: 'Message deleted' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
