const express = require('express');
const path = require('path');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const multer = require('multer');
const dotenv = require('dotenv');
const fs = require('fs');

// Import utilities
const configUtils = require('./utils/configUtils');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const modlistRoutes = require('./routes/modlists');
const changelogRoutes = require('./routes/changelogs');
const exportRoutes = require('./routes/exports');
const configRoutes = require('./routes/config');

// Ensure all required directories exist
configUtils.ensureDirectories();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Dynamic destination based on project
    const projectId = req.params.projectId;
    const projectDir = configUtils.getProjectDir(projectId);
    
    if (!fs.existsSync(projectDir)) {
      console.log(`Creating project directory: ${projectDir}`);
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    cb(null, projectDir);
  },
  filename: function (req, file, cb) {
    // Use timestamp to ensure unique filenames
    const timestamp = Date.now();
    console.log(`Generating filename for upload: modlist-${timestamp}.json`);
    cb(null, `modlist-${timestamp}.json`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('Received file:', file.originalname, 'mimetype:', file.mimetype);
    // Accept JSON files or text files (cfmod.json might be sent as text/plain)
    if (file.mimetype === 'application/json' || 
        file.mimetype === 'text/plain' || 
        file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up session with file store for persistence across browsers
app.use(session({
  store: new FileStore({ 
    path: configUtils.SESSIONS_DIR,
    ttl: 86400, // Session TTL in seconds (24 hours)
    retries: 0
  }),
  secret: process.env.SESSION_SECRET || 'cranium-secret-key',
  resave: true,
  saveUninitialized: true,
  cookie: { 
    secure: false, // Set to true only in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  },
  name: 'cranium.sid'
}));

// Import authentication middleware
const { checkAuth } = require('./middleware/auth');

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log the incoming request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  // After the response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', checkAuth, projectRoutes);
app.use('/api/modlists', checkAuth, modlistRoutes);
app.use('/api/changelogs', checkAuth, changelogRoutes);
app.use('/api/exports', checkAuth, exportRoutes);
app.use('/api/config', checkAuth, configRoutes);

// Make upload middleware available to routes
app.locals.upload = upload;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err.stack);
  
  // Check if the request was an API call
  const isApiRequest = req.path.startsWith('/api/');
  
  if (isApiRequest) {
    // Return JSON error for API requests
    return res.status(500).json({ 
      error: err.message || 'Something went wrong!' 
    });
  }
  
  // For regular requests, redirect to the error page
  const errorMessage = encodeURIComponent(err.message || 'Something went wrong!');
  return res.redirect(`/error.html?error=${errorMessage}`);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
