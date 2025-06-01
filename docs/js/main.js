// Main JavaScript file for Cranium Modpacks
// Handles loading and displaying modpack information

document.addEventListener('DOMContentLoaded', function() {
    // This will run when the modpack detail page loads
    if (document.getElementById('mod-list-container')) {
        loadModpackDetails();
    }
    
    // Initialize search functionality
    initializeSearch();
    
    // Add category filter functionality if on the modpack details page
    initializeCategoryFilters();
});

// Function to load modpack details from the pre-generated enhanced modpack data file
async function loadModpackDetails() {
    try {
        const modpackId = new URLSearchParams(window.location.search).get('id') || 'cranium-aeternum';
        
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
        window.allModDetails = enhancedData.mods;
        
        // Update compatibility chart
        updateCompatibilityChart(enhancedData.mods, null, enhancedData.compatibility);
        
        // Add category badges
        if (enhancedData.categories && enhancedData.categories.length > 0) {
            addCategoryFilters(enhancedData.categories);
        } else if (enhancedData.modpack && enhancedData.modpack.categories && enhancedData.modpack.categories.length > 0) {
            // Fallback to modpack categories if mod categories aren't available
            addCategoryFilters(enhancedData.modpack.categories);
        }
        
        // Load mod list with enhanced details
        loadModList(enhancedData.mods);
    } catch (error) {
        console.error('Error loading modpack details:', error);
        document.getElementById('mod-list-container').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error loading modpack details. Please try again later.
            </div>
        `;
        
        // Clear loading spinner from compatibility chart
        const compatibilityChart = document.getElementById('compatibility-chart');
        if (compatibilityChart) {
            compatibilityChart.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> Couldn't load compatibility information.
                </div>
            `;
        }
    }
}

// Update the modpack information section
function updateModpackInfo(data) {
    const titleElement = document.getElementById('modpack-title');
    const versionElement = document.getElementById('modpack-version');
    const mcVersionElement = document.getElementById('minecraft-version');
    const forgeVersionElement = document.getElementById('forge-version');
    const descriptionElement = document.getElementById('modpack-description');
    const downloadBtnElement = document.querySelector('.download-btn');
    
    if (titleElement) titleElement.textContent = data.name || 'The Cranium: Aeternum';
    if (versionElement) versionElement.textContent = data.version || '1.0.4';
    if (mcVersionElement) mcVersionElement.textContent = data.dependencies?.minecraft || '1.20.1';
    if (forgeVersionElement) forgeVersionElement.textContent = data.dependencies?.forge || '47.4.1';
    if (descriptionElement) descriptionElement.textContent = data.description || 'A comprehensive modpack for Minecraft.';
    
    // Update download button with the correct filename
    if (downloadBtnElement) {
        const modpackFilename = data.name ? data.name.replace(/\s+/g, '') + '.mrpack' : 'CraniumAeternum.mrpack';
        downloadBtnElement.setAttribute('href', modpackFilename);
    }
    
    // Update page title
    document.title = `${data.name || 'The Cranium: Aeternum'} - Modpack Details`;
    
    // Add author information if available
    if (data.author) {
        const headerElement = document.querySelector('.modpack-header');
        if (headerElement) {
            const authorElement = document.createElement('div');
            authorElement.classList.add('mt-2', 'text-light');
            authorElement.innerHTML = `<i class="bi bi-person"></i> Created by: ${data.author}`;
            
            const badgesContainer = headerElement.querySelector('.col-md-8');
            if (badgesContainer) {
                badgesContainer.appendChild(authorElement);
            }
        }
    }
}

