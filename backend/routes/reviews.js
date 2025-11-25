const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Multer setup
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split('.').pop();
    cb(null, `review-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Helper to prefix local uploads with absolute URL
function ensureAbsoluteUrl(p) {
  if (!p) return null;
  // If already absolute, return as-is.
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  // For local uploads (paths starting with '/'), return the relative path
  // so the browser will request the resource from the same origin.
  return p;
}

// Create likes table if missing (safe to call multiple times)
async function ensureLikesTable() {
  await db.query(`CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(review_id, user_id)
  )`);
}

// POST create review
router.post('/', authMiddleware, upload.array('photos', 5), async (req, res) => {
  const { cafeId, reviewText, rating } = req.body;
  if (!cafeId || !reviewText || !rating) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const photoPaths = (req.files || []).map(f => `/uploads/${f.filename}`);

  try {
    const photosJson = photoPaths.length > 0 ? JSON.stringify(photoPaths) : null;
    const result = await db.query(
      `INSERT INTO reviews (user_id, cafe_id, text, rating, photo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, cafe_id, text, rating, photo, created_at`,
      [req.user.userId, cafeId, reviewText, rating, photosJson]
    );

    res.status(201).json({ message: 'Review posted successfully', review: result.rows[0] });
  } catch (err) {
    console.error('Review Insert Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET reviews for a cafe (include reviewer info)
router.get('/cafe/:cafeId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.name AS username, u.profile_pic AS user_profile_pic, u.id AS user_id
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE cafe_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.cafeId]
    );

    const rows = result.rows.map(r => ({
      ...r,
      photo: r.photo ? JSON.parse(r.photo).map(p => ensureAbsoluteUrl(p)) : [],
      user_profile_pic: ensureAbsoluteUrl(r.user_profile_pic)
    }));

    res.json(rows);
  } catch (err) {
    console.error('Get Cafe Reviews Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET reviews by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, c.name AS cafe_name
       FROM reviews r
       LEFT JOIN cafes c ON r.cafe_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.userId]
    );

    const rows = result.rows.map(r => ({
      ...r,
      photo: r.photo ? JSON.parse(r.photo).map(p => ensureAbsoluteUrl(p)) : []
    }));

    res.json({ reviews: rows });
  } catch (err) {
    console.error('Get User Reviews Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET current user's reviews
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, c.name AS cafe_name
       FROM reviews r
       LEFT JOIN cafes c ON r.cafe_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.userId]
    );

    const rows = result.rows.map(r => ({
      ...r,
      photo: r.photo ? JSON.parse(r.photo).map(p => ensureAbsoluteUrl(p)) : []
    }));

    res.json(rows);
  } catch (err) {
    console.error('Get My Reviews Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE review
router.put('/:reviewId', authMiddleware, upload.array('photos', 5), async (req, res) => {
  try {
    const check = await db.query(`SELECT * FROM reviews WHERE id = $1 AND user_id = $2`, [req.params.reviewId, req.user.userId]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Not authorized to edit this review.' });

    const { reviewText, rating } = req.body;
    const photoPaths = (req.files || []).map(f => `/uploads/${f.filename}`);

    const photoToStore = photoPaths.length > 0 ? JSON.stringify(photoPaths) : check.rows[0].photo;

    const result = await db.query(
      `UPDATE reviews SET text = $1, rating = $2, photo = $3 WHERE id = $4 RETURNING *`,
      [reviewText || check.rows[0].text, rating || check.rows[0].rating, photoToStore, req.params.reviewId]
    );

    res.json({ message: 'Review updated successfully', review: result.rows[0] });
  } catch (err) {
    console.error('Update Review Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// LIKE a review
router.post('/:reviewId/like', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const reviewId = req.params.reviewId;
  try {
    await ensureLikesTable();

    const exists = await db.query(`SELECT id FROM likes WHERE review_id = $1 AND user_id = $2`, [reviewId, userId]);
    if (exists.rows.length > 0) return res.status(400).json({ error: 'Already liked' });

    await db.query(`INSERT INTO likes (review_id, user_id) VALUES ($1, $2)`, [reviewId, userId]);

    // create notification for review owner
    const ownerRes = await db.query(`SELECT user_id FROM reviews WHERE id = $1`, [reviewId]);
    if (ownerRes.rows.length) {
      const ownerId = ownerRes.rows[0].user_id;
      if (ownerId !== userId) { // Don't notify if user likes their own review
        const liker = await db.query(`SELECT id, name, profile_pic FROM users WHERE id = $1`, [userId]);
        const likerName = liker.rows[0]?.name || 'Someone';
        const message = `${likerName} liked your review.`;
        try {
          await db.query(`INSERT INTO notifications (user_id, message) VALUES ($1, $2)`, [ownerId, message]);
          console.log(`Created notification for user ${ownerId}`);
        } catch (notifErr) {
          console.error('Failed to create notification:', notifErr.message);
        }
      }
    }

    const countRes = await db.query(`SELECT COUNT(*) FROM likes WHERE review_id = $1`, [reviewId]);
    res.json({ message: 'Liked', likes: Number(countRes.rows[0].count) });
  } catch (err) {
    console.error('Like Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UNLIKE a review
router.delete('/:reviewId/like', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const reviewId = req.params.reviewId;
  try {
    await db.query(`DELETE FROM likes WHERE review_id = $1 AND user_id = $2`, [reviewId, userId]);
    const countRes = await db.query(`SELECT COUNT(*) FROM likes WHERE review_id = $1`, [reviewId]);
    res.json({ message: 'Unliked', likes: Number(countRes.rows[0].count) });
  } catch (err) {
    console.error('Unlike Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET users who liked a review
router.get('/:reviewId/likes', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.profile_pic, l.created_at
       FROM likes l
       JOIN users u ON l.user_id = u.id
       WHERE l.review_id = $1
       ORDER BY l.created_at DESC`,
      [req.params.reviewId]
    );

    const rows = result.rows.map(r => ({ ...r, profile_pic: ensureAbsoluteUrl(r.profile_pic) }));
    res.json({ likes: rows });
  } catch (err) {
    console.error('Get Likes Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE review
router.delete('/:reviewId', authMiddleware, async (req, res) => {
  try {
    const check = await db.query(`SELECT * FROM reviews WHERE id = $1 AND user_id = $2`, [req.params.reviewId, req.user.userId]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Not authorized to delete this review.' });

    await db.query(`DELETE FROM reviews WHERE id = $1`, [req.params.reviewId]);
    res.json({ message: 'Review deleted successfully.' });
  } catch (err) {
    console.error('Delete Review Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
