const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const modUtils = require('../utils/modUtils');
const configUtils = require('../utils/configUtils');

/**
 * POST /api/modlists/:projectId/upload
 * Upload a new modlist to a project
 */
router.post('/:projectId/upload', (req, res, next) => {
  const { projectId } = req.params;
  
  console.log(`[${new Date().toISOString()}] Starting modlist upload for project ${projectId}`);
  
  // Use multer middleware for file upload first, then process the form data
  req.app.locals.upload.single('modlist')(req, res, async (err) => {
    if (err) {
      console.log(`[${new Date().toISOString()}] File upload error:`, err.message);
      return res.status(400).json({ error: err.message });
    }
    
    // Get form data after file is uploaded
    const { versionName, versionType } = req.body;
    
    console.log('Upload request received:', {
      projectId,
      versionName,
      versionType,
      file: req.file ? req.file.filename : 'No file',
      mimeType: req.file ? req.file.mimetype : 'N/A'
    });
    
    if (!versionName) {
      console.log(`[${new Date().toISOString()}] Upload failed: Version name is missing`);
      return res.status(400).json({ error: 'Version name is required' });
    }
    
    if (!['alpha', 'beta', 'release'].includes(versionType)) {
      console.log(`[${new Date().toISOString()}] Upload failed: Invalid version type: ${versionType}`);
      return res.status(400).json({ error: 'Version type must be alpha, beta, or release' });
    }
    
    if (!req.file) {
      console.log(`[${new Date().toISOString()}] Upload failed: No file uploaded in the request`);
      return res.status(400).json({ error: 'No file uploaded' });
    }
      try {
      const projectDir = configUtils.getProjectDir(projectId);
      const configPath = configUtils.getProjectConfigPath(projectId);
      
      // Check if project exists
      if (!fs.existsSync(projectDir) || !fs.existsSync(configPath)) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Read project configuration
      const projectConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // Read uploaded modlist
      const modlistContent = fs.readFileSync(req.file.path, 'utf8');
      let modlist;
      
      try {
        // Check if the file starts with a BOM character and remove it if present
        const content = modlistContent.charCodeAt(0) === 0xFEFF 
          ? modlistContent.slice(1) 
          : modlistContent;
          
        // Attempt to parse JSON, handling potential comments
        try {
          modlist = JSON.parse(content);
        } catch (e) {
          // Some JSON files might include comments, try to clean them
          const cleanedContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
          modlist = JSON.parse(cleanedContent);
          console.log(`[${new Date().toISOString()}] Successfully parsed JSON after removing comments`);
        }
      } catch (e) {
        console.error(`[${new Date().toISOString()}] JSON parsing error:`, e.message);
        return res.status(400).json({ error: `Invalid JSON file: ${e.message}` });
      }
      
      // Process modlist
      const processedModlist = await modUtils.processModlist(modlist);      // Create version directory
      const versionId = uuidv4();
      const versionsDir = configUtils.getVersionsDir(projectId);
      const versionDir = configUtils.getVersionDir(projectId, versionId);
      
      // Ensure both directories exist
      if (!fs.existsSync(versionsDir)) {
        console.log(`Creating versions directory: ${versionsDir}`);
        fs.mkdirSync(versionsDir, { recursive: true });
      }
      
      if (!fs.existsSync(versionDir)) {
        console.log(`Creating version directory: ${versionDir}`);
        fs.mkdirSync(versionDir, { recursive: true });
      }
      
      // Create version configuration
      const versionConfig = {
        id: versionId,
        name: versionName,
        type: versionType,
        createdAt: new Date().toISOString(),
        modCount: processedModlist.length
      };
      
      // Save processed modlist
      fs.writeFileSync(
        path.join(versionDir, 'modlist.json'), 
        JSON.stringify(processedModlist, null, 2)
      );
      
      // Save version configuration
      fs.writeFileSync(
        path.join(versionDir, 'version.json'), 
        JSON.stringify(versionConfig, null, 2)
      );
      
      // Update project configuration
      projectConfig.versions.push({
        id: versionId,
        name: versionName,
        type: versionType,
        createdAt: versionConfig.createdAt,
        modCount: versionConfig.modCount
      });
      
      projectConfig.updatedAt = new Date().toISOString();
      
      // Save project configuration
      fs.writeFileSync(configPath, JSON.stringify(projectConfig, null, 2));
      
      res.json({ 
        version: versionConfig,
        project: projectConfig
      });
    } catch (err) {
      console.error('Error uploading modlist:', err);
      res.status(500).json({ error: 'Failed to upload modlist' });
    }
  });
});

