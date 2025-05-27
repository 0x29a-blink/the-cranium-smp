const axios = require('axios');
const Bottleneck = require('bottleneck');
const semver = require('semver');
const _ = require('lodash');

// Create rate limiters
const curseforgeLimiter = new Bottleneck({
  minTime: parseInt(process.env.CURSEFORGE_RATE_LIMIT) || 1000,  // Default 1 request per second
  maxConcurrent: 1
});

const modrinthLimiter = new Bottleneck({
  minTime: parseInt(process.env.MODRINTH_RATE_LIMIT) || 500,     // Default 2 requests per second
  maxConcurrent: 1
});

// Create API clients
const curseforgeClient = axios.create({
  baseURL: 'https://api.curseforge.com/v1',
  headers: {
    'x-api-key': process.env.CURSEFORGE_API_KEY,
    'Accept': 'application/json'
  }
});

const modrinthClient = axios.create({
  baseURL: 'https://api.modrinth.com/v2',
  headers: {
    'User-Agent': 'modpack-changelog-generator'
  }
});

// Apply rate limiting to API clients
const getCurseforge = curseforgeLimiter.wrap(async (endpoint) => {
  try {
    const response = await curseforgeClient.get(endpoint);
    return response.data;
  } catch (error) {
    console.error(`CurseForge API error (${endpoint}):`, error.message);
    return null;
  }
});

const getModrinth = modrinthLimiter.wrap(async (endpoint) => {
  try {
    const response = await modrinthClient.get(endpoint);
    return response.data;
  } catch (error) {
    console.error(`Modrinth API error (${endpoint}):`, error.message);
    return null;
  }
});

/**
 * Extract mod ID from URL
 * @param {string} url - Mod URL
 * @returns {string|null} - Mod ID
 */
