// Modpack Details JavaScript
// This file handles loading and displaying the enhanced modpack data

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the modpack details page
    if (document.getElementById('mod-list-container')) {
        loadEnhancedModpackDetails();
    }
});

// Function to load enhanced modpack details
async function loadEnhancedModpackDetails() {
    try {
        // Determine which modpack to load based on the current page
        const currentPage = window.location.pathname.split('/').pop();
        let modpackId = 'cranium-aeternum';
        
        if (currentPage === 'cranium-aeternum.html') {
            modpackId = 'cranium-aeternum';
        }
        
        // Show loading state
        document.getElementById('mod-list-container').innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading mod list...</p>
            </div>
        `;
        
        // Fetch the enhanced modpack data
        let response;
        try {
            // Try the full enhanced file first
            response = await fetch(`./data/enhanced/${modpackId}-enhanced-full.json`);
            if (!response.ok) {
                // Fall back to the regular enhanced file
                response = await fetch(`./data/enhanced/${modpackId}-enhanced.json`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch enhanced modpack data: ${response.status}`);
                }
            }
        } catch (error) {
            console.error('Error fetching modpack data:', error);
            throw new Error(`Failed to fetch enhanced modpack data: ${error.message}`);
        }
        
        const enhancedData = await response.json();
        
        // Update modpack information
        updateModpackInfo(enhancedData);
        
        // Store the mod details globally for filtering
        window.allModDetails = enhancedData.mods || [];
        
        // Add category badges
        const categories = extractCategories(enhancedData.mods);
        addCategoryFilters(categories);
        
        // Update mod count
        updateModCount(enhancedData.mods.length);
        
        // Update compatibility chart
        updateCompatibilityChart(enhancedData.mods);
        
        // Load mod list with enhanced details
        displayModCards(enhancedData.mods);
    } catch (error) {
        console.error('Error loading enhanced modpack details:', error);
        document.getElementById('mod-list-container').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error loading modpack details. Please try again later.
            </div>
        `;
    }
}

// Update the modpack information section
function updateModpackInfo(data) {
    const titleElement = document.getElementById('modpack-title');
    const versionElement = document.getElementById('modpack-version');
    const mcVersionElement = document.getElementById('minecraft-version');
    const forgeVersionElement = document.getElementById('forge-version');
    const modCountElement = document.getElementById('mod-count');
    
    if (titleElement) titleElement.textContent = data.name || 'The Cranium: Aeternum';
    if (versionElement) versionElement.textContent = data.version || '1.0.4';
    if (mcVersionElement) mcVersionElement.textContent = data.dependencies?.minecraft || '1.20.1';
    if (forgeVersionElement) forgeVersionElement.textContent = data.dependencies?.forge || '47.4.1';
    if (modCountElement) modCountElement.textContent = data.mods?.length || 0;
    
    // Update page title
    document.title = `${data.name || 'The Cranium: Aeternum'} - Modpack Details`;
}

// Display mod cards with enhanced information
function displayModCards(mods) {
    const modListContainer = document.getElementById('mod-list-container');
    if (!modListContainer) return;
    
    // Sort mods alphabetically by title
    mods.sort((a, b) => a.title.localeCompare(b.title));
    
    const modCardsHTML = mods.map(mod => {
        // Create category badges
        let categoryBadges = '';
        if (mod.categories && mod.categories.length > 0) {
            categoryBadges = '<div class="mt-1">';
            mod.categories.forEach(category => {
                const formattedCategory = formatCategoryName(category);
                categoryBadges += `<span class="badge bg-secondary me-1 category-badge" data-category="${category}">${formattedCategory}</span>`;
            });
            categoryBadges += '</div>';
        }
        
        // Create version badge
        let versionBadge = '';
        if (mod.latest_version && mod.latest_version.version_number) {
            versionBadge = `<span class="badge bg-info ms-1">${mod.latest_version.version_number}</span>`;
        } else if (extractVersionFromFilename(mod.fileName)) {
            versionBadge = `<span class="badge bg-info ms-1">${extractVersionFromFilename(mod.fileName)}</span>`;
        }
        
        // Create gallery preview if available
        let galleryPreview = '';
        if (mod.gallery && Array.isArray(mod.gallery) && mod.gallery.length > 0 && mod.gallery[0] && mod.gallery[0].url) {
            // Safely stringify the gallery data
            const galleryJson = JSON.stringify(mod.gallery)
                .replace(/"/g, '&quot;')
                .replace(/'/g, '\\\'') 
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
                
            galleryPreview = `
                <div class="mod-gallery mt-1">
                    <img src="${mod.gallery[0].url}" class="img-thumbnail" alt="${mod.title} screenshot" 
                         onclick="showGallery('${mod.id || 'unknown'}', ${galleryJson})" 
                         style="cursor: pointer; max-height: 60px;">
                    ${mod.gallery.length > 1 ? `<span class="badge bg-dark ms-1">+${mod.gallery.length - 1} more</span>` : ''}
                </div>
            `;
        }
        
        // Create team members list if available
        let teamMembers = '';
        if (mod.team && mod.team.length > 0) {
            teamMembers = `
                <div class="small text-muted">
                    <i class="bi bi-people"></i> 
                    ${mod.team.map(member => member.username || 'Unknown').join(', ')}
                </div>
            `;
        }
        
        // Create links section if available
        let links = '';
        if (mod.projectUrl || mod.source_url) {
            links = '<div class="mt-1">';
            if (mod.projectUrl) {
                links += `<a href="${mod.projectUrl}" target="_blank" class="btn btn-sm btn-outline-primary me-1">
                    <i class="bi bi-box-arrow-up-right"></i> Modrinth
                </a>`;
            }
            if (mod.source_url) {
                links += `<a href="${mod.source_url}" target="_blank" class="btn btn-sm btn-outline-secondary me-1">
                    <i class="bi bi-code-square"></i> Source
                </a>`;
            }
            links += '</div>';
        }
        
        // Create the mod card with compressed layout
        return `
            <div class="card mod-card mb-2" data-mod-id="${mod.id}" data-mod-name="${mod.title.toLowerCase()}" 
                 data-categories='${mod.categories ? JSON.stringify(mod.categories).replace(/"/g, '&quot;') : '[]'}'>
                <div class="card-body p-0">
                    <div class="row g-0 align-items-stretch">
                        <div class="col-auto mod-icon-container">
                            ${mod.iconUrl ? 
                              `<img src="${mod.iconUrl}" class="mod-icon" alt="${mod.title} icon">` : 
                              '<div class="mod-icon bg-secondary d-flex align-items-center justify-content-center"><span class="text-white">?</span></div>'}
                        </div>
                        <div class="col p-2">
                            <h5 class="card-title mb-1">${versionBadge} ${mod.title}</h5>
                            ${teamMembers}
                            <div class="d-flex align-items-center flex-wrap">
                                <small class="text-muted me-2">Size: ${formatFileSize(mod.fileSize || 0)}</small>
                                ${mod.downloads ? `<small class="text-muted"><i class="bi bi-download"></i> ${formatNumber(mod.downloads)}</small>` : ''}
                                <small class="text-muted ms-2">${formatCompatibility(mod)}</small>
                            </div>
                            <p class="card-text small mb-1">${mod.description && mod.description.length > 120 ? 
                                mod.description.substring(0, 120) + '...' : 
                                mod.description || 'No description available'}</p>
                            ${galleryPreview}
                            <div class="small text-muted mt-1">File: ${mod.fileName}</div>
                            ${categoryBadges}
                            <div class="mt-1">
                                ${links}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Update the mod list container
    modListContainer.innerHTML = modCardsHTML || `
        <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle"></i> No mods found.
        </div>
    `;
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Format compatibility info for display
function formatCompatibility(mod) {
    const clientSide = mod.client_side || mod.clientSide || 'unknown';
    const serverSide = mod.server_side || mod.serverSide || 'unknown';
    
    if (clientSide === 'required' && serverSide === 'unsupported') {
        return '<span class="badge bg-info">Client Only</span>';
    } else if (clientSide === 'unsupported' && serverSide === 'required') {
        return '<span class="badge bg-warning">Server Only</span>';
    } else if ((clientSide === 'required' || clientSide === 'optional') && 
               (serverSide === 'required' || serverSide === 'optional')) {
        return '<span class="badge bg-success">Client & Server</span>';
    } else {
        return '<span class="badge bg-secondary">Unknown</span>';
    }
}

// Helper function to format large numbers
function formatNumber(num) {
    if (!num) return '0';
    
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Extract unique categories from mod details
function extractCategories(modDetails) {
    const categories = new Set();
    
    modDetails.forEach(mod => {
        if (mod.categories && Array.isArray(mod.categories)) {
            mod.categories.forEach(category => categories.add(category));
        }
    });
    
    return Array.from(categories).sort();
}

// Format category name for display
function formatCategoryName(category) {
    return category
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Extract version from filename
function extractVersionFromFilename(fileName) {
    if (!fileName) return null;
    
    // Common version patterns in mod filenames
    // Example: jei-1.20.1-forge-15.2.0.27.jar
    const versionRegex = /[-_](\d+\.\d+\.\d+(?:\.\d+)*)(?:[-_]|$)/;
    const match = fileName.match(versionRegex);
    
    if (match && match[1]) {
        return match[1];
    }
    
    return null;
}

// Add category filters to the page
function addCategoryFilters(categories) {
    const categoryFiltersContainer = document.getElementById('category-filters');
    if (!categoryFiltersContainer) return;
    
    // Clear loading spinner
    categoryFiltersContainer.innerHTML = '';
    
    // Add "All" filter
    categoryFiltersContainer.innerHTML += `
        <button class="btn btn-sm btn-primary me-2 mb-2 category-filter active" data-category="all">
            All
        </button>
    `;
    
    // Add a button for each category
    categories.forEach(category => {
        const formattedCategory = formatCategoryName(category);
        categoryFiltersContainer.innerHTML += `
            <button class="btn btn-sm btn-outline-secondary me-2 mb-2 category-filter" data-category="${category}">
                ${formattedCategory}
            </button>
        `;
    });
    
    // Add event listeners to category filter buttons
    document.querySelectorAll('.category-filter').forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.category-filter').forEach(btn => {
                btn.classList.remove('active');
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline-secondary');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            this.classList.remove('btn-outline-secondary');
            this.classList.add('btn-primary');
            
            // Filter mods by category
            filterModsByCategory(this.dataset.category);
        });
    });
}