// Load the mod list with enhanced details
async function loadModList(modDetails) {
    const modListContainer = document.getElementById('mod-list-container');
    if (!modListContainer) return;
    
    // Sort mods alphabetically by title
    modDetails.sort((a, b) => a.title.localeCompare(b.title));
    
    try {
        const modCards = [];
        
        // Create a card for each mod with enhanced details
        for (const mod of modDetails) {
            // Create category badges if available
            let categoryBadges = '';
            if (mod.categories && mod.categories.length > 0) {
                categoryBadges = '<div class="mt-2">';
                mod.categories.slice(0, 3).forEach(category => {
                    const formattedCategory = formatCategoryName(category);
                    categoryBadges += `<span class="badge bg-secondary me-1 category-badge" data-category="${category}">${formattedCategory}</span>`;
                });
                if (mod.categories.length > 3) {
                    categoryBadges += `<span class="badge bg-secondary">+${mod.categories.length - 3} more</span>`;
                }
                categoryBadges += '</div>';
            }
            
            // Create compatibility badge
            let compatBadge = '';
            if (mod.client_side && mod.server_side) {
                let badgeClass = 'bg-secondary';
                let badgeText = 'Unknown';
                let badgeIcon = 'question-circle';
                
                if (mod.client_side === 'required' && mod.server_side === 'required') {
                    badgeClass = 'bg-success';
                    badgeText = 'Client & Server';
                    badgeIcon = 'check-circle';
                } else if (mod.client_side === 'required' && mod.server_side === 'unsupported') {
                    badgeClass = 'bg-info';
                    badgeText = 'Client Only';
                    badgeIcon = 'laptop';
                } else if (mod.client_side === 'unsupported' && mod.server_side === 'required') {
                    badgeClass = 'bg-warning';
                    badgeText = 'Server Only';
                    badgeIcon = 'server';
                }
                
                compatBadge = `<span class="badge ${badgeClass} me-2"><i class="bi bi-${badgeIcon}"></i> ${badgeText}</span>`;
            }
            
            const modCard = `
                <div class="card mod-card mb-3" data-mod-name="${mod.title.toLowerCase()}" data-categories="${mod.categories ? JSON.stringify(mod.categories) : '[]'}">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-auto">
                                ${mod.icon_url ? `<img src="${mod.icon_url}" class="mod-icon" alt="${mod.title} icon">` : 
                                '<div class="mod-icon bg-secondary d-flex align-items-center justify-content-center"><span class="text-white">?</span></div>'}
                            </div>
                            <div class="col">
                                <h5 class="card-title">${mod.title}</h5>
                                <div class="d-flex align-items-center mb-2">
                                    ${compatBadge}
                                    <small class="text-muted">Size: ${formatFileSize(mod.fileSize)}</small>
                                </div>
                                <p class="card-text small">${mod.description.length > 150 ? mod.description.substring(0, 150) + '...' : mod.description}</p>
                                ${categoryBadges}
                                <div class="d-flex justify-content-between align-items-center mt-2">
                                    ${mod.author ? `<small class="text-muted"><i class="bi bi-person"></i> ${mod.author}</small>` : ''}
                                    ${mod.project_url ? 
                                    `<a href="${mod.project_url}" target="_blank" class="btn btn-sm btn-outline-primary">
                                        <i class="bi bi-box-arrow-up-right"></i> View on Modrinth
                                    </a>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            modCards.push(modCard);
        }
        
        // Update the mod list container
        if (modCards.length > 0) {
            modListContainer.innerHTML = modCards.join('');
            
            // Add click event to category badges
            document.querySelectorAll('.category-badge').forEach(badge => {
                badge.addEventListener('click', function() {
                    const category = this.dataset.category;
                    filterModsByCategory(category);
                    
                    // Update active filter button
                    document.querySelectorAll('.filter-btn').forEach(btn => {
                        btn.classList.remove('active');
                        if (btn.dataset.category === category) {
                            btn.classList.add('active');
                        }
                    });
                });
            });
        } else {
            modListContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> No mods found matching your criteria.
                </div>
            `;
        }
        
        // Update mod count
        const modCountElement = document.getElementById('mod-count');
        if (modCountElement) {
            modCountElement.textContent = modDetails.length;
        }
    } catch (error) {
        console.error('Error displaying mod list:', error);
        modListContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error displaying mod list. Please try again later.
            </div>
        `;
    }
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
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
            // Only search in visible cards (respecting category filters)
            if (card.style.display !== 'none' || card.style.display === '') {
                const title = card.querySelector('.card-title').textContent.toLowerCase();
                const description = card.querySelector('.card-text') ? 
                                  card.querySelector('.card-text').textContent.toLowerCase() : '';
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            }
        });
        
        // Update visible count
        updateVisibleModCount(visibleCount);
    });
}

// Update visible mod count
function updateVisibleModCount(count) {
    const modCountElement = document.getElementById('mod-count');
    if (!modCountElement) return;
    
    if (count !== undefined) {
        modCountElement.textContent = count;
    } else {
        // Count visible mods
        const visibleMods = Array.from(document.querySelectorAll('.mod-card')).filter(card => 
            card.style.display !== 'none').length;
        modCountElement.textContent = visibleMods;
    }
}

// Extract unique categories from mod details
function extractCategories(modDetails) {
    const categoriesSet = new Set();
    
    modDetails.forEach(mod => {
        if (mod.categories && mod.categories.length > 0) {
            mod.categories.forEach(category => categoriesSet.add(category));
        }
    });
    
    return Array.from(categoriesSet).sort();
}

