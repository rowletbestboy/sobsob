const express = require('express');
const db = require('../db');

const router = express.Router();

// ------------------------
// GET all cafes
// ------------------------
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM cafes ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ------------------------
// GET single cafe by ID
// ------------------------
router.get('/:id', async (req, res) => {
  try {
    const cafeId = req.params.id;
    const result = await db.query(
      'SELECT * FROM cafes WHERE id=$1',
      [cafeId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Cafe not found' });
    }

    const cafe = result.rows[0];
    cafe.images = cafe.images || [];

    res.json(cafe);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
