const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all reviews for a café
router.get("/cafe/:cafeId", async (req, res) => {
  try {
    const { cafeId } = req.params;

    const result = await db.query(
      `SELECT r.*, u.username 
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE cafe_id = $1
       ORDER BY created_at DESC`,
      [cafeId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error loading reviews:", err);
    res.status(500).json({ error: "Failed to load reviews" });
  }
});

// POST a new review
router.post("/", async (req, res) => {
  try {
    const { user_id, cafe_id, text, rating, photo } = req.body;

    const result = await db.query(
      `INSERT INTO reviews (user_id, cafe_id, text, rating, photo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, cafe_id, text, rating, photo]
    );

    res.json({ message: "Review added!", review: result.rows[0] });
  } catch (err) {
    console.error("Error posting review:", err);
    res.status(500).json({ error: "Failed to post review" });
  }
});

module.exports = router;
