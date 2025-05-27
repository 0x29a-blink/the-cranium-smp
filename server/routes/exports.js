const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const exportUtils = require('../utils/exportUtils');

// Projects directory
const projectsDir = path.join(__dirname, '../data/projects');
// Root directory (for GitHub Pages)
const rootDir = path.join(__dirname, '../../');

// Read config
function readConfig() {
  const configPath = path.join(__dirname, '../config.json');
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }
    return { mainProjectId: null, githubPagesEnabled: true };
  } catch (error) {
    console.error('Error reading config:', error);
    return { mainProjectId: null, githubPagesEnabled: true };
  }
}

/**
 * GET /api/exports/:projectId/:changelogId
 * Generate exports for a specific changelog
 */
router.get('/:projectId/:changelogId', async (req, res) => {
  try {
    const { projectId, changelogId } = req.params;
    const { format, clipboard, github, branch, path: filePath, message } = req.query;
    
    // Validate format
    const validFormats = ['markdown', 'markdown-table', 'discord', 'html'];
    if (format && !validFormats.includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Must be one of: markdown, markdown-table, discord, html' });
    }
    
    const projectDir = path.join(projectsDir, projectId);
    const changelogPath = path.join(projectDir, 'changelogs', `${changelogId}.json`);
    
    // Check if changelog exists
    if (!fs.existsSync(changelogPath)) {
      return res.status(404).json({ error: 'Changelog not found' });
    }
    
    // Read changelog data
    const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
    
    // Read versions data
    const baseVersionDir = path.join(projectDir, 'versions', changelog.baseVersionId);
    const targetVersionDir = path.join(projectDir, 'versions', changelog.targetVersionId);
    
    if (!fs.existsSync(baseVersionDir) || !fs.existsSync(targetVersionDir)) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    const baseVersion = JSON.parse(fs.readFileSync(path.join(baseVersionDir, 'version.json'), 'utf8'));
    const targetVersion = JSON.parse(fs.readFileSync(path.join(targetVersionDir, 'version.json'), 'utf8'));
    
    // Read modlists
    const baseModlist = JSON.parse(fs.readFileSync(path.join(baseVersionDir, 'modlist.json'), 'utf8'));
    const targetModlist = JSON.parse(fs.readFileSync(path.join(targetVersionDir, 'modlist.json'), 'utf8'));
    
    // Read project data
    const projectConfig = JSON.parse(fs.readFileSync(path.join(projectDir, 'project.json'), 'utf8'));
    
    // Generate export based on format
    let exportContent;
    let contentType;
    
    switch (format || 'markdown') {
      case 'markdown':
        exportContent = await exportUtils.generateMarkdown(
          projectConfig, changelog, baseVersion, targetVersion, baseModlist, targetModlist
        );
        contentType = 'text/markdown';
        break;
        
      case 'markdown-table':
        exportContent = await exportUtils.generateMarkdownTable(
          projectConfig, changelog, baseVersion, targetVersion, baseModlist, targetModlist
        );
        contentType = 'text/markdown';
        break;
        
      case 'discord':
        exportContent = await exportUtils.generateDiscordMarkdown(
          projectConfig, changelog, baseVersion, targetVersion, baseModlist, targetModlist
        );
        contentType = 'text/markdown';
        break;
        
      case 'html':
        exportContent = await exportUtils.generateHtml(
          projectConfig, changelog, baseVersion, targetVersion, baseModlist, targetModlist
        );
        contentType = 'text/html';
        break;
        
      default:
        // Return all formats in JSON
        exportContent = {
          markdown: await exportUtils.generateMarkdown(
            projectConfig, changelog, baseVersion, targetVersion, baseModlist, targetModlist
          ),
          markdownTable: await exportUtils.generateMarkdownTable(
            projectConfig, changelog, baseVersion, targetVersion, baseModlist, targetModlist
          ),
          discord: await exportUtils.generateDiscordMarkdown(
            projectConfig, changelog, baseVersion, targetVersion, baseModlist, targetModlist
          ),
          html: await exportUtils.generateHtml(
            projectConfig, changelog, baseVersion, targetVersion, baseModlist, targetModlist
          )
        };
        return res.json(exportContent);
    }
    
    // If clipboard option is specified, just return the content
    if (clipboard === 'true') {
      res.set('Content-Type', contentType);
      return res.send(exportContent);
    }
    
    // If GitHub option is specified, handle it through the POST endpoint
    if (github === 'true') {
      return res.status(400).json({ 
        error: 'GitHub integration must use POST method',
        message: 'To save to GitHub, use the POST endpoint with the same parameters'
      });
    }
    
    // Standard response
    res.set('Content-Type', contentType);
    return res.send(exportContent);
  } catch (err) {
    console.error('Error generating export:', err);
    res.status(500).json({ error: 'Failed to generate export' });
  }
});

