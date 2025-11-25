const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// GET user's friend list
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.profile_pic, u.bio, u.location, u.contact
       FROM friends f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET check if two users are friends
router.get('/check/:friendId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId);
    
    const result = await db.query(
      `SELECT id FROM friends WHERE user_id = $1 AND friend_id = $2`,
      [userId, friendId]
    );
    res.json({ isFriend: result.rows.length > 0 });
  } catch (err) {
    console.error('Check friend error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST add a friend
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.body;

    if (!friendId || friendId === userId) {
      return res.status(400).json({ error: 'Invalid friend ID' });
    }

    // Check if friend exists
    const friendCheck = await db.query('SELECT id, name FROM users WHERE id = $1', [friendId]);
    if (friendCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const friendName = friendCheck.rows[0].name;

    // Get current user name
    const userCheck = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
    const userName = userCheck.rows[0].name;

    // Insert friendship
    const result = await db.query(
      `INSERT INTO friends (user_id, friend_id, created_at)
       VALUES ($1, $2, now())
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [userId, friendId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Create notification for the friend
    try {
      await db.query(
        `INSERT INTO notifications (user_id, message, created_at)
         VALUES ($1, $2, now())`,
        [friendId, `${userName} added you as a friend.`]
      );
    } catch (notifErr) {
      console.error('Failed to create friend notification:', notifErr);
      // Don't fail the friend request if notification fails
    }

    res.status(201).json({ message: 'Friend added', friendship: result.rows[0] });
  } catch (err) {
    console.error('Add friend error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE remove a friend
router.delete('/:friendId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = parseInt(req.params.friendId);

    const result = await db.query(
      `DELETE FROM friends WHERE user_id = $1 AND friend_id = $2 RETURNING *`,
      [userId, friendId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    res.json({ message: 'Friend removed' });
  } catch (err) {
    console.error('Remove friend error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
