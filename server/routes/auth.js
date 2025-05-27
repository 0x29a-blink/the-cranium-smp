const express = require('express');
const router = express.Router();

/**
 * POST /api/auth/login
 * Login with admin key
 */
router.post('/login', (req, res) => {
  const { adminKey } = req.body;
  
  console.log(`[${new Date().toISOString()}] Login attempt received`);
  
  if (!adminKey) {
    console.log(`[${new Date().toISOString()}] Login failed: No admin key provided`);
    return res.status(400).json({ error: 'Admin key is required' });
  }
  
  // Check if admin key is valid
  if (adminKey === process.env.ADMIN_KEY) {
    console.log(`[${new Date().toISOString()}] Login successful: Session authenticated`);
    
    // Set session as authenticated
    req.session.authenticated = true;
    req.session.loginTime = Date.now();
    
    // Explicitly save the session and wait for it to complete
    req.session.save((err) => {
      if (err) {
        console.error(`[${new Date().toISOString()}] Session save error:`, err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      console.log(`[${new Date().toISOString()}] Session saved successfully with ID: ${req.session.id}`);
      return res.json({ success: true });
    });
  } else {
    console.log(`[${new Date().toISOString()}] Login failed: Invalid admin key provided`);
    res.status(401).json({ error: 'Invalid admin key' });
  }
});

/**
 * POST /api/auth/logout
 * Logout and destroy session
 */
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

/**
 * GET /api/auth/status
 * Check if user is authenticated
 */
router.get('/status', (req, res) => {
  console.log(`[${new Date().toISOString()}] Auth status check, session:`, {
    id: req.session.id,
    authenticated: req.session.authenticated === true,
    loginTime: req.session.loginTime || 'not set'
  });
  
  res.json({ authenticated: req.session.authenticated === true });
});

module.exports = router;
