const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const configUtils = require('../utils/configUtils');

/**
 * GET /api/projects
 * Get all projects
 */
router.get('/', (req, res) => {
  try {
    const projectsDir = configUtils.PROJECTS_DIR;
    
    console.log(`[${new Date().toISOString()}] Retrieving all projects from ${projectsDir}`);
    
    // Ensure projects directory exists
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
      return res.json({ projects: [] });
    }

    // Read project directories
    const projects = fs.readdirSync(projectsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const projectId = dirent.name;
        const configPath = configUtils.getProjectConfigPath(projectId);
        
        // Read project configuration
        if (fs.existsSync(configPath)) {
          try {
            const projectConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return {
              id: projectId,
              name: projectConfig.name,
              description: projectConfig.description,
              createdAt: projectConfig.createdAt,
              updatedAt: projectConfig.updatedAt
            };
          } catch (err) {
            console.error(`Error reading project ${projectId}:`, err);
            return null;
          }
        }
        return null;
      })
      .filter(project => project !== null);

    res.json({ projects });
  } catch (err) {
    console.error('Error getting projects:', err);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

/**
 * POST /api/projects/create
 * Create a new project
 */
router.post('/create', (req, res) => {
  try {
    const { name, description, gameVersion, modLoader } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    // Generate unique ID for the project
    const projectId = uuidv4();
    const projectDir = configUtils.getProjectDir(projectId);
    
    // Create project directory
    if (!fs.existsSync(projectDir)) {
      console.log(`[${new Date().toISOString()}] Creating project directory: ${projectDir}`);
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    // Create project configuration
    const projectConfig = {
      id: projectId,
      name,
      description: description || '',
      gameVersion: gameVersion || '1.20.1',
      modLoader: modLoader || 'forge',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: []
    };
    
    // Save project configuration
    fs.writeFileSync(
      configUtils.getProjectConfigPath(projectId), 
      JSON.stringify(projectConfig, null, 2)
    );
    
    console.log(`[${new Date().toISOString()}] Project created: ${projectId}`);
    res.status(201).json({ project: projectConfig });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * GET /api/projects/:id
 * Get project by ID
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const configPath = configUtils.getProjectConfigPath(id);
    
    // Check if project exists
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Read project configuration
    const projectConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    res.json({ project: projectConfig });
  } catch (err) {
    console.error('Error getting project:', err);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

/**
 * PUT /api/projects/:id
 * Update project by ID
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const configPath = configUtils.getProjectConfigPath(id);
    
    // Check if project exists
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Read project configuration
    const projectConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Update project configuration
    projectConfig.name = name || projectConfig.name;
    projectConfig.description = description !== undefined ? description : projectConfig.description;
    projectConfig.updatedAt = new Date().toISOString();
    
    // Save project configuration
    fs.writeFileSync(configPath, JSON.stringify(projectConfig, null, 2));
    
    res.json({ project: projectConfig });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project by ID
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const projectDir = configUtils.getProjectDir(id);
    
    // Check if project exists
    if (!fs.existsSync(projectDir)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Delete project directory recursively
    fs.rmdirSync(projectDir, { recursive: true });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
