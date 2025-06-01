// Standalone Modpack Parser Script
// This script parses modpack data and fetches additional information from Modrinth API
// Usage: node modpack-parser.js <input-file> <output-file>

const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip'); // For handling zip files

class ModpackParser {
    constructor() {
        this.modrinthApiBase = 'https://api.modrinth.com/v2';
        this.cache = {}; // Cache for API responses
        this.retryLimit = 3; // Number of retry attempts for API calls
    }

    // Parse the modpack file (json or mrpack format)
    async parseModpack(filePath) {
        try {
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            
            // Check if it's a .mrpack file (which is a zip file)
            if (filePath.toLowerCase().endsWith('.mrpack')) {
                console.log('Detected .mrpack file, extracting modrinth.index.json...');
                return this.extractModpackZip(filePath);
            } else {
                // Regular JSON file
                console.log('Parsing JSON file...');
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                return data;
            }
        } catch (error) {
            console.error('Error parsing modpack:', error);
            throw error;
        }
    }
    
    // Extract data from a .mrpack file (which is a zip file)
    extractModpackZip(zipFilePath) {
        try {
            // Create a new instance of AdmZip
            const zip = new AdmZip(zipFilePath);
            
            // Find and extract the modrinth.index.json file
            const indexEntry = zip.getEntry('modrinth.index.json');
            if (!indexEntry) {
                throw new Error('modrinth.index.json not found in the .mrpack file');
            }
            
            // Extract and parse the index file
            const indexContent = indexEntry.getData().toString('utf8');
            const modpackData = JSON.parse(indexContent);
            
            console.log(`Extracted modpack data: ${modpackData.name} v${modpackData.version_id}`);
            return modpackData;
        } catch (error) {
            console.error('Error extracting modpack zip:', error);
            throw error;
        }
    }

