/**
 * Authentication middleware
 */

/**
 * Check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function checkAuth(req, res, next) {
  console.log(`[${new Date().toISOString()}] Auth check for ${req.path}, session:`, {
    id: req.session.id,
    authenticated: req.session.authenticated === true
  });

  if (req.session && req.session.authenticated === true) {
    return next();
  }
  
  console.log(`[${new Date().toISOString()}] Unauthorized access attempt:`, req.path);
  res.status(401).json({ error: 'Authentication required' });
}

module.exports = {
  checkAuth
};