// Filter mods by category
function filterModsByCategory(category) {
    const modCards = document.querySelectorAll('.mod-card');
    let visibleCount = 0;
    
    modCards.forEach(card => {
        if (category === 'all') {
            card.style.display = 'block';
            visibleCount++;
        } else {
            try {
                // Safely parse the categories JSON
                let categories = [];
                if (card.dataset.categories) {
                    try {
                        categories = JSON.parse(card.dataset.categories);
                    } catch (e) {
                        console.warn('Error parsing categories:', e);
                        // Try to fix common JSON issues
                        const fixedJson = card.dataset.categories
                            .replace(/\'/g, '"')
                            .replace(/\\\'/g, "'")
                            .replace(/\\\\'/g, "'");
                        try {
                            categories = JSON.parse(fixedJson);
                        } catch (e2) {
                            console.error('Failed to parse categories even after fixing:', e2);
                        }
                    }
                }
                
                if (Array.isArray(categories) && categories.includes(category)) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            } catch (error) {
                console.error('Error filtering mod card:', error);
                // Show the card by default if there's an error
                card.style.display = 'block';
                visibleCount++;
            }
        }
    });
    
    // Update visible mod count
    updateModCount(visibleCount);
}

// Update mod count display
function updateModCount(count) {
    const modCountElements = document.querySelectorAll('#mod-count');
    modCountElements.forEach(element => {
        element.textContent = count;
    });
}

// Update compatibility chart with mod compatibility information
function updateCompatibilityChart(mods) {
    const compatibilityChartElement = document.getElementById('compatibility-chart');
    if (!compatibilityChartElement) return;
    
    // Count the different compatibility types
    let clientOnly = 0;
    let serverOnly = 0;
    let both = 0;
    let unknown = 0;
    
    mods.forEach(mod => {
        const clientSide = mod.clientSide || mod.client_side || 'unknown';
        const serverSide = mod.serverSide || mod.server_side || 'unknown';
        
        if (clientSide === 'required' && serverSide === 'unsupported') {
            clientOnly++;
        } else if (clientSide === 'unsupported' && serverSide === 'required') {
            serverOnly++;
        } else if ((clientSide === 'required' || clientSide === 'optional') && 
                  (serverSide === 'required' || serverSide === 'optional')) {
            both++;
        } else {
            unknown++;
        }
    });
    
    // Calculate percentages
    const total = mods.length;
    const clientOnlyPercent = Math.round((clientOnly / total) * 100);
    const serverOnlyPercent = Math.round((serverOnly / total) * 100);
    const bothPercent = Math.round((both / total) * 100);
    const unknownPercent = Math.round((unknown / total) * 100);
    
    // Create the chart HTML
    const chartHTML = `
        <div class="row text-center">
            <div class="col-md-3 col-6 mb-3">
                <div class="card bg-info text-white">
                    <div class="card-body">
                        <h3>${clientOnly}</h3>
                        <p class="mb-0">Client Only</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-6 mb-3">
                <div class="card bg-warning text-dark">
                    <div class="card-body">
                        <h3>${serverOnly}</h3>
                        <p class="mb-0">Server Only</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-6 mb-3">
                <div class="card bg-success text-white">
                    <div class="card-body">
                        <h3>${both}</h3>
                        <p class="mb-0">Client & Server</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-6 mb-3">
                <div class="card bg-secondary text-white">
                    <div class="card-body">
                        <h3>${unknown}</h3>
                        <p class="mb-0">Unknown</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="progress">
            <div class="progress-bar bg-info" role="progressbar" style="width: ${clientOnlyPercent}%" 
                aria-valuenow="${clientOnlyPercent}" aria-valuemin="0" aria-valuemax="100" 
                title="Client Only: ${clientOnly} mods (${clientOnlyPercent}%)"></div>
            <div class="progress-bar bg-warning" role="progressbar" style="width: ${serverOnlyPercent}%" 
                aria-valuenow="${serverOnlyPercent}" aria-valuemin="0" aria-valuemax="100" 
                title="Server Only: ${serverOnly} mods (${serverOnlyPercent}%)"></div>
            <div class="progress-bar bg-success" role="progressbar" style="width: ${bothPercent}%" 
                aria-valuenow="${bothPercent}" aria-valuemin="0" aria-valuemax="100" 
                title="Client & Server: ${both} mods (${bothPercent}%)"></div>
            <div class="progress-bar bg-secondary" role="progressbar" style="width: ${unknownPercent}%" 
                aria-valuenow="${unknownPercent}" aria-valuemin="0" aria-valuemax="100" 
                title="Unknown: ${unknown} mods (${unknownPercent}%)"></div>
        </div>
    `;
    
    // Update the chart element
    compatibilityChartElement.innerHTML = chartHTML;
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[title]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('mod-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const modCards = document.querySelectorAll('.mod-card');
        let visibleCount = 0;
        
        modCards.forEach(card => {
            const modName = card.dataset.modName;
            const isVisible = card.style.display !== 'none';
            
            // Only filter cards that are visible based on category filter
            if (isVisible) {
                if (modName.includes(searchTerm)) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            }
        });
        
        // Update visible mod count
        updateModCount(visibleCount);
    });
}

// Show gallery modal with images
function showGallery(modId, galleryData) {
    // Get the gallery modal elements
    const galleryModal = document.getElementById('galleryModal');
    const galleryModalLabel = document.getElementById('galleryModalLabel');
    const galleryCarouselInner = document.getElementById('galleryCarouselInner');
    
    // Parse gallery data if it's a string
    let gallery = galleryData;
    if (typeof galleryData === 'string') {
        try {
            gallery = JSON.parse(galleryData.replace(/&quot;/g, '"'));
        } catch (error) {
            console.error('Error parsing gallery data:', error);
            return;
        }
    }
    
    // Find the mod data
    const mod = window.allModDetails.find(m => m.id === modId) || { title: 'Mod' };
    if (!gallery || !Array.isArray(gallery) || gallery.length === 0) {
        console.warn('No gallery images available');
        return;
    }
    
    // Set the modal title
    galleryModalLabel.textContent = `${mod.title} Gallery`;
    
    // Clear previous carousel items
    galleryCarouselInner.innerHTML = '';
    
    // Add each gallery image to the carousel
    gallery.forEach((image, index) => {
        if (!image || !image.url) return;
        
        const carouselItem = document.createElement('div');
        carouselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
        
        const imageTitle = image.title ? image.title.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
        
        carouselItem.innerHTML = `
            <img src="${image.url}" class="d-block w-100" alt="${mod.title} screenshot ${index + 1}">
            ${imageTitle ? `<div class="carousel-caption d-none d-md-block"><p>${imageTitle}</p></div>` : ''}
        `;
        
        galleryCarouselInner.appendChild(carouselItem);
    });
    
    // Show the modal
    const bsGalleryModal = new bootstrap.Modal(galleryModal);
    bsGalleryModal.show();
}

// Show detailed mod information in modal
function showModDetails(modId) {
    // Get the mod details modal elements
    const modDetailsModal = document.getElementById('modDetailsModal');
    const modDetailsModalLabel = document.getElementById('modDetailsModalLabel');
    const modDetailsModalBody = document.getElementById('modDetailsModalBody');
    
    // Find the mod data
    const mod = window.allModDetails.find(m => m.id === modId);
    if (!mod) return;
    
    // Set the modal title
    modDetailsModalLabel.textContent = mod.title;
    
    // Format date strings
    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };
    
    // Create the modal content
    let modalContent = `
        <div class="row mb-4">
            <div class="col-md-3">
                ${mod.icon_url ? 
                  `<img src="${mod.icon_url}" class="img-fluid rounded" alt="${mod.title} icon">` : 
                  '<div class="bg-secondary d-flex align-items-center justify-content-center p-4 rounded"><span class="text-white">No Icon</span></div>'}
            </div>
            <div class="col-md-9">
                <h4>${mod.title}</h4>
                <p>${mod.description || 'No description available'}</p>
                <div class="d-flex flex-wrap">
                    ${mod.categories && mod.categories.length > 0 ? mod.categories.map(category => 
                        `<span class="badge bg-secondary me-1 mb-1">${formatCategoryName(category)}</span>`
                    ).join('') : ''}
                </div>
            </div>
        </div>
    `;
    
    // Add full description/body if available
    if (mod.body && mod.body.trim()) {
        modalContent += `
            <div class="mb-4">
                <h5>About</h5>
                <div class="mod-body">${mod.body}</div>
            </div>
        `;
    }
    
    // Add gallery if available
    if (mod.gallery && mod.gallery.length > 0) {
        modalContent += `
            <div class="mb-4">
                <h5>Gallery</h5>
                <div class="row">
                    ${mod.gallery.map(image => `
                        <div class="col-md-4 col-sm-6 mb-3">
                            <img src="${image.url}" class="img-fluid rounded" alt="${mod.title} screenshot"
                                 onclick="showGallery('${mod.id}', ${JSON.stringify(mod.gallery).replace(/"/g, '&quot;')})">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Add team members if available
    if (mod.team && mod.team.length > 0) {
        modalContent += `
            <div class="mb-4">
                <h5>Team Members</h5>
                <div class="row">
                    ${mod.team.map(member => `
                        <div class="col-md-4 col-sm-6 mb-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">${member.user?.username || member.username || 'Unknown'}</h6>
                                    <p class="card-text small">${member.role || 'Team Member'}</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Add version information if available
    if (mod.latest_version) {
        modalContent += `
            <div class="mb-4">
                <h5>Latest Version</h5>
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">${mod.latest_version.version_number || 'Unknown'}</h6>
                        <p class="card-text small">Released: ${formatDate(mod.latest_version.date_published)}</p>
                        ${mod.latest_version.downloads ? 
                          `<p class="card-text small"><i class="bi bi-download"></i> ${formatNumber(mod.latest_version.downloads)} downloads</p>` : ''}
                        ${mod.latest_version.changelog ? 
                          `<div class="mt-3">
                            <h6>Changelog</h6>
                            <div class="changelog p-2 bg-light rounded">${mod.latest_version.changelog}</div>
                          </div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Add metadata section
    modalContent += `
        <div class="mb-4">
            <h5>Additional Information</h5>
            <table class="table table-striped">
                <tbody>
                    <tr>
                        <th>Author</th>
                        <td>${mod.author || 'Unknown'}</td>
                    </tr>

                    <tr>
                        <th>Downloads</th>
                        <td>${formatNumber(mod.downloads || 0)}</td>
                    </tr>
                    <tr>
                        <th>Created</th>
                        <td>${formatDate(mod.date_created)}</td>
                    </tr>
                    <tr>
                        <th>Updated</th>
                        <td>${formatDate(mod.date_modified)}</td>
                    </tr>
                    <tr>
                        <th>Client Side</th>
                        <td>${mod.clientSide || mod.client_side || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <th>Server Side</th>
                        <td>${mod.serverSide || mod.server_side || 'Unknown'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    // Add links section
    if (mod.project_url || mod.issues_url || mod.source_url || mod.wiki_url || mod.discord_url) {
        modalContent += `
            <div class="mb-4">
                <h5>Links</h5>
                <div class="d-flex flex-wrap">
                    ${mod.project_url ? 
                      `<a href="${mod.project_url}" target="_blank" class="btn btn-outline-primary me-2 mb-2">
                        <i class="bi bi-box-arrow-up-right"></i> Modrinth
                      </a>` : ''}
                    ${mod.issues_url ? 
                      `<a href="${mod.issues_url}" target="_blank" class="btn btn-outline-danger me-2 mb-2">
                        <i class="bi bi-bug"></i> Issues
                      </a>` : ''}
                    ${mod.source_url ? 
                      `<a href="${mod.source_url}" target="_blank" class="btn btn-outline-secondary me-2 mb-2">
                        <i class="bi bi-code-square"></i> Source
                      </a>` : ''}
                    ${mod.wiki_url ? 
                      `<a href="${mod.wiki_url}" target="_blank" class="btn btn-outline-info me-2 mb-2">
                        <i class="bi bi-book"></i> Wiki
                      </a>` : ''}
                    ${mod.discord_url ? 
                      `<a href="${mod.discord_url}" target="_blank" class="btn btn-outline-primary me-2 mb-2">
                        <i class="bi bi-discord"></i> Discord
                      </a>` : ''}
                </div>
            </div>
        `;
    }
    
    // Set the modal content
    modDetailsModalBody.innerHTML = modalContent;
    
    // Show the modal
    const bsModDetailsModal = new bootstrap.Modal(modDetailsModal);
    bsModDetailsModal.show();
}
