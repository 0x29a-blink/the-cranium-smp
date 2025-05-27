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
        if (url.includes('curseforge.com/minecraft/mc-mods/')) {
            const match = url.match(/mc-mods\/([^/?]+)/);
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

    // Fetch CurseForge mod data by scraping (no API key required)
    async fetchCurseForgeData(projectId, url) {
        const cacheKey = `cf_${projectId || url}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        return this.queueRequest(async () => {
            try {
                // Try multiple CORS proxies for better reliability
                const proxies = [
                    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
                    `https://corsproxy.io/?${encodeURIComponent(url)}`,
                    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
                ];
                
                let html = null;
                let lastError = null;
                
                for (const proxyUrl of proxies) {
                    try {
                        const response = await fetch(proxyUrl);
                        if (response.ok) {
                            const data = await response.json();
                            html = data.contents || data;
                            if (html && typeof html === 'string') {
                                break;
                            }
                        }
                    } catch (error) {
                        lastError = error;
                        continue;
                    }
                }
                
                if (!html) {
                    throw new Error(`All CORS proxies failed. Last error: ${lastError?.message}`);
                }
                
                // Parse HTML to extract description
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Try multiple selectors for description with more comprehensive list
                let description = 'No description available';
                
                // Updated CurseForge description selectors (modern CF layout)
                const descriptionSelectors = [
                    '.project-detail__description p',
                    '.project-detail__description',
                    '.project-description p',
                    '.project-description',
                    '.description-text',
                    '.overview-description',
                    '.project-summary',
                    '[data-testid="project-description"]',
                    '.text-gray-700 p',
                    '.prose p',
                    '.project-detail .description',
                    '.project-overview .description',
                    '.details-info .description',
                    '.project-sidebar .description'
                ];
                
                for (const selector of descriptionSelectors) {
                    const element = doc.querySelector(selector);
                    if (element && element.textContent.trim()) {
                        description = element.textContent.trim();
                        // Clean up description
                        description = description
                            .replace(/\s+/g, ' ')
                            .replace(/[\r\n]+/g, ' ')
                            .trim();
                        if (description.length > 50) { // Only use if substantial
                            break;
                        }
                    }
                }
                
                // Fallback: try to get meta description
                if (description === 'No description available' || description.length < 50) {
                    const metaDesc = doc.querySelector('meta[name="description"]');
                    if (metaDesc && metaDesc.getAttribute('content')) {
                        description = metaDesc.getAttribute('content').trim();
                    }
                }
                
                // Try to get project name with more selectors
                let projectName = '';
                const titleSelectors = [
                    '.project-title',
                    '.project-name',
                    '[data-testid="project-name"]',
                    '.text-xl.font-bold',
                    '.text-2xl.font-bold',
                    'h1.text-xl',
                    'h1.text-2xl',
                    'h1',
                    '.project-header h1',
                    '.project-info h1'
                ];
                
                for (const selector of titleSelectors) {
                    const titleElement = doc.querySelector(selector);
                    if (titleElement && titleElement.textContent.trim()) {
                        projectName = titleElement.textContent.trim();
                        break;
                    }
                }
                
                // Try to get download count with more selectors
                let downloadCount = 0;
                const downloadSelectors = [
                    '.download-count',
                    '.downloads',
                    '[data-testid="downloads"]',
                    '.text-gray-500:contains("downloads")',
                    '.stat-downloads',
                    '.project-stats .downloads',
                    '.project-info .downloads'
                ];
                
                for (const selector of downloadSelectors) {
                    const downloadElement = doc.querySelector(selector);
                    if (downloadElement) {
                        const downloadText = downloadElement.textContent;
                        // Look for patterns like "1,234,567 downloads" or "1.2M downloads"
                        const downloadMatch = downloadText.match(/([\d,]+\.?\d*[KMB]?)\s*(downloads?|DLs?)/i);
                        if (downloadMatch) {
                            let count = downloadMatch[1].replace(/,/g, '');
                            if (count.includes('K')) {
                                count = parseFloat(count.replace('K', '')) * 1000;
                            } else if (count.includes('M')) {
                                count = parseFloat(count.replace('M', '')) * 1000000;
                            } else if (count.includes('B')) {
                                count = parseFloat(count.replace('B', '')) * 1000000000;
                            } else {
                                count = parseInt(count, 10);
                            }
                            downloadCount = count || 0;
                            break;
                        }
                    }
                }
                
                // Try to extract additional metadata
                let categories = [];
                const categoryElements = doc.querySelectorAll('.category, .tag, .badge, .chip');
                categoryElements.forEach(el => {
                    const text = el.textContent.trim();
                    if (text && text.length < 30) {
                        categories.push(text);
                    }
                });
                
                // Try to get game versions
                let gameVersions = [];
                const versionElements = doc.querySelectorAll('.version, .minecraft-version, .game-version');
                versionElements.forEach(el => {
                    const text = el.textContent.trim();
                    if (text.match(/1\.\d+(\.\d+)?/)) {
                        gameVersions.push(text);
                    }
                });
                
                const result = {
                    description: description.length > 500 ? description.substring(0, 500) + '...' : description,
                    downloadCount: downloadCount,
                    dateModified: null,
                    categories: categories.slice(0, 5), // Limit to 5 categories
                    screenshots: [],
                    gameVersions: gameVersions.slice(0, 3), // Limit to 3 versions
                    platform: 'curseforge',
                    projectName: projectName
                };
                
                this.cache.set(cacheKey, result);
                return result;
            } catch (error) {
                console.warn(`Failed to scrape CurseForge data for ${projectId || url}:`, error);
                return this.getFallbackData('curseforge');
            }
        });
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
                    // Try to scrape CurseForge page
                    if (mod.url) {
                        return await this.fetchCurseForgeData(projectId, mod.url);
                    }
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
            searchText: `${mod.name} ${Array.isArray(mod.authors) ? mod.authors.join(' ') : (mod.authors || '')} ${mod.version}`.toLowerCase(),
            hasValidUrl: this.hasValidUrl(mod.url)
        }));
    }

    static getPlatformFromUrl(url) {
        if (!url || typeof url !== 'string') return 'other';
        
        if (url.includes('curseforge.com')) return 'curseforge';
        if (url.includes('modrinth.com')) return 'modrinth';
        if (url.includes('github.com')) return 'github';
        return 'other';
    }

    static hasValidUrl(url) {
        return url && typeof url === 'string' && url.trim() !== '' && 
               (url.startsWith('http://') || url.startsWith('https://'));
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