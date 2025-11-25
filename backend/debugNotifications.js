const db = require('./db');
require('dotenv').config();

(async () => {
  try {
    console.log('Checking notifications table...');
    const result = await db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10');
    console.log('Notifications found:', result.rows.length);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    db.pool.end();
  }
})();
