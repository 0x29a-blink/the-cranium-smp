// Script to parse the modpack file and fetch additional information from Modrinth API

class ModpackParser {
    constructor() {
        this.modrinthApiBase = 'https://api.modrinth.com/v2';
        this.cache = {}; // Cache for API responses
        this.retryLimit = 3; // Number of retry attempts for API calls
    }

    // Parse the modpack file (mrpack) which is essentially a zip file
    async parseModpack(url) {
        try {
            // Check cache first
            if (this.cache[url]) {
                console.log('Using cached modpack data');
                return this.cache[url];
            }
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch modpack data: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the result
            this.cache[url] = data;
            
            return data;
        } catch (error) {
            console.error('Error parsing modpack:', error);
            throw error;
        }
    }

    // Extract project IDs from mod files
    extractProjectIds(files) {
        const projectIds = [];
        
        for (const file of files) {
            // Check if the file is a mod
            if (file.path.startsWith('mods/')) {
                // Extract the project ID from the download URL if available
                if (file.downloads && file.downloads.length > 0) {
                    const downloadUrl = file.downloads[0];
                    const projectId = this.extractProjectIdFromUrl(downloadUrl);
                    if (projectId) {
                        projectIds.push({
                            id: projectId,
                            fileName: file.path.split('/').pop(),
                            fileSize: file.fileSize || 0,
                            path: file.path,
                            hashes: file.hashes || {}
                        });
                    }
                }
            }
        }
        
        return projectIds;
    }

    // Extract project ID from Modrinth download URL
    extractProjectIdFromUrl(url) {
        // Example URL: https://api.modrinth.com/v2/project/AANobbMI/version/h3Y2oc8O/files/jei-1.20.1-forge-15.2.0.27.jar
        // We want to extract 'AANobbMI'
        
        try {
            if (url.includes('api.modrinth.com')) {
                const parts = url.split('/');
                const projectIndex = parts.indexOf('project');
                if (projectIndex !== -1 && parts.length > projectIndex + 1) {
                    return parts[projectIndex + 1];
                }
            } else if (url.includes('cdn.modrinth.com')) {
                // Alternative URL format: https://cdn.modrinth.com/data/AANobbMI/versions/h3Y2oc8O/jei-1.20.1-forge-15.2.0.27.jar
                const parts = url.split('/');
                const dataIndex = parts.indexOf('data');
                if (dataIndex !== -1 && parts.length > dataIndex + 1) {
                    return parts[dataIndex + 1];
                }
            }
            return null;
        } catch (error) {
            console.error('Error extracting project ID:', error);
            return null;
        }
    }

    // Fetch mod details from Modrinth API with retry logic
    async fetchModDetails(projectIds) {
        const validIds = projectIds.filter(item => item.id !== null).map(item => item.id);
        
        if (validIds.length === 0) {
            return [];
        }
        
        try {
            // Check cache first
            const cacheKey = validIds.sort().join(',');
            if (this.cache[cacheKey]) {
                console.log('Using cached mod details');
                return this.mapProjectDetailsToMods(this.cache[cacheKey], projectIds);
            }
            
            // Fetch project details from Modrinth API with retry logic
            let modDetails = null;
            let attempts = 0;
            
            while (attempts < this.retryLimit) {
                try {
                    const response = await fetch(`${this.modrinthApiBase}/projects?ids=${JSON.stringify(validIds)}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch mod details: ${response.status}`);
                    }
                    
                    modDetails = await response.json();
                    break; // Success, exit the retry loop
                } catch (error) {
                    attempts++;
                    console.warn(`Attempt ${attempts} failed: ${error.message}`);
                    
                    if (attempts >= this.retryLimit) {
                        throw error; // Rethrow if all attempts failed
                    }
                    
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
                }
            }
            
            // Cache the results
            this.cache[cacheKey] = modDetails;
            
            // Map project details to mod files
            return this.mapProjectDetailsToMods(modDetails, projectIds);
        } catch (error) {
            console.error('Error fetching mod details:', error);
            
            // Return formatted names if API fails
            return projectIds.map(item => ({
                ...item,
                title: this.formatModName(item.fileName),
                description: 'No description available',
                icon_url: null,
                project_url: null,
                categories: [],
                client_side: 'unknown',
                server_side: 'unknown'
            }));
        }
    }
    
    // Map project details to mod files
    mapProjectDetailsToMods(modDetails, projectIds) {
        return projectIds.map(item => {
            if (!item.id) {
                return {
                    ...item,
                    title: this.formatModName(item.fileName),
                    description: 'No description available',
                    icon_url: null,
                    project_url: null,
                    categories: [],
                    client_side: 'unknown',
                    server_side: 'unknown'
                };
            }
            
            const details = modDetails.find(mod => mod.id === item.id || mod.slug === item.id);
            if (details) {
                return {
                    ...item,
                    title: details.title || this.formatModName(item.fileName),
                    description: details.description || 'No description available',
                    icon_url: details.icon_url || null,
                    project_url: `https://modrinth.com/mod/${details.slug}`,
                    categories: details.categories || [],
                    client_side: details.client_side || 'unknown',
                    server_side: details.server_side || 'unknown',
                    clientSide: details.client_side || 'unknown',
                    serverSide: details.server_side || 'unknown',
                    downloads: details.downloads || 0,
                    author: details.team || 'Unknown'
                };
            } else {
                return {
                    ...item,
                    title: this.formatModName(item.fileName),
                    description: 'No description available',
                    icon_url: null,
                    project_url: null,
                    categories: [],
                    client_side: 'unknown',
                    server_side: 'unknown'
                };
            }
        });
    }

    // Format mod name from filename or title
    formatModName(name) {
        if (!name) return 'Unknown Mod';
        
        // If it's a filename, remove extension and version info
        if (name.endsWith('.jar')) {
            name = name.replace(/\.jar$/, '');
            // Remove version patterns like 1.20.1-forge-15.2.0.27
            name = name.replace(/[-_](\d+\.\d+\.\d+)[-_].*/, '');
        }
        
        // Replace dashes and underscores with spaces
        name = name.replace(/[-_]/g, ' ');
        
        // Capitalize first letter of each word
        return name.replace(/\b\w/g, c => c.toUpperCase());
    }
    
    // Group mods by category
    groupModsByCategory(mods) {
        const categories = {};
        
        mods.forEach(mod => {
            if (mod.categories && mod.categories.length > 0) {
                mod.categories.forEach(category => {
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    categories[category].push(mod);
                });
            } else {
                if (!categories['uncategorized']) {
                    categories['uncategorized'] = [];
                }
                categories['uncategorized'].push(mod);
            }
        });
        
        return categories;
    }
    
    // Get client/server compatibility info
    getCompatibilityInfo(mods) {
        const result = {
            clientOnly: 0,
            serverOnly: 0,
            both: 0,
            unknown: 0
        };
        
        mods.forEach(mod => {
            if (mod.client_side === 'required' && mod.server_side === 'unsupported') {
                result.clientOnly++;
            } else if (mod.client_side === 'unsupported' && mod.server_side === 'required') {
                result.serverOnly++;
            } else if (mod.client_side === 'required' && mod.server_side === 'required') {
                result.both++;
            } else {
                result.unknown++;
            }
        });
        
        return result;
    }
}

// Export the parser for use in other scripts
window.ModpackParser = ModpackParser;