/**
 * POST /api/exports/:projectId/:changelogId
 * Save changelog to project directory or root directory for GitHub Pages
 */
router.post('/:projectId/:changelogId', async (req, res) => {
  try {
    const { projectId, changelogId } = req.params;
    const { format = 'html', path: filePath = 'docs/index.html', createDocsDir, saveToRoot = 'false' } = req.query;
    
    // For GitHub Pages, we always use HTML format
    const validFormats = ['markdown', 'markdown-table', 'html'];
    if (format && !validFormats.includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Must be one of: markdown, markdown-table, html' });
    }
    
    const projectDir = path.join(projectsDir, projectId);
    const changelogPath = path.join(projectDir, 'changelogs', `${changelogId}.json`);
    
    // Check if changelog exists
    if (!fs.existsSync(changelogPath)) {
      return res.status(404).json({ error: 'Changelog not found' });
    }
    
    // Read project config
    const projectConfigPath = path.join(projectDir, 'project.json');
    if (!fs.existsSync(projectConfigPath)) {
      return res.status(404).json({ error: 'Project configuration not found' });
    }
    
    const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
    
    // Read changelog data
    const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
    
    // Read versions data
    const baseVersionDir = path.join(projectDir, 'versions', changelog.baseVersionId);
    const targetVersionDir = path.join(projectDir, 'versions', changelog.targetVersionId);
    
    if (!fs.existsSync(baseVersionDir) || !fs.existsSync(targetVersionDir)) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    const baseVersion = JSON.parse(fs.readFileSync(path.join(baseVersionDir, 'version.json'), 'utf8'));
    const targetVersion = JSON.parse(fs.readFileSync(path.join(targetVersionDir, 'version.json'), 'utf8'));
    
    // Read modlists
    const baseModlist = JSON.parse(fs.readFileSync(path.join(baseVersionDir, 'modlist.json'), 'utf8'));
    const targetModlist = JSON.parse(fs.readFileSync(path.join(targetVersionDir, 'modlist.json'), 'utf8'));
    
    // Generate content based on format
    let content;
    let extension;
    
    switch (format || 'markdown') {
      case 'markdown':
        content = await exportUtils.generateMarkdown(
          projectConfig, changelog, baseVersion, targetVersion, baseModlist, targetModlist
        );
        extension = '.md';
        break;
      case 'markdown-table':
        content = await exportUtils.generateMarkdownTable(
          projectConfig, changelog, baseVersion, targetVersion, baseModlist, targetModlist
        );
        extension = '.md';
        break;
      case 'html':
        content = await exportUtils.generateHtml(
          projectConfig, changelog, baseVersion, targetVersion, baseModlist, targetModlist
        );
        extension = '.html';
        break;
      default:
        content = await exportUtils.generateMarkdown(
          projectConfig, changelog, baseVersion, targetVersion, baseModlist, targetModlist
        );
        extension = '.md';
    }
    
    // Ensure the target path has the correct extension
    let targetPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    if (!targetPath.endsWith(extension)) {
      // Remove any existing extension and add the correct one
      targetPath = targetPath.replace(/\.[^\.]+$/, '') + extension;
    }
    
    // Determine if we're saving to the root directory for GitHub Pages
    const isSavingToRoot = saveToRoot === 'true';
    
    // Create the full path to the target file
    let targetFilePath;
    let targetDir;
    
    if (isSavingToRoot) {
      // Save to the root directory
      targetFilePath = path.join(rootDir, targetPath);
      targetDir = path.dirname(targetFilePath);
      
      // Get config to check if this is the main project
      const config = readConfig();
      const isMainProject = config.mainProjectId === projectId;
      
      // For non-main projects, save to project-specific file
      if (!isMainProject && targetPath.includes('index.html')) {
        // Change the filename to include the project ID
        const dirName = path.dirname(targetPath);
        const fileName = `project-${projectId}.html`;
        targetFilePath = path.join(rootDir, dirName, fileName);
      }
    } else {
      // Save to the project directory
      targetFilePath = path.join(projectDir, targetPath);
      targetDir = path.dirname(targetFilePath);
    }
    
    // If createDocsDir is true, ensure the docs directory exists
    if (createDocsDir === 'true') {
      let docsDir;
      
      if (isSavingToRoot) {
        docsDir = path.join(rootDir, 'docs');
      } else {
        docsDir = path.join(projectDir, 'docs');
      }
      
      if (!fs.existsSync(docsDir)) {
        console.log(`Creating docs directory at ${docsDir}`);
        fs.mkdirSync(docsDir, { recursive: true });
      }
    }
    
    // Ensure the target directory exists
    if (!fs.existsSync(targetDir)) {
      console.log(`Creating directory at ${targetDir}`);
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(targetFilePath, content, 'utf8');
    
    // If this is the main project and we're saving to root, also update the project list
    if (isSavingToRoot) {
      try {
        // Update the projects list in the GitHub Pages
        updateGitHubPagesProjectList();
      } catch (err) {
        console.error('Error updating GitHub Pages project list:', err);
        // Continue with the response even if project list update fails
      }
    }
    
    return res.json({
      success: true,
      message: isSavingToRoot ? 
        `Changelog successfully saved to GitHub Pages directory` : 
        `Changelog successfully saved to project directory`,
      path: targetFilePath.replace(isSavingToRoot ? rootDir : projectDir, '')
    });
  } catch (err) {
    console.error('Error saving to project directory:', err);
    res.status(500).json({ error: 'Failed to save to project directory' });
  }
});

/**
 * Update the GitHub Pages project list
 * This function scans all projects and generates a JSON file with project information
 * that can be used by the GitHub Pages index.html
 */
function updateGitHubPagesProjectList() {
  try {
    // Get the list of project directories
    const projectIds = fs.readdirSync(projectsDir).filter(dir => {
      return fs.statSync(path.join(projectsDir, dir)).isDirectory();
    });
    
    // Read the config to get the main project ID
    const config = readConfig();
    
    // Array to store project data
    const projects = [];
    
    // Process each project
    projectIds.forEach(projectId => {
      const projectConfigPath = path.join(projectsDir, projectId, 'project.json');
      
      if (fs.existsSync(projectConfigPath)) {
        try {
          const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
          projects.push(projectConfig);
        } catch (err) {
          console.error(`Error reading project config for ${projectId}:`, err);
        }
      }
    });
    
    // Create the projects.json file in the docs directory
    const docsDir = path.join(rootDir, 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(docsDir, 'projects.json'),
      JSON.stringify({
        projects,
        mainProjectId: config.mainProjectId,
        lastUpdated: new Date().toISOString()
      }, null, 2),
      'utf8'
    );
    
    console.log('Updated GitHub Pages project list');
  } catch (err) {
    console.error('Error updating GitHub Pages project list:', err);
  }
}

module.exports = router;