/**
 * GET /api/modlists/:projectId/versions
 * Get all versions of a project
 */
router.get('/:projectId/versions', (req, res) => {
  try {
    const { projectId } = req.params;
    const projectDir = configUtils.getProjectDir(projectId);
    const configPath = configUtils.getProjectConfigPath(projectId);
    
    // Check if project exists
    if (!fs.existsSync(projectDir) || !fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Read project configuration
    const projectConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Sort versions by creation date (newest first)
    const versions = [...projectConfig.versions].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    res.json({ versions });
  } catch (err) {
    console.error('Error getting versions:', err);
    res.status(500).json({ error: 'Failed to get versions' });
  }
});

/**
 * GET /api/modlists/:projectId/versions/:versionId
 * Get a specific version of a project
 */
router.get('/:projectId/versions/:versionId', (req, res) => {
  try {
    const { projectId, versionId } = req.params;
    const versionDir = configUtils.getVersionDir(projectId, versionId);
    const versionConfigPath = path.join(versionDir, 'version.json');
    const modlistPath = path.join(versionDir, 'modlist.json');
    
    // Check if version exists
    if (!fs.existsSync(versionDir) || !fs.existsSync(versionConfigPath) || !fs.existsSync(modlistPath)) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    // Read version configuration and modlist
    const versionConfig = JSON.parse(fs.readFileSync(versionConfigPath, 'utf8'));
    const modlistArray = JSON.parse(fs.readFileSync(modlistPath, 'utf8'));
    
    res.json({ 
      version: versionConfig,
      modlist: { mods: modlistArray }
    });
  } catch (err) {
    console.error('Error getting version:', err);
    res.status(500).json({ error: 'Failed to get version' });
  }
});

/**
 * GET /api/modlists/:projectId/compare
 * Compare two versions of a project
 */
router.get('/:projectId/compare', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { baseVersionId, targetVersionId } = req.query;
    
    if (!baseVersionId || !targetVersionId) {
      return res.status(400).json({ error: 'Base and target version IDs are required' });
    }
    
    const baseVersionDir = configUtils.getVersionDir(projectId, baseVersionId);
    const targetVersionDir = configUtils.getVersionDir(projectId, targetVersionId);
    
    // Check if versions exist
    if (!fs.existsSync(baseVersionDir)) {
      return res.status(404).json({ error: 'Base version not found' });
    }
    
    if (!fs.existsSync(targetVersionDir)) {
      return res.status(404).json({ error: 'Target version not found' });
    }
    
    // Read modlists
    const baseModlist = JSON.parse(fs.readFileSync(path.join(baseVersionDir, 'modlist.json'), 'utf8'));
    const targetModlist = JSON.parse(fs.readFileSync(path.join(targetVersionDir, 'modlist.json'), 'utf8'));
    
    // Generate diff
    const diff = await modUtils.generateDiff(baseModlist, targetModlist);
    
    res.json({
      diff,
      baseVersion: JSON.parse(fs.readFileSync(path.join(baseVersionDir, 'version.json'), 'utf8')),
      targetVersion: JSON.parse(fs.readFileSync(path.join(targetVersionDir, 'version.json'), 'utf8'))
    });
  } catch (err) {
    console.error('Error comparing versions:', err);
    res.status(500).json({ error: 'Failed to compare versions' });
  }
});

module.exports = router;