    // Extract project IDs from mod files
    extractProjectIds(files) {
        const projectIds = [];
        
        if (!files || !Array.isArray(files)) {
            console.warn('No files found in modpack or files is not an array');
            return projectIds;
        }
        
        // Check if this is a modrinth.index.json format (from .mrpack file)
        // In this format, files have 'path' and 'downloads' is an object with key-value pairs
        const isMrpackFormat = files.some(file => file.downloads && typeof file.downloads === 'object' && !Array.isArray(file.downloads));
        
        if (isMrpackFormat) {
            console.log('Detected modrinth.index.json format from .mrpack file');
            // Process files in modrinth.index.json format
            for (const file of files) {
                // Only process mod files
                if (file.path && file.path.startsWith('mods/')) {
                    // In mrpack format, project_id is directly available
                    if (file.project_id) {
                        projectIds.push({
                            id: file.project_id,
                            fileName: file.path.split('/').pop(),
                            fileSize: file.file_size || 0,
                            path: file.path,
                            hashes: file.hashes || {}
                        });
                    } else {
                        // If no project_id, just use the filename
                        projectIds.push({
                            id: null,
                            fileName: file.path.split('/').pop(),
                            fileSize: file.file_size || 0,
                            path: file.path,
                            hashes: file.hashes || {}
                        });
                    }
                }
            }
        } else {
            // Original format from our custom JSON files
            console.log('Processing original modpack format');
            // Filter for mod files
            for (const file of files) {
                if (file.path && file.path.startsWith('mods/')) {
                    // Check if the file has a download URL
                    if (file.downloads && file.downloads.length > 0) {
                        const modrinthUrl = file.downloads.find(url => 
                            url.includes('api.modrinth.com') || url.includes('cdn.modrinth.com')
                        );
                        
                        if (modrinthUrl) {
                            const projectId = this.extractProjectIdFromUrl(modrinthUrl);
                            if (projectId) {
                                projectIds.push({
                                    id: projectId,
                                    fileName: file.path.split('/').pop(),
                                    fileSize: file.fileSize || 0,
                                    path: file.path,
                                    hashes: file.hashes || {}
                                });
                            } else {
                                // If we couldn't extract the project ID, just use the filename
                                projectIds.push({
                                    id: null,
                                    fileName: file.path.split('/').pop(),
                                    fileSize: file.fileSize || 0,
                                    path: file.path,
                                    hashes: file.hashes || {}
                                });
                            }
                        } else {
                            // If no Modrinth URL, just use the filename
                            projectIds.push({
                                id: null,
                                fileName: file.path.split('/').pop(),
                                fileSize: file.fileSize || 0,
                                path: file.path,
                                hashes: file.hashes || {}
                            });
                        }
                    } else {
                        // If no download URL, just use the filename
                        projectIds.push({
                            id: null,
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
        // Filter out null or undefined project IDs
        const validProjectIds = projectIds.filter(item => item.id);
        const validIds = validProjectIds.map(item => item.id);
        
        if (validIds.length === 0) {
            console.warn('No valid project IDs found');
            return projectIds.map(item => ({
                id: item.id,
                title: this.formatModName(item.fileName),
                fileName: item.fileName,
                fileSize: item.fileSize,
                path: item.path,
                hashes: item.hashes,
                // Default values for missing data
                description: 'No description available',
                categories: [],
                clientSide: 'unknown',
                serverSide: 'unknown',
                downloads: 0,
                iconUrl: null,
                projectUrl: null,
                // Essential fields only
                team: [],
                gallery: [],
                source_url: null
            }));
        }
        
        try {
            // Split into chunks of 100 IDs to avoid URL length limits
            const chunkSize = 100;
            const chunks = [];
            
            for (let i = 0; i < validIds.length; i += chunkSize) {
                chunks.push(validIds.slice(i, i + chunkSize));
            }
            
            // Fetch data for each chunk
            const allResults = [];
            
            for (const chunk of chunks) {
                // Check if we have this chunk in cache
                const cacheKey = chunk.sort().join(',');
                if (this.cache[cacheKey]) {
                    console.log(`Using cached data for ${chunk.length} mods`);
                    allResults.push(...this.cache[cacheKey]);
                    continue;
                }
                
                // Fetch from API with retry logic
                let retryCount = 0;
                let success = false;
                let results;
                
                while (!success && retryCount < this.retryLimit) {
                    try {
                        // Request more detailed information from the API
                        const url = `${this.modrinthApiBase}/projects?ids=["${chunk.join('","')}"]`;
                        results = await this.makeApiRequest(url);
                        
                        // For each project, fetch additional details like versions and team members
                        for (let i = 0; i < results.length; i++) {
                            const project = results[i];
                            
                            // Get team members (limit to 5 to avoid too many requests)
                            try {
                                // Ensure team ID exists before making the request
                                if (project.team) {
                                    const teamUrl = `${this.modrinthApiBase}/team/${project.team}/members`;
                                    const teamData = await this.makeApiRequest(teamUrl);
                                    project.team_members = teamData.map(member => ({
                                        username: member.user.username,
                                        role: member.role
                                    })).slice(0, 5); // Limit to 5 team members
                                } else {
                                    console.warn(`No team ID for ${project.title}`); 
                                    project.team_members = [];
                                }
                            } catch (error) {
                                console.warn(`Could not fetch team data for ${project.title}: ${error.message}`);
                                project.team_members = [];
                            }
                            
                            // Get latest version info
                            try {
                                const versionsUrl = `${this.modrinthApiBase}/project/${project.id}/version`;
                                const versionsData = await this.makeApiRequest(versionsUrl);
                                if (versionsData && versionsData.length > 0) {
                                    // Get the latest version
                                    const latestVersion = versionsData[0];
                                    project.latest_version = {
                                        name: latestVersion.name,
                                        version_number: latestVersion.version_number
                                    };
                                }
                            } catch (error) {
                                console.warn(`Could not fetch version data for ${project.title}: ${error.message}`);
                                project.latest_version = null;
                            }
                        }
                        
                        success = true;
                    } catch (error) {
                        retryCount++;
                        console.warn(`Retry ${retryCount}/${this.retryLimit}: ${error.message}`);
                        
                        if (retryCount >= this.retryLimit) {
                            throw error;
                        }
                        
                        // Exponential backoff
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
                    }
                }
                
                // Cache the results
                this.cache[cacheKey] = results;
                allResults.push(...results);
            }
            
            // Map the API results to the original project IDs
            return this.mapProjectDetailsToMods(allResults, projectIds);
        } catch (error) {
            console.error('Error fetching mod details:', error);
            
            // Return basic info for all mods if API fails
            return projectIds.map(item => ({
                id: item.id,
                title: this.formatModName(item.fileName),
                fileName: item.fileName,
                fileSize: item.fileSize,
                path: item.path,
                hashes: item.hashes,
                // Default values for missing data
                description: 'Failed to fetch data from Modrinth API',
                categories: [],
                clientSide: 'unknown',
                serverSide: 'unknown',
                downloads: 0,
                iconUrl: null,
                projectUrl: null,
                // Essential fields only
                team: [],
                gallery: [],
                source_url: null
            }));
        }
    }

    // Helper method to make API requests with delay
    makeApiRequest(url) {
        return new Promise((resolve, reject) => {
            const delay = 350;
            console.log(`Making API request with ${delay}ms delay: ${url}`);
            
            setTimeout(() => {
                // Check for common URL typos and fix them
                const fixedUrl = url
                    .replace(/\/memberss$/, '/members')
                    .replace(/\/versionn$/, '/version');
                
                if (fixedUrl !== url) {
                    console.log(`Fixed URL typo: ${url} -> ${fixedUrl}`);
                }
                
                https.get(fixedUrl, (res) => {
                    if (res.statusCode !== 200) {
                        // If we hit a rate limit, wait longer and retry
                        if (res.statusCode === 429) {
                            const retryAfter = parseInt(res.headers['retry-after']) || 10;
                            console.warn(`Rate limited! Waiting ${retryAfter} seconds before retrying...`);
                            setTimeout(() => {
                                this.makeApiRequest(fixedUrl).then(resolve).catch(reject);
                            }, retryAfter * 1000);
                            return;
                        }
                        
                        // For 404 errors, return an empty result instead of failing
                        if (res.statusCode === 404) {
                            console.warn(`Resource not found: ${fixedUrl}`);
                            if (fixedUrl.includes('/members')) {
                                resolve([]);
                            } else if (fixedUrl.includes('/version')) {
                                resolve([]);
                            } else {
                                reject(new Error(`Resource not found: ${fixedUrl}`));
                            }
                            return;
                        }
                        
                        reject(new Error(`API request failed with status code ${res.statusCode}`));
                        return;
                    }
                    
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    
                    res.on('end', () => {
                        try {
                            const jsonData = JSON.parse(data);
                            resolve(jsonData);
                        } catch (error) {
                            console.warn(`Failed to parse API response: ${error.message}`);
                            // Return empty array for certain endpoints to avoid breaking the process
                            if (fixedUrl.includes('/members') || fixedUrl.includes('/version')) {
                                resolve([]);
                            } else {
                                reject(new Error(`Failed to parse API response: ${error.message}`));
                            }
                        }
                    });
                }).on('error', (error) => {
                    console.warn(`API request error for ${fixedUrl}: ${error.message}`);
                    // Return empty array for certain endpoints to avoid breaking the process
                    if (fixedUrl.includes('/members') || fixedUrl.includes('/version')) {
                        resolve([]);
                    } else {
                        reject(new Error(`API request error: ${error.message}`));
                    }
                });
            }, delay);
        });
    }
    
    // Map project details to mod files
    mapProjectDetailsToMods(modDetails, projectIds) {
        // Create a map of project IDs to details
        const detailsMap = {};
        for (const detail of modDetails) {
            detailsMap[detail.id] = detail;
        }
        
        // Map details to mod files
        return projectIds.map(item => {
            if (item.id && detailsMap[item.id]) {
                const detail = detailsMap[item.id];
                return {
                    id: item.id,
                    title: detail.title || this.formatModName(item.fileName),
                    fileName: item.fileName,
                    fileSize: item.fileSize,
                    path: item.path,
                    hashes: item.hashes,
                    description: detail.description || 'No description available',
                    categories: detail.categories || [],
                    clientSide: detail.client_side || 'unknown',
                    serverSide: detail.server_side || 'unknown',
                    downloads: detail.downloads || 0,
                    iconUrl: detail.icon_url || null,
                    projectUrl: `https://modrinth.com/mod/${detail.slug}` || null,
                    
                    // Essential information only
                    gallery: detail.gallery || [],
                    team: detail.team_members || [],
                    source_url: detail.source_url || null,
                    latest_version: detail.latest_version || null
                };
            } else {
                // If no details available, use the filename
                return {
                    id: item.id,
                    title: this.formatModName(item.fileName),
                    fileName: item.fileName,
                    fileSize: item.fileSize,
                    path: item.path,
                    hashes: item.hashes,
                    description: 'No description available',
                    categories: [],
                    clientSide: 'unknown',
                    serverSide: 'unknown',
                    downloads: 0,
                    iconUrl: null,
                    projectUrl: null,
                    
                    // Essential information only
                    gallery: [],
                    team: [],
                    source_url: null,
                    latest_version: null
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

    // Process a modpack file and output enhanced data
    async processModpack(inputFile, outputFile) {
        console.log(`Processing modpack file: ${inputFile}`);
        
        // Parse the modpack file
        const modpackData = await this.parseModpack(inputFile);
        
        // Handle different modpack formats
        let name, version, files;
        
        // Check if this is a modrinth.index.json format (from .mrpack file)
        if (modpackData.formatVersion && modpackData.files) {
            // This is a modrinth.index.json format
            name = modpackData.name;
            version = modpackData.version_id || modpackData.version;
            files = modpackData.files;
            console.log(`Parsed modpack: ${name} v${version} (Modrinth format)`);
        } else {
            // Original format
            name = modpackData.name;
            version = modpackData.version;
            files = modpackData.files;
            console.log(`Parsed modpack: ${name} v${version} (Original format)`);
        }
        
        // Extract project IDs from the modpack files
        const projectIds = this.extractProjectIds(files);
        console.log(`Extracted ${projectIds.length} mod entries`);
        
        // Fetch mod details from Modrinth API
        console.log('Fetching mod details from Modrinth API...');
        const modDetails = await this.fetchModDetails(projectIds);
        
        // Create enhanced modpack data
        const enhancedData = {
            name,
            version,
            files,
            ...modpackData, // Keep all original data
            mods: modDetails,
            compatibility: this.getCompatibilityInfo(modDetails),
            categories: [...new Set(modDetails.flatMap(mod => mod.categories || []))].sort(),
            generatedAt: new Date().toISOString()
        };
        
        // Write enhanced data to output file
        fs.writeFileSync(outputFile, JSON.stringify(enhancedData, null, 2));
        console.log(`Enhanced modpack data written to: ${outputFile}`);
        
        return enhancedData;
    }

    // Extract unique categories from mod details
    extractUniqueCategories(modDetails) {
        const categories = new Set();
        
        modDetails.forEach(mod => {
            if (mod.categories && mod.categories.length > 0) {
                mod.categories.forEach(category => {
                    categories.add(category);
                });
            }
        });
        
        return Array.from(categories).sort();
    }
}

// Main function to run the script
async function main() {
    try {
        // Check for command line arguments
        const args = process.argv.slice(2);
        if (args.length < 2) {
            console.error('Usage: node modpack-parser.js <input-file> <output-file>');
            console.error('  <input-file> can be either a .json file or a .mrpack file');
            process.exit(1);
        }
        
        const inputFile = args[0];
        const outputFile = args[1];
        
        // Check if we need to install the adm-zip package
        if (inputFile.toLowerCase().endsWith('.mrpack')) {
            try {
                require.resolve('adm-zip');
            } catch (e) {
                console.log('The adm-zip package is required for parsing .mrpack files but is not installed.');
                console.log('Installing adm-zip package...');
                
                const { execSync } = require('child_process');
                try {
                    execSync('npm install adm-zip', { stdio: 'inherit' });
                    console.log('adm-zip package installed successfully.');
                } catch (installError) {
                    console.error('Failed to install adm-zip package. Please install it manually with:');
                    console.error('npm install adm-zip');
                    process.exit(1);
                }
            }
        }
        
        // Create parser instance and process the modpack
        const parser = new ModpackParser();
        await parser.processModpack(inputFile, outputFile);
        
        console.log('Modpack processing completed successfully!');
    } catch (error) {
        console.error('Error running modpack parser:', error);
        process.exit(1);
    }
}

// Run the script if executed directly
if (require.main === module) {
    main();
} else {
    // Export the parser for use in other scripts
    module.exports = ModpackParser;
}
