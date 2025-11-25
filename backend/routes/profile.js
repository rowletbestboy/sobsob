const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// ---------- MULTER CONFIG ---------- //
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });



// ---------- GET MY PROFILE ---------- //
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, bio, location, contact, profile_pic FROM users WHERE id = $1',
      [req.user.userId]
    );

    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- GET MY REVIEWS ---------- //
router.get('/reviews', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.cafe_id, r.text, r.rating, r.photo, r.created_at, c.name as cafe_name
       FROM reviews r
       LEFT JOIN cafes c ON r.cafe_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.userId]
    );

    // Normalize photo field to array of absolute URLs
    const rows = result.rows.map(r => {
      let photos = [];
      if (r.photo) {
        try {
          photos = JSON.parse(r.photo);
        } catch (e) {
          // if already an array-like string or malformed, skip
          photos = Array.isArray(r.photo) ? r.photo : [];
        }
      }
      photos = photos.map(p => p && p.startsWith('http') ? p : `http://localhost:4000${p}`);
      return { ...r, photo: photos };
    });

    res.json({ reviews: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- GET OTHER USER'S PROFILE (PUBLIC) ---------- //
router.get('/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const result = await db.query(
      'SELECT id, name, email, bio, location, contact, profile_pic FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- UPDATE A REVIEW ---------- //
router.put('/reviews/:id', authMiddleware, async (req, res) => {
  const { text, rating } = req.body;

  try {
    await db.query(
      `UPDATE reviews
       SET text = $1, rating = $2
       WHERE id = $3 AND user_id = $4`,
      [text, rating, req.params.id, req.user.userId]
    );

    res.json({ message: 'Review updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- DELETE A REVIEW ---------- //
router.delete('/reviews/:id', authMiddleware, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM reviews
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.userId]
    );

    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
