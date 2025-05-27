const path = require('path');
const fs = require('fs');

// Base paths
const ROOT_DIR = path.join(__dirname, '../..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(SERVER_DIR, 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');

// Ensure directories exist
function ensureDirectories() {
  const directories = [
    DATA_DIR,
    PROJECTS_DIR,
    SESSIONS_DIR
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Directory structure helpers
function getProjectDir(projectId) {
  return path.join(PROJECTS_DIR, projectId);
}

function getVersionsDir(projectId) {
  return path.join(getProjectDir(projectId), 'versions');
}

function getVersionDir(projectId, versionId) {
  return path.join(getVersionsDir(projectId), versionId);
}

function getChangelogsDir(projectId) {
  return path.join(getProjectDir(projectId), 'changelogs');
}

// File paths
function getProjectConfigPath(projectId) {
  return path.join(getProjectDir(projectId), 'project.json');
}

function getVersionConfigPath(projectId, versionId) {
  return path.join(getVersionDir(projectId, versionId), 'version.json');
}

function getModlistPath(projectId, versionId) {
  return path.join(getVersionDir(projectId, versionId), 'modlist.json');
}

function getChangelogPath(projectId, changelogId) {
  return path.join(getChangelogsDir(projectId), `${changelogId}.json`);
}

module.exports = {
  ROOT_DIR,
  SERVER_DIR,
  PUBLIC_DIR,
  DATA_DIR,
  PROJECTS_DIR,
  SESSIONS_DIR,
  ensureDirectories,
  getProjectDir,
  getVersionsDir,
  getVersionDir,
  getChangelogsDir,
  getProjectConfigPath,
  getVersionConfigPath,
  getModlistPath,
  getChangelogPath
};