function extractModId(url) {
  try {
    if (!url) return null;
    
    // CurseForge URL format
    if (url.includes('curseforge.com')) {
      // Extract project ID directly from URL
      const projectsMatch = url.match(/\/projects\/(\d+)/);
      if (projectsMatch && projectsMatch[1]) {
        return projectsMatch[1];
      }
      return null;
    }
    
    // Modrinth URL format
    if (url.includes('modrinth.com')) {
      // Extract mod ID from URL (either slug or ID)
      const modMatch = url.match(/\/mod\/([a-zA-Z0-9\-_]+)/);
      if (modMatch && modMatch[1]) {
        return modMatch[1];
      }
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting mod ID:', error);
    return null;
  }
}

/**
 * Get mod provider type from URL
 * @param {string} url - Mod URL
 * @returns {string} - Provider type (curseforge, modrinth, github, other)
 */
function getModProvider(url) {
  if (!url) return 'unknown';
  
  if (url.includes('curseforge.com')) {
    return 'curseforge';
  }
  
  if (url.includes('modrinth.com')) {
    return 'modrinth';
  }
  
  if (url.includes('github.com')) {
    return 'github';
  }
  
  return 'other';
}

/**
 * Fetch additional mod information from APIs
 * @param {Object} mod - Mod object
 * @returns {Promise<Object>} - Enhanced mod object
 */
async function fetchModInfo(mod) {
  try {
    const provider = getModProvider(mod.url);
    let additionalInfo = {};
    
    switch (provider) {
      case 'curseforge':
        const modId = extractModId(mod.url);
        if (modId) {
          const data = await getCurseforge(`/mods/${modId}`);
          if (data && data.data) {
            additionalInfo = {
              description: data.data.summary || '',
              downloadCount: data.data.downloadCount || 0,
              lastUpdated: data.data.dateModified || '',
              categories: data.data.categories?.map(cat => cat.name) || []
            };
          }
        }
        break;
        
      case 'modrinth':
        const modSlug = extractModId(mod.url);
        if (modSlug) {
          const data = await getModrinth(`/project/${modSlug}`);
          if (data) {
            additionalInfo = {
              description: data.description || '',
              downloadCount: data.downloads || 0,
              lastUpdated: data.updated || '',
              categories: data.categories || []
            };
          }
        }
        break;
    }
    
    return {
      ...mod,
      provider,
      additionalInfo
    };
  } catch (error) {
    console.error('Error fetching mod info:', error);
    return mod;
  }
}

/**
 * Process a modlist with additional information
 * @param {Array<Object>} modlist - Raw modlist
 * @returns {Promise<Array<Object>>} - Processed modlist
 */
async function processModlist(modlist) {
  try {
    // Clean up the input - ensure all mods have required fields
    const cleanedModlist = modlist.map(mod => ({
      name: mod.name || 'Unknown Mod',
      version: mod.version || 'Unknown Version',
      authors: mod.authors || [],
      filename: mod.filename || '',
      url: mod.url || ''
    }));
    
    // Add provider information
    const modlistWithProviders = cleanedModlist.map(mod => ({
      ...mod,
      provider: getModProvider(mod.url)
    }));
    
    // Process mods in batches to avoid overwhelming APIs
    const batchSize = 10;
    const batches = _.chunk(modlistWithProviders, batchSize);
    
    let processedModlist = [];
    for (const batch of batches) {
      const batchResults = await Promise.all(batch.map(mod => fetchModInfo(mod)));
      processedModlist = [...processedModlist, ...batchResults];
      
      // Add a small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return processedModlist;
  } catch (error) {
    console.error('Error processing modlist:', error);
    return modlist;
  }
}

/**
 * Clean version string to make it comparable
 * @param {string} versionString - Raw version string
 * @returns {string} - Cleaned version string
 */
function cleanVersion(versionString) {
  if (!versionString) return '';
  
  // Try to extract semver compatible version
  const semverMatch = versionString.match(/(\d+\.\d+\.\d+)/);
  if (semverMatch) {
    return semverMatch[1];
  }
  
  return versionString;
}

/**
 * Compare versions to determine if newer
 * @param {string} oldVersion - Old version string
 * @param {string} newVersion - New version string
 * @returns {boolean} - True if new version is newer
 */
function isNewer(oldVersion, newVersion) {
  // Clean versions
  const cleanOld = cleanVersion(oldVersion);
  const cleanNew = cleanVersion(newVersion);
  
  // Try semver comparison first
  try {
    if (semver.valid(semver.coerce(cleanOld)) && semver.valid(semver.coerce(cleanNew))) {
      return semver.gt(semver.coerce(cleanNew), semver.coerce(cleanOld));
    }
  } catch (e) {
    // Semver comparison failed, fallback to string comparison
  }
  
  // Fallback to string comparison
  return cleanNew !== cleanOld;
}

/**
 * Generate difference between two modlists
 * @param {Array<Object>} baseModlist - Base modlist
 * @param {Array<Object>} targetModlist - Target modlist
 * @returns {Object} - Difference object
 */
async function generateDiff(baseModlist, targetModlist) {
  // Create maps for quick lookup
  const baseMap = new Map(baseModlist.map(mod => [mod.name, mod]));
  const targetMap = new Map(targetModlist.map(mod => [mod.name, mod]));
  
  // Find added mods (in target but not in base)
  const added = targetModlist.filter(mod => !baseMap.has(mod.name));
  
  // Find removed mods (in base but not in target)
  const removed = baseModlist.filter(mod => !targetMap.has(mod.name));
  
  // Find updated mods (in both but with different versions)
  const updated = [];
  for (const [name, targetMod] of targetMap.entries()) {
    if (baseMap.has(name)) {
      const baseMod = baseMap.get(name);
      if (isNewer(baseMod.version, targetMod.version)) {
        updated.push({
          oldMod: baseMod,
          newMod: targetMod
        });
      }
    }
  }
  
  // Calculate statistics
  const stats = {
    totalBase: baseModlist.length,
    totalTarget: targetModlist.length,
    added: added.length,
    removed: removed.length,
    updated: updated.length,
    unchanged: baseModlist.length - removed.length - updated.length
  };
  
  return {
    added,
    removed,
    updated,
    stats
  };
}

module.exports = {
  processModlist,
  generateDiff,
  getModProvider,
  extractModId,
  fetchModInfo,
  isNewer,
  cleanVersion
};
