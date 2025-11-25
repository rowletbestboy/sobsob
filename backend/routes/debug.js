const express = require('express');
const router = express.Router();

// Echo endpoint for debugging request headers/body
router.post('/echo', (req, res) => {
  res.json({
    ok: true,
    message: 'echo',
    headers: req.headers,
    body: req.body
  });
});

module.exports = router;
