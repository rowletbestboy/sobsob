const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// GET notifications for logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching notifications for user:', req.user.userId);
    const result = await db.query(
      `SELECT id, message, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
    );
    console.log('Notifications found:', result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error('Notifications fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DEBUG: Get all notifications in the database
router.get('/debug/all', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM notifications ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Debug query error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a notification (mark as read by deleting)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    // ensure notification belongs to user
    const check = await db.query(`SELECT * FROM notifications WHERE id = $1 AND user_id = $2`, [id, req.user.userId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });

    await db.query(`DELETE FROM notifications WHERE id = $1`, [id]);
    res.json({ message: 'Notification removed' });
  } catch (err) {
    console.error('Delete notification error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
