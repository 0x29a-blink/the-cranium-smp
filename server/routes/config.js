/**
 * Configuration API routes
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { checkAuth } = require('../middleware/auth');

// Config file path
const configPath = path.join(__dirname, '../config.json');

// Default configuration
const defaultConfig = {
  mainProjectId: null,
  githubPagesEnabled: true
};

// Helper function to read config
function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }
    return defaultConfig;
  } catch (error) {
    console.error('Error reading config:', error);
    return defaultConfig;
  }
}

// Helper function to write config
function writeConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing config:', error);
    return false;
  }
}

// Get configuration
router.get('/', checkAuth, (req, res) => {
  const config = readConfig();
  res.json(config);
});

// Update configuration
router.post('/', checkAuth, (req, res) => {
  try {
    const { mainProjectId, githubPagesEnabled } = req.body;
    const config = readConfig();
    
    if (mainProjectId !== undefined) {
      config.mainProjectId = mainProjectId;
    }
    
    if (githubPagesEnabled !== undefined) {
      config.githubPagesEnabled = githubPagesEnabled;
    }
    
    if (writeConfig(config)) {
      res.json({ success: true, config });
    } else {
      res.status(500).json({ success: false, message: 'Failed to save configuration' });
    }
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
