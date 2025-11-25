require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth');
const cafeRoutes = require('./routes/cafes');
const reviewRoutes = require('./routes/reviews');
const postRoutes = require('./routes/posts');
const notificationRoutes = require('./routes/notifications');
const profileRoutes = require('./routes/profile');
const friendRoutes = require('./routes/friends');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 4000;

// Run migrations on startup
async function runMigrations() {
  try {
    // If there is a migrations.sql file, run it first to create base tables
    const fs = require('fs');
    const migrationsPath = path.join(__dirname, 'migrations.sql');
    if (fs.existsSync(migrationsPath)) {
      try {
        const sql = fs.readFileSync(migrationsPath, 'utf8');
        if (sql && sql.trim().length > 0) {
          console.log('Running migrations.sql...');
          await db.query(sql);
          console.log('Base migrations applied from migrations.sql');
        }
      } catch (mErr) {
        console.error('Error executing migrations.sql (continuing):', mErr.message || mErr);
      }
    }
    // Ensure notifications table exists
    await db.query(`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )`);
    console.log('Notifications table ready');

    // Ensure friends table exists
    await db.query(`CREATE TABLE IF NOT EXISTS friends (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(user_id, friend_id),
      CHECK(user_id != friend_id)
    )`);
    console.log('Friends table ready');

    // Ensure messages table exists
    await db.query(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )`);
    console.log('Messages table ready');
  } catch (err) {
    console.error('Migration error (non-fatal):', err);
    console.error('Continuing startup — some DB features may not work until the database is available.');
  }
}

// ------------------------------
// Middleware (MUST be before routes)
// ------------------------------
app.use(helmet({
	crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow cross-origin resource access
}));

// Enable CORS for your frontend
const corsOptions = {
	origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:4000', 'https://sobsob.onrender.com'],
	credentials: true,
	methods: ['GET','POST','DELETE','PUT','PATCH','OPTIONS'],
	allowedHeaders: ['Content-Type','Authorization']
};
app.use(cors(corsOptions));

// Allow large JSON payloads (for testing / API use)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve uploaded review images with explicit CORS headers
app.use('/uploads', cors(corsOptions), express.static(path.join(__dirname, 'uploads')));

// Serve frontend
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

// ------------------------------
// Routes (after middleware)
// ------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/cafes', cafeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);

// ------------------------------
// Health check
// ------------------------------
app.get('/', (req, res) => {
res.json({ ok: true, message: "Server is running", time: new Date() });
});

// Start server after migrations complete
async function startServer() {
  await runMigrations();
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Handle connection errors
  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  console.error('Stack:', reason?.stack);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Stack:', err?.stack);
  process.exit(1);
});

// Start server with error handling
startServer().catch(err => {
  console.error('Fatal error during startup:', err);
  console.error('Stack:', err?.stack);
  process.exit(1);
});
