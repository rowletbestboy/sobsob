const db = require('./db');

(async () => {
  try {
    const res = await db.query('SELECT NOW()');
    console.log('Database connected! Time:', res.rows[0]);
  } catch (err) {
    console.error('DB connection error:', err);
  } finally {
    db.pool.end();
  }
})();
