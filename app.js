// Main application controller
class ModpackManager {
    constructor() {
        this.modAPI = new ModAPI();
        this.changelogManager = new ChangelogManager();
        this.dataProcessor = DataProcessor;
        this.mods = [];
        this.enrichedMods = [];
        this.filteredMods = [];
        this.currentView = 'list'; // Changed default to list
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadModData();
        this.updateStatistics();
        this.setView('list'); // Set list view as default
        this.renderMods();
    }

    setupEventListeners() {
        // Search and filter controls
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterAndSort();
        });

        document.getElementById('platformFilter').addEventListener('change', (e) => {
            this.filterAndSort();
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.filterAndSort();
        });

        // View toggle - now includes compact mode
        document.getElementById('gridView').addEventListener('click', () => {
            this.setView('grid');
        });

        document.getElementById('listView').addEventListener('click', () => {
            this.setView('list');
        });

        document.getElementById('compactView').addEventListener('click', () => {
            this.setView('compact');
        });

        // Compare functionality
        document.getElementById('compareBtn').addEventListener('click', () => {
            document.getElementById('compareModal').style.display = 'block';
        });

        document.getElementById('closeCompareModal').addEventListener('click', () => {
            document.getElementById('compareModal').style.display = 'none';
        });

        document.getElementById('compareFile').addEventListener('change', (e) => {
            this.handleCompareFile(e.target.files[0]);
        });

        // Export functionality
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportModList();
        });

        // Changelog controls
        document.getElementById('closeChangelog').addEventListener('click', () => {
            document.getElementById('changelogSection').style.display = 'none';
        });

        document.getElementById('saveChangelog').addEventListener('click', () => {
            this.saveCurrentChangelog();
        });

        document.getElementById('exportChangelog').addEventListener('click', () => {
            this.exportCurrentChangelog();
        });

        // Modal controls
        document.getElementById('closeModModal').addEventListener('click', () => {
            document.getElementById('modModal').style.display = 'none';
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            const compareModal = document.getElementById('compareModal');
            const modModal = document.getElementById('modModal');
            
            if (e.target === compareModal) {
                compareModal.style.display = 'none';
            }
            if (e.target === modModal) {
                modModal.style.display = 'none';
            }
        });
    }

    async loadModData() {
        try {
            // Load the cfmod.json file
            const response = await fetch('cfmod.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.mods = await response.json();
            
            // Process mods to add platform and search text
            this.mods = this.dataProcessor.processModList(this.mods);
            
            // Show loading indicator
            document.getElementById('loadingIndicator').style.display = 'block';
            
            // Enrich mods with API data
            this.enrichedMods = await this.modAPI.fetchBatchModData(
                this.mods, 
                (current, total) => {
                    this.updateLoadingProgress(current, total);
                }
            );
            
            // Hide loading indicator
            document.getElementById('loadingIndicator').style.display = 'none';
            
            // Set initial filtered mods
            this.filteredMods = [...this.enrichedMods];
            
        } catch (error) {
            console.error('Error loading mod data:', error);
            this.showError('Failed to load mod data. Please check that cfmod.json exists and is valid.');
        }
    }

    updateLoadingProgress(current, total) {
        const percentage = Math.round((current / total) * 100);
        const loadingElement = document.querySelector('#loadingIndicator span');
        if (loadingElement) {
            loadingElement.textContent = `Loading mod information... ${current}/${total} (${percentage}%)`;
        }
    }

    updateStatistics() {
        const stats = this.dataProcessor.getStatistics(this.enrichedMods);
        
        document.getElementById('totalMods').textContent = stats.total;
        document.getElementById('curseforgeCount').textContent = stats.curseforge;
        document.getElementById('modrinthCount').textContent = stats.modrinth;
        document.getElementById('githubCount').textContent = stats.github;
    }

    filterAndSort() {
        const searchTerm = document.getElementById('searchInput').value;
        const platformFilter = document.getElementById('platformFilter').value;
        const sortBy = document.getElementById('sortBy').value;

        // Filter mods
        this.filteredMods = this.dataProcessor.filterMods(
            this.enrichedMods, 
            searchTerm, 
            platformFilter
        );

        // Sort mods
        this.filteredMods = this.dataProcessor.sortMods(this.filteredMods, sortBy);

        this.renderMods();
    }

    setView(view) {
        this.currentView = view;
        
        // Update button states
        document.getElementById('gridView').classList.toggle('active', view === 'grid');
        document.getElementById('listView').classList.toggle('active', view === 'list');
        document.getElementById('compactView').classList.toggle('active', view === 'compact');
        
        // Update grid class
        const modGrid = document.getElementById('modGrid');
        modGrid.classList.remove('list-view', 'compact-view');
        if (view === 'list') {
            modGrid.classList.add('list-view');
        } else if (view === 'compact') {
            modGrid.classList.add('compact-view');
        }
        
        this.renderMods();
    }

    renderMods() {
        const modGrid = document.getElementById('modGrid');
        modGrid.innerHTML = '';

        this.filteredMods.forEach((mod, index) => {
            const modCard = this.createModCard(mod);
            modGrid.appendChild(modCard);
            
            // Add staggered animation
            setTimeout(() => {
                modCard.style.opacity = '1';
                modCard.style.transform = 'translateY(0)';
            }, index * 25); // Faster animation for list views
        });

        if (this.filteredMods.length === 0) {
            modGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                    <h3>No mods found</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                </div>
            `;
        }
    }

    createModCard(mod) {
        const card = document.createElement('div');
        card.className = `mod-card ${this.currentView === 'compact' ? 'compact' : ''}`;
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        const platformClass = `platform-${mod.platform}`;
        const authors = Array.isArray(mod.authors) ? mod.authors.join(', ') : (mod.authors || 'Unknown');
        const description = mod.description || 'No description available';
        
        // Different layouts for different views
        if (this.currentView === 'compact') {
            card.innerHTML = `
                <div class="mod-compact-content">
                    <div class="mod-main-info">
                        <div class="mod-name">${this.escapeHtml(mod.name)}</div>
                        <div class="mod-version">v${this.escapeHtml(mod.version)}</div>
                        <div class="mod-authors">${this.escapeHtml(authors)}</div>
                    </div>
                    <div class="mod-platform-info">
                        <span class="platform-badge ${platformClass}">
                            ${this.getPlatformIcon(mod.platform)} ${this.capitalizeFirst(mod.platform)}
                        </span>
                    </div>
                    <div class="mod-actions">
                        ${mod.hasValidUrl ? `
                            <a href="${mod.url}" target="_blank" class="mod-link" title="View on ${this.capitalizeFirst(mod.platform)}">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        ` : ''}
                        <button class="mod-link" onclick="modpackManager.showModDetails('${mod.name.replace(/'/g, "\\'")}')" title="View Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="mod-card-header">
                    <div class="mod-name">${this.escapeHtml(mod.name)}</div>
                    <div class="mod-version">v${this.escapeHtml(mod.version)}</div>
                </div>
                <div class="mod-card-body">
                    <div class="mod-authors">by ${this.escapeHtml(authors)}</div>
                    ${this.currentView === 'list' ? `<div class="mod-description">${this.escapeHtml(this.truncateText(description, 150))}</div>` : ''}
                    ${mod.downloadCount ? `<div class="mod-stats"><i class="fas fa-download"></i> ${this.formatNumber(mod.downloadCount)} downloads</div>` : ''}
                </div>
                <div class="mod-card-footer">
                    <span class="platform-badge ${platformClass}">
                        ${this.getPlatformIcon(mod.platform)} ${this.capitalizeFirst(mod.platform)}
                    </span>
                    <div class="mod-links">
                        ${mod.hasValidUrl ? `
                            <a href="${mod.url}" target="_blank" class="mod-link" title="View on ${this.capitalizeFirst(mod.platform)}">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        ` : ''}
                        <button class="mod-link" onclick="modpackManager.showModDetails('${mod.name.replace(/'/g, "\\'")}')" title="View Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        return card;
    }

    showModDetails(modName) {
        const mod = this.enrichedMods.find(m => m.name === modName);
        if (!mod) return;

        const modal = document.getElementById('modModal');
        const title = document.getElementById('modModalTitle');
        const body = document.getElementById('modModalBody');

        title.textContent = mod.name;
        
        const authors = Array.isArray(mod.authors) ? mod.authors.join(', ') : (mod.authors || 'Unknown');
        const platformClass = `platform-${mod.platform}`;
        
        body.innerHTML = `
            <div class="mod-detail-header">
                <div class="mod-detail-title">
                    <h2>${this.escapeHtml(mod.name)}</h2>
                    <span class="platform-badge ${platformClass}">
                        ${this.getPlatformIcon(mod.platform)} ${this.capitalizeFirst(mod.platform)}
                    </span>
                </div>
                <div class="mod-detail-version">Version: ${this.escapeHtml(mod.version)}</div>
                <div class="mod-detail-authors">Author(s): ${this.escapeHtml(authors)}</div>
            </div>
            
            <div class="mod-detail-body">
                <div class="mod-description">
                    <h3>Description</h3>
                    <p>${this.escapeHtml(mod.description || 'No description available')}</p>
                </div>
                
                ${mod.downloadCount ? `
                    <div class="mod-stats">
                        <h3>Statistics</h3>
                        <ul>
                            <li><i class="fas fa-download"></i> Downloads: ${this.formatNumber(mod.downloadCount)}</li>
                            ${mod.stars ? `<li><i class="fas fa-star"></i> Stars: ${this.formatNumber(mod.stars)}</li>` : ''}
                            ${mod.forks ? `<li><i class="fas fa-code-branch"></i> Forks: ${this.formatNumber(mod.forks)}</li>` : ''}
                        </ul>
                    </div>
                ` : ''}
                
                ${mod.categories && mod.categories.length > 0 ? `
                    <div class="mod-categories">
                        <h3>Categories</h3>
                        <div class="category-tags">
                            ${mod.categories.map(cat => `<span class="category-tag">${this.escapeHtml(cat)}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${mod.gameVersions && mod.gameVersions.length > 0 ? `
                    <div class="mod-versions">
                        <h3>Supported Game Versions</h3>
                        <div class="version-tags">
                            ${mod.gameVersions.slice(0, 10).map(ver => `<span class="version-tag">${this.escapeHtml(ver)}</span>`).join('')}
                            ${mod.gameVersions.length > 10 ? `<span class="version-tag">+${mod.gameVersions.length - 10} more</span>` : ''}
                        </div>
                    </div>
                ` : ''}
                
                <div class="mod-actions">
                    ${mod.hasValidUrl ? `
                        <a href="${mod.url}" target="_blank" class="btn btn-primary">
                            <i class="fas fa-external-link-alt"></i> View on ${this.capitalizeFirst(mod.platform)}
                        </a>
                    ` : `
                        <span class="btn btn-disabled">
                            <i class="fas fa-link-slash"></i> No URL available
                        </span>
                    `}
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    async handleCompareFile(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const oldMods = JSON.parse(text);
            
            // Process old mods
            const processedOldMods = this.dataProcessor.processModList(oldMods);
            
            // Compare with current mods
            const changes = this.dataProcessor.compareMods(processedOldMods, this.mods);
            
            // Show comparison results
            this.showComparisonResults(changes);
            
            // Create changelog if there are changes
            if (changes.added.length > 0 || changes.removed.length > 0 || changes.updated.length > 0) {
                const changelog = this.changelogManager.createChangelog(changes);
                this.showChangelogEditor(changelog);
            }
            
        } catch (error) {
            console.error('Error comparing files:', error);
            this.showError('Error comparing files. Please ensure the file is a valid JSON modlist.');
        }
    }

    showComparisonResults(changes) {
        const resultDiv = document.getElementById('comparisonResult');
        
        let html = '<h3>Comparison Results</h3>';
        
        if (changes.added.length === 0 && changes.removed.length === 0 && changes.updated.length === 0) {
            html += '<p>No changes detected between the mod lists.</p>';
        } else {
            html += `<p>Found ${changes.added.length + changes.removed.length + changes.updated.length} changes:</p>`;
            
            if (changes.added.length > 0) {
                html += `<div class="change-item change-added">
                    <h4><i class="fas fa-plus"></i> Added Mods (${changes.added.length})</h4>
                    <ul>${changes.added.map(mod => `<li>${this.escapeHtml(mod.name)} v${this.escapeHtml(mod.version)}</li>`).join('')}</ul>
                </div>`;
            }
            
            if (changes.updated.length > 0) {
                html += `<div class="change-item change-updated">
                    <h4><i class="fas fa-arrow-up"></i> Updated Mods (${changes.updated.length})</h4>
                    <ul>${changes.updated.map(change => `<li>${this.escapeHtml(change.name)}: ${this.escapeHtml(change.oldVersion)} → ${this.escapeHtml(change.newVersion)}</li>`).join('')}</ul>
                </div>`;
            }
            
            if (changes.removed.length > 0) {
                html += `<div class="change-item change-removed">
                    <h4><i class="fas fa-minus"></i> Removed Mods (${changes.removed.length})</h4>
                    <ul>${changes.removed.map(mod => `<li>${this.escapeHtml(mod.name)} v${this.escapeHtml(mod.version)}</li>`).join('')}</ul>
                </div>`;
            }
        }
        
        resultDiv.innerHTML = html;
    }

    showChangelogEditor(changelog) {
        document.getElementById('compareModal').style.display = 'none';
        
        const changelogSection = document.getElementById('changelogSection');
        const changelogContent = document.getElementById('changelogContent');
        
        let html = `
            <div class="changelog-summary">
                <h3>Changelog v${changelog.version}</h3>
                <p>${this.changelogManager.generateSummary(changelog.id)}</p>
            </div>
            
            <div class="changelog-entry">
                <div class="changelog-entry-header">
                    <i class="fas fa-edit"></i> Overall Changelog
                </div>
                <div class="changelog-entry-body">
                    <textarea id="overall-changelog" placeholder="Describe the overall changes in this update..."></textarea>
                </div>
            </div>
        `;
        
        // Added mods
        if (changelog.changes.added.length > 0) {
            html += `<h4><i class="fas fa-plus"></i> Added Mods</h4>`;
            changelog.changes.added.forEach(mod => {
                html += `
                    <div class="changelog-entry">
                        <div class="changelog-entry-header">
                            ${this.escapeHtml(mod.name)} v${this.escapeHtml(mod.version)}
                        </div>
                        <div class="changelog-entry-body">
                            <textarea id="added-${mod.name}" placeholder="Why was this mod added? What does it bring to the pack?"></textarea>
                        </div>
                    </div>
                `;
            });
        }
        
        // Updated mods
        if (changelog.changes.updated.length > 0) {
            html += `<h4><i class="fas fa-arrow-up"></i> Updated Mods</h4>`;
            changelog.changes.updated.forEach(change => {
                html += `
                    <div class="changelog-entry">
                        <div class="changelog-entry-header">
                            ${this.escapeHtml(change.name)}: ${this.escapeHtml(change.oldVersion)} → ${this.escapeHtml(change.newVersion)}
                        </div>
                        <div class="changelog-entry-body">
                            <textarea id="updated-${change.name}" placeholder="What changed in this update? Bug fixes, new features, etc."></textarea>
                        </div>
                    </div>
                `;
            });
        }
        
        // Removed mods
        if (changelog.changes.removed.length > 0) {
            html += `<h4><i class="fas fa-minus"></i> Removed Mods</h4>`;
            changelog.changes.removed.forEach(mod => {
                html += `
                    <div class="changelog-entry">
                        <div class="changelog-entry-header">
                            ${this.escapeHtml(mod.name)} v${this.escapeHtml(mod.version)}
                        </div>
                        <div class="changelog-entry-body">
                            <textarea id="removed-${mod.name}" placeholder="Why was this mod removed? Compatibility issues, replacement, etc."></textarea>
                        </div>
                    </div>
                `;
            });
        }
        
        changelogContent.innerHTML = html;
        changelogSection.style.display = 'block';
        changelogSection.scrollIntoView({ behavior: 'smooth' });
    }

    saveCurrentChangelog() {
        const currentChangelog = this.changelogManager.currentChanges;
        if (!currentChangelog) return;

        // Save overall changelog
        const overallText = document.getElementById('overall-changelog')?.value || '';
        this.changelogManager.updateChangelogEntry(currentChangelog.id, 'overall', null, overallText);

        // Save individual mod entries
        currentChangelog.changes.added.forEach(mod => {
            const text = document.getElementById(`added-${mod.name}`)?.value || '';
            this.changelogManager.updateChangelogEntry(currentChangelog.id, 'added', mod.name, text);
        });

        currentChangelog.changes.updated.forEach(change => {
            const text = document.getElementById(`updated-${change.name}`)?.value || '';
            this.changelogManager.updateChangelogEntry(currentChangelog.id, 'updated', change.name, text);
        });

        currentChangelog.changes.removed.forEach(mod => {
            const text = document.getElementById(`removed-${mod.name}`)?.value || '';
            this.changelogManager.updateChangelogEntry(currentChangelog.id, 'removed', mod.name, text);
        });

        this.showSuccess('Changelog saved successfully!');
    }

    exportCurrentChangelog() {
        const currentChangelog = this.changelogManager.currentChanges;
        if (!currentChangelog) return;

        const format = prompt('Export format (markdown/html/json):', 'markdown');
        if (!format) return;

        let content, filename, mimeType;

        switch (format.toLowerCase()) {
            case 'markdown':
                content = this.changelogManager.exportAsMarkdown(currentChangelog.id);
                filename = `changelog-v${currentChangelog.version}.md`;
                mimeType = 'text/markdown';
                break;
            case 'html':
                content = this.changelogManager.exportAsHtml(currentChangelog.id);
                filename = `changelog-v${currentChangelog.version}.html`;
                mimeType = 'text/html';
                break;
            case 'json':
                content = JSON.stringify(currentChangelog, null, 2);
                filename = `changelog-v${currentChangelog.version}.json`;
                mimeType = 'application/json';
                break;
            default:
                this.showError('Invalid format. Please use markdown, html, or json.');
                return;
        }

        this.downloadFile(content, filename, mimeType);
    }

    exportModList() {
        const format = prompt('Export format (json/csv/markdown):', 'json');
        if (!format) return;

        let content, filename, mimeType;

        switch (format.toLowerCase()) {
            case 'json':
                content = JSON.stringify(this.filteredMods, null, 2);
                filename = 'modlist.json';
                mimeType = 'application/json';
                break;
            case 'csv':
                content = this.exportAsCSV(this.filteredMods);
                filename = 'modlist.csv';
                mimeType = 'text/csv';
                break;
            case 'markdown':
                content = this.exportAsMarkdown(this.filteredMods);
                filename = 'modlist.md';
                mimeType = 'text/markdown';
                break;
            default:
                this.showError('Invalid format. Please use json, csv, or markdown.');
                return;
        }

        this.downloadFile(content, filename, mimeType);
    }

    exportAsCSV(mods) {
        const headers = ['Name', 'Version', 'Authors', 'Platform', 'URL', 'Description'];
        const rows = mods.map(mod => [
            mod.name,
            mod.version,
            Array.isArray(mod.authors) ? mod.authors.join(';') : mod.authors,
            mod.platform,
            mod.url || '',
            mod.description || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
            .join('\n');

        return csvContent;
    }

    exportAsMarkdown(mods) {
        let markdown = '# Mod List\n\n';
        markdown += `Total mods: ${mods.length}\n\n`;
        
        const groupedMods = mods.reduce((acc, mod) => {
            if (!acc[mod.platform]) acc[mod.platform] = [];
            acc[mod.platform].push(mod);
            return acc;
        }, {});

        Object.entries(groupedMods).forEach(([platform, platformMods]) => {
            markdown += `## ${this.capitalizeFirst(platform)} (${platformMods.length})\n\n`;
            platformMods.forEach(mod => {
                const authors = Array.isArray(mod.authors) ? mod.authors.join(', ') : mod.authors;
                markdown += `- **${mod.name}** v${mod.version} by ${authors}`;
                if (mod.hasValidUrl) {
                    markdown += ` - [Link](${mod.url})`;
                }
                markdown += '\n';
                if (mod.description && mod.description !== 'No description available') {
                    markdown += `  ${mod.description}\n`;
                }
                markdown += '\n';
            });
        });

        return markdown;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getPlatformIcon(platform) {
        const icons = {
            curseforge: '<i class="fas fa-fire"></i>',
            modrinth: '<i class="fas fa-cube"></i>',
            github: '<i class="fab fa-github"></i>',
            other: '<i class="fas fa-globe"></i>'
        };
        return icons[platform] || icons.other;
    }

    showError(message) {
        alert('Error: ' + message);
    }

    showSuccess(message) {
        alert('Success: ' + message);
    }
}

// Initialize the modpack manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.modpackManager = new ModpackManager();
});