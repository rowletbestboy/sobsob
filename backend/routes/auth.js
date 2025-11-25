const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// public
router.post('/register', authController.register);
router.post('/login', authController.login);

// protected
router.get('/me', authMiddleware, authController.me);
router.put('/update', authMiddleware, authController.updateProfile);

// multer for profile pic uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ensure folder exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'profile_pics');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

router.post('/upload-pic', authMiddleware, upload.single('profile_pic'), authController.uploadProfilePic);

module.exports = router;
