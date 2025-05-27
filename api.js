// API configuration and utilities for mod platform integration
class ModAPI {
    constructor() {
        this.cache = new Map();
        this.requestQueue = [];
        this.isProcessing = false;
        this.rateLimitDelay = 100; // ms between requests
    }

    // Extract project ID from URL
    extractProjectId(url) {
        if (!url || typeof url !== 'string') return null;
        
        if (url.includes('curseforge.com/projects/')) {
            const match = url.match(/projects\/(\d+)/);
            return match ? match[1] : null;
        }
        if (url.includes('modrinth.com/mod/')) {
            const match = url.match(/mod\/([^/?]+)/);
            return match ? match[1] : null;
        }
        if (url.includes('github.com/')) {
            const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
            return match ? match[1] : null;
        }
        return null;
    }

    // Determine platform from URL
    getPlatform(url) {
        if (!url || typeof url !== 'string') return 'other';
        
        if (url.includes('curseforge.com')) return 'curseforge';
        if (url.includes('modrinth.com')) return 'modrinth';
        if (url.includes('github.com')) return 'github';
        return 'other';
    }

    // Queue API requests to avoid rate limiting
    async queueRequest(requestFn) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ requestFn, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.requestQueue.length > 0) {
            const { requestFn, resolve, reject } = this.requestQueue.shift();
            
            try {
                const result = await requestFn();
                resolve(result);
            } catch (error) {
                reject(error);
            }
            
            // Rate limiting delay
            if (this.requestQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
            }
        }
        
        this.isProcessing = false;
    }

    // Fetch CurseForge mod data - Skip API calls and return fallback data
    async fetchCurseForgeData(projectId) {
        // Skip API calls for CurseForge since it requires API key
        console.log(`Skipping CurseForge API for project ${projectId} - using fallback data`);
        return this.getFallbackData('curseforge');
    }

    // Fetch Modrinth mod data
    async fetchModrinthData(projectId) {
        const cacheKey = `mr_${projectId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        return this.queueRequest(async () => {
            try {
                const response = await fetch(`https://api.modrinth.com/v2/project/${projectId}`);
                if (!response.ok) {
                    throw new Error(`Modrinth API error: ${response.status}`);
                }
                
                const modData = await response.json();
                
                const result = {
                    description: modData.description || 'No description available',
                    downloadCount: modData.downloads || 0,
                    dateModified: modData.updated || null,
                    categories: modData.categories || [],
                    screenshots: modData.gallery?.map(img => img.url) || [],
                    gameVersions: modData.game_versions || [],
                    platform: 'modrinth'
                };
                
                this.cache.set(cacheKey, result);
                return result;
            } catch (error) {
                console.warn(`Failed to fetch Modrinth data for ${projectId}:`, error);
                return this.getFallbackData('modrinth');
            }
        });
    }

    // Fetch GitHub repository data
    async fetchGitHubData(repoPath) {
        const cacheKey = `gh_${repoPath}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        return this.queueRequest(async () => {
            try {
                const response = await fetch(`https://api.github.com/repos/${repoPath}`);
                if (!response.ok) {
                    throw new Error(`GitHub API error: ${response.status}`);
                }
                
                const repoData = await response.json();
                
                const result = {
                    description: repoData.description || 'No description available',
                    downloadCount: 0, // GitHub doesn't provide download counts easily
                    dateModified: repoData.updated_at || null,
                    categories: repoData.topics || [],
                    screenshots: [],
                    gameVersions: [],
                    stars: repoData.stargazers_count || 0,
                    forks: repoData.forks_count || 0,
                    platform: 'github'
                };
                
                this.cache.set(cacheKey, result);
                return result;
            } catch (error) {
                console.warn(`Failed to fetch GitHub data for ${repoPath}:`, error);
                return this.getFallbackData('github');
            }
        });
    }

    // Get fallback data when API calls fail
    getFallbackData(platform) {
        return {
            description: 'Description not available',
            downloadCount: 0,
            dateModified: null,
            categories: [],
            screenshots: [],
            gameVersions: [],
            platform: platform
        };
    }

    // Main method to fetch mod data based on URL
    async fetchModData(mod) {
        const platform = this.getPlatform(mod.url);
        const projectId = this.extractProjectId(mod.url);
        
        try {
            switch (platform) {
                case 'curseforge':
                    // Skip API for CurseForge, just return fallback
                    return this.getFallbackData('curseforge');
                case 'modrinth':
                    if (projectId) {
                        return await this.fetchModrinthData(projectId);
                    }
                    return this.getFallbackData('modrinth');
                case 'github':
                    if (projectId) {
                        return await this.fetchGitHubData(projectId);
                    }
                    return this.getFallbackData('github');
                default:
                    return this.getFallbackData('other');
            }
        } catch (error) {
            console.error(`Error fetching data for ${mod.name}:`, error);
            return this.getFallbackData(platform);
        }
    }

    // Batch fetch mod data for multiple mods
    async fetchBatchModData(mods, progressCallback) {
        const results = [];
        const total = mods.length;
        
        for (let i = 0; i < total; i++) {
            const mod = mods[i];
            try {
                const apiData = await this.fetchModData(mod);
                results.push({
                    ...mod,
                    ...apiData,
                    platform: this.getPlatform(mod.url)
                });
                
                if (progressCallback) {
                    progressCallback(i + 1, total);
                }
            } catch (error) {
                console.error(`Error processing mod ${mod.name}:`, error);
                results.push({
                    ...mod,
                    ...this.getFallbackData(this.getPlatform(mod.url)),
                    platform: this.getPlatform(mod.url)
                });
            }
        }
        
        return results;
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Utility functions for data processing
class DataProcessor {
    static processModList(mods) {
        return mods.map(mod => ({
            ...mod,
            platform: this.getPlatformFromUrl(mod.url),
            authorsList: Array.isArray(mod.authors) ? mod.authors : [mod.authors || 'Unknown'],
            searchText: `${mod.name} ${Array.isArray(mod.authors) ? mod.authors.join(' ') : (mod.authors || '')} ${mod.version}`.toLowerCase()
        }));
    }

    static getPlatformFromUrl(url) {
        if (!url || typeof url !== 'string') return 'other';
        
        if (url.includes('curseforge.com')) return 'curseforge';
        if (url.includes('modrinth.com')) return 'modrinth';
        if (url.includes('github.com')) return 'github';
        return 'other';
    }

    static getStatistics(mods) {
        const stats = {
            total: mods.length,
            curseforge: 0,
            modrinth: 0,
            github: 0,
            other: 0
        };

        mods.forEach(mod => {
            const platform = this.getPlatformFromUrl(mod.url);
            stats[platform]++;
        });

        return stats;
    }

    static filterMods(mods, searchTerm, platformFilter) {
        return mods.filter(mod => {
            const matchesSearch = !searchTerm || 
                (mod.searchText && mod.searchText.includes(searchTerm.toLowerCase())) ||
                (mod.description && mod.description.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesPlatform = !platformFilter || mod.platform === platformFilter;
            
            return matchesSearch && matchesPlatform;
        });
    }

    static sortMods(mods, sortBy) {
        const sortedMods = [...mods];
        
        switch (sortBy) {
            case 'name':
                return sortedMods.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            case 'author':
                return sortedMods.sort((a, b) => {
                    const authorA = Array.isArray(a.authors) ? a.authors[0] : a.authors || '';
                    const authorB = Array.isArray(b.authors) ? b.authors[0] : b.authors || '';
                    return authorA.localeCompare(authorB);
                });
            case 'version':
                return sortedMods.sort((a, b) => (a.version || '').localeCompare(b.version || ''));
            case 'platform':
                return sortedMods.sort((a, b) => (a.platform || '').localeCompare(b.platform || ''));
            default:
                return sortedMods;
        }
    }

    static compareMods(oldMods, newMods) {
        const changes = {
            added: [],
            removed: [],
            updated: []
        };

        const oldModsMap = new Map(oldMods.map(mod => [mod.name, mod]));
        const newModsMap = new Map(newMods.map(mod => [mod.name, mod]));

        // Find added mods
        newMods.forEach(mod => {
            if (!oldModsMap.has(mod.name)) {
                changes.added.push(mod);
            }
        });

        // Find removed mods
        oldMods.forEach(mod => {
            if (!newModsMap.has(mod.name)) {
                changes.removed.push(mod);
            }
        });

        // Find updated mods
        newMods.forEach(mod => {
            const oldMod = oldModsMap.get(mod.name);
            if (oldMod && oldMod.version !== mod.version) {
                changes.updated.push({
                    name: mod.name,
                    oldVersion: oldMod.version,
                    newVersion: mod.version,
                    mod: mod
                });
            }
        });

        return changes;
    }
}

// Export for use in other files
window.ModAPI = ModAPI;
window.DataProcessor = DataProcessor;