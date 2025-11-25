// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET || 'change_this';

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('Auth debug: No auth header provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtSecret);
    console.log('Auth debug: Decoded token user id:', decoded.id);
    // Normalize shape: provide userId for routes expecting req.user.userId
    req.user = {
      ...decoded,
      userId: decoded.id ?? decoded.userId ?? null,
      id: decoded.id ?? decoded.userId ?? null
    };
    next();
  } catch (err) {
    console.log('Auth debug: Token verification failed:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};
