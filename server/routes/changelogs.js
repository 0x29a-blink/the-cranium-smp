const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const modUtils = require('../utils/modUtils');

// Projects directory
const projectsDir = path.join(__dirname, '../data/projects');

/**
 * POST /api/changelogs/:projectId/save
 * Save changelog for a comparison between two versions
 */
router.post('/:projectId/save', (req, res) => {
  try {
    const { projectId } = req.params;
    const { baseVersionId, targetVersionId, overallNotes, modChanges } = req.body;
    
    if (!baseVersionId || !targetVersionId) {
      return res.status(400).json({ error: 'Base and target version IDs are required' });
    }
    
    const projectDir = path.join(projectsDir, projectId);
    const changelogsDir = path.join(projectDir, 'changelogs');
    
    // Create changelogs directory if it doesn't exist
    if (!fs.existsSync(changelogsDir)) {
      fs.mkdirSync(changelogsDir, { recursive: true });
    }
    
    // Generate a unique ID for the changelog
    const changelogId = uuidv4();
    
    // Create changelog data
    const changelog = {
      id: changelogId,
      baseVersionId,
      targetVersionId,
      createdAt: new Date().toISOString(),
      overallNotes: overallNotes || '',
      modChanges: modChanges || {}
    };
    
    // Save changelog
    fs.writeFileSync(
      path.join(changelogsDir, `${changelogId}.json`),
      JSON.stringify(changelog, null, 2)
    );
    
    res.json({ changelog });
  } catch (err) {
    console.error('Error saving changelog:', err);
    res.status(500).json({ error: 'Failed to save changelog' });
  }
});

/**
 * GET /api/changelogs/:projectId
 * Get all changelogs for a project
 */
router.get('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const projectDir = path.join(projectsDir, projectId);
    const changelogsDir = path.join(projectDir, 'changelogs');
    
    // Check if project exists
    if (!fs.existsSync(projectDir)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if changelogs directory exists
    if (!fs.existsSync(changelogsDir)) {
      return res.json({ changelogs: [] });
    }
    
    // Get all changelog files
    const changelogFiles = fs.readdirSync(changelogsDir)
      .filter(file => file.endsWith('.json'));
    
    // Read changelog data
    const changelogs = changelogFiles.map(file => {
      const changelogPath = path.join(changelogsDir, file);
      return JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
    });
    
    // Sort changelogs by creation date (newest first)
    changelogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ changelogs });
  } catch (err) {
    console.error('Error getting changelogs:', err);
    res.status(500).json({ error: 'Failed to get changelogs' });
  }
});

/**
 * GET /api/changelogs/:projectId/:changelogId
 * Get a specific changelog
 */
router.get('/:projectId/:changelogId', (req, res) => {
  try {
    const { projectId, changelogId } = req.params;
    const projectDir = path.join(projectsDir, projectId);
    const changelogPath = path.join(projectDir, 'changelogs', `${changelogId}.json`);
    
    // Check if changelog exists
    if (!fs.existsSync(changelogPath)) {
      return res.status(404).json({ error: 'Changelog not found' });
    }
    
    // Read changelog data
    const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
    
    res.json({ changelog });
  } catch (err) {
    console.error('Error getting changelog:', err);
    res.status(500).json({ error: 'Failed to get changelog' });
  }
});

/**
 * PUT /api/changelogs/:projectId/:changelogId
 * Update a specific changelog
 */
router.put('/:projectId/:changelogId', (req, res) => {
  try {
    const { projectId, changelogId } = req.params;
    const { overallNotes, modChanges } = req.body;
    
    const projectDir = path.join(projectsDir, projectId);
    const changelogPath = path.join(projectDir, 'changelogs', `${changelogId}.json`);
    
    // Check if changelog exists
    if (!fs.existsSync(changelogPath)) {
      return res.status(404).json({ error: 'Changelog not found' });
    }
    
    // Read existing changelog
    const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
    
    // Update changelog
    changelog.overallNotes = overallNotes !== undefined ? overallNotes : changelog.overallNotes;
    changelog.modChanges = modChanges !== undefined ? modChanges : changelog.modChanges;
    
    // Save updated changelog
    fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2));
    
    res.json({ changelog });
  } catch (err) {
    console.error('Error updating changelog:', err);
    res.status(500).json({ error: 'Failed to update changelog' });
  }
});

/**
 * DELETE /api/changelogs/:projectId/:changelogId
 * Delete a specific changelog
 */
router.delete('/:projectId/:changelogId', (req, res) => {
  try {
    const { projectId, changelogId } = req.params;
    const projectDir = path.join(projectsDir, projectId);
    const changelogPath = path.join(projectDir, 'changelogs', `${changelogId}.json`);
    
    // Check if changelog exists
    if (!fs.existsSync(changelogPath)) {
      return res.status(404).json({ error: 'Changelog not found' });
    }
    
    // Delete changelog
    fs.unlinkSync(changelogPath);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting changelog:', err);
    res.status(500).json({ error: 'Failed to delete changelog' });
  }
});

module.exports = router;