// Update compatibility chart with mod statistics
function updateCompatibilityChart(modDetails, parser, precomputedCompatInfo = null) {
    const compatibilityChart = document.getElementById('compatibility-chart');
    if (!compatibilityChart) return;
    
    try {
        // Get compatibility information
        let compatInfo;
        if (precomputedCompatInfo) {
            // Use precomputed compatibility info if available
            compatInfo = precomputedCompatInfo;
        } else if (parser) {
            // Otherwise calculate it using the parser
            compatInfo = parser.getCompatibilityInfo(modDetails);
        } else {
            // Fallback to calculating it directly
            compatInfo = {
                clientOnly: 0,
                serverOnly: 0,
                both: 0,
                unknown: 0
            };
            
            modDetails.forEach(mod => {
                if (mod.client_side === 'required' && mod.server_side === 'unsupported') {
                    compatInfo.clientOnly++;
                } else if (mod.client_side === 'unsupported' && mod.server_side === 'required') {
                    compatInfo.serverOnly++;
                } else if (mod.client_side === 'required' && mod.server_side === 'required') {
                    compatInfo.both++;
                } else {
                    compatInfo.unknown++;
                }
            });
        }
        
        // Calculate percentages
        const total = compatInfo.clientOnly + compatInfo.serverOnly + compatInfo.both + compatInfo.unknown;
        const clientOnlyPercent = Math.round((compatInfo.clientOnly / total) * 100);
        const serverOnlyPercent = Math.round((compatInfo.serverOnly / total) * 100);
        const bothPercent = Math.round((compatInfo.both / total) * 100);
        const unknownPercent = Math.round((compatInfo.unknown / total) * 100);
        
        // Create the chart HTML
        compatibilityChart.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="progress mb-2" style="height: 25px;">
                        <div class="progress-bar bg-success" role="progressbar" style="width: ${bothPercent}%" 
                            aria-valuenow="${bothPercent}" aria-valuemin="0" aria-valuemax="100">
                            <i class="bi bi-check-circle"></i> Both (${compatInfo.both})
                        </div>
                    </div>
                    <div class="progress mb-2" style="height: 25px;">
                        <div class="progress-bar bg-info" role="progressbar" style="width: ${clientOnlyPercent}%" 
                            aria-valuenow="${clientOnlyPercent}" aria-valuemin="0" aria-valuemax="100">
                            <i class="bi bi-laptop"></i> Client Only (${compatInfo.clientOnly})
                        </div>
                    </div>
                    <div class="progress mb-2" style="height: 25px;">
                        <div class="progress-bar bg-warning" role="progressbar" style="width: ${serverOnlyPercent}%" 
                            aria-valuenow="${serverOnlyPercent}" aria-valuemin="0" aria-valuemax="100">
                            <i class="bi bi-server"></i> Server Only (${compatInfo.serverOnly})
                        </div>
                    </div>
                    <div class="progress" style="height: 25px;">
                        <div class="progress-bar bg-secondary" role="progressbar" style="width: ${unknownPercent}%" 
                            aria-valuenow="${unknownPercent}" aria-valuemin="0" aria-valuemax="100">
                            <i class="bi bi-question-circle"></i> Unknown (${compatInfo.unknown})
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5>Compatibility Legend</h5>
                            <ul class="list-unstyled">
                                <li><span class="badge bg-success"><i class="bi bi-check-circle"></i> Both</span> - Required on both client and server</li>
                                <li><span class="badge bg-info"><i class="bi bi-laptop"></i> Client Only</span> - Only needed on client</li>
                                <li><span class="badge bg-warning"><i class="bi bi-server"></i> Server Only</span> - Only needed on server</li>
                                <li><span class="badge bg-secondary"><i class="bi bi-question-circle"></i> Unknown</span> - Compatibility unknown</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error updating compatibility chart:', error);
        compatibilityChart.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> Couldn't load compatibility information.
            </div>
        `;
    }
}

// Format category name for display
function formatCategoryName(category) {
    return category
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Add category filters to the page
function addCategoryFilters(categories) {
    const filterContainer = document.getElementById('category-filters');
    if (!filterContainer) return;
    
    // Clear existing filters
    filterContainer.innerHTML = '';
    
    // Add 'All' filter
    const allFilter = document.createElement('button');
    allFilter.classList.add('btn', 'btn-outline-primary', 'me-2', 'mb-2', 'filter-btn', 'active');
    allFilter.setAttribute('data-category', 'all');
    allFilter.textContent = 'All';
    filterContainer.appendChild(allFilter);
    
    // Add category filters
    categories.forEach(category => {
        const button = document.createElement('button');
        button.classList.add('btn', 'btn-outline-primary', 'me-2', 'mb-2', 'filter-btn');
        button.setAttribute('data-category', category);
        button.textContent = formatCategoryName(category);
        filterContainer.appendChild(button);
    });
}

// Initialize category filter functionality
function initializeCategoryFilters() {
    document.addEventListener('click', function(event) {
        if (event.target.closest('.filter-btn')) {
            const button = event.target.closest('.filter-btn');
            
            // Remove active class from all buttons
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Filter mods by category
            const category = button.getAttribute('data-category');
            filterModsByCategory(category);
        }
    });
}

// Filter mods by category
function filterModsByCategory(category) {
    if (!window.allModDetails) return;
    
    const modCards = document.querySelectorAll('.mod-card');
    
    if (category === 'all') {
        // Show all mods
        modCards.forEach(card => card.style.display = '');
    } else {
        // Filter based on category data
        modCards.forEach(card => {
            const categories = JSON.parse(card.dataset.categories || '[]');
            card.style.display = categories.includes(category) ? '' : 'none';
        });
    }
    
    // Update visible count
    updateVisibleModCount();
}
