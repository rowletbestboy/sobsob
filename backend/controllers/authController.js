// backend/controllers/authController.js
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
const jwtSecret = process.env.JWT_SECRET || 'change_this';

// ===== Register new user =====
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password required' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await db.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, hashedPassword]
    );

    const user = result.rows[0];

    return res.status(201).json({
      message: 'User created successfully.',
      user
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ===== Login user =====
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const result = await db.query('SELECT id, name, email, password, profile_pic, bio, location, contact FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, jwtSecret, { expiresIn: '7d' });

    // return user fields (without password)
    return res.json({
      message: 'Logged in successfully.',
      token,
      user: { id: user.id, name: user.name, email: user.email, profile_pic: user.profile_pic, bio: user.bio, location: user.location, contact: user.contact }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ===== Get current logged-in user =====
exports.me = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId; // depends on token shape
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const result = await db.query('SELECT id, name, email, profile_pic, bio, location, contact, created_at FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('me error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ===== Update profile fields =====
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { name, bio, location, contact } = req.body;

    const result = await db.query(
      `UPDATE users SET name=$1, bio=$2, location=$3, contact=$4
       WHERE id=$5 RETURNING id, name, email, profile_pic, bio, location, contact`,
      [name, bio, location, contact, userId]
    );

    res.json({ message: 'Profile updated', user: result.rows[0] });
  } catch (err) {
    console.error('updateProfile error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// in controllers/authControllers.js - update uploadProfilePic
exports.uploadProfilePic = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // compute public url path to saved image
    const publicPath = `/uploads/profile_pics/${req.file.filename}`;

    // update user row
    const result = await db.query(
      `UPDATE users SET profile_pic=$1 WHERE id=$2 RETURNING id, name, email, profile_pic`,
      [publicPath, userId]
    );

    res.json({ message: 'Profile picture updated', url: publicPath, user: result.rows[0] });
  } catch (err) {
    console.error('uploadProfilePic error', err);
    res.status(500).json({ error: 'Server error' });
  }
};
