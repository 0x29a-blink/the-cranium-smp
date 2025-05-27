// Simple changelog generation system for GitHub Pages
class ChangelogManager {
    constructor() {
        this.currentChangelog = {
            version: '',
            date: new Date().toISOString(),
            overallDescription: '',
            changes: {
                added: [],
                updated: [],
                removed: []
            }
        };
        this.changelogHistory = [];
        this.init();
    }

    async init() {
        // Load existing changelogs from GitHub repository
        await this.loadChangelogHistory();
        this.setupEventListeners();
    }

    // Load changelog history from GitHub repository
    async loadChangelogHistory() {
        try {
            // Try to load changelogs from the changelogs folder
            const response = await fetch('https://api.github.com/repos/0x29a-blink/the-cranium-smp/contents/changelogs');
            if (response.ok) {
                const files = await response.json();
                this.changelogHistory = [];
                
                for (const file of files) {
                    if (file.name.endsWith('.json') && file.name.startsWith('changelog-')) {
                        try {
                            const changelogResponse = await fetch(file.download_url);
                            if (changelogResponse.ok) {
                                const changelog = await changelogResponse.json();
                                this.changelogHistory.push(changelog);
                            }
                        } catch (error) {
                            console.warn(`Failed to load changelog ${file.name}:`, error);
                        }
                    }
                }
                
                // Sort by date
                this.changelogHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
            }
        } catch (error) {
            console.log('No existing changelogs found or GitHub API unavailable:', error);
        }
    }

    setupEventListeners() {
        // Save changelog button
        const saveBtn = document.getElementById('saveChangelog');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.downloadChangelog());
        }

        // Export changelog button  
        const exportBtn = document.getElementById('exportChangelog');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportChangelogMarkdown());
        }

        // Close changelog button
        const closeBtn = document.getElementById('closeChangelog');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideChangelog());
        }
    }

    // Compare two mod lists and generate changelog
    generateChangelog(oldMods, newMods) {
        const changes = {
            added: [],
            updated: [],
            removed: []
        };

        // Create maps for easier lookup
        const oldModMap = new Map();
        const newModMap = new Map();

        oldMods.forEach(mod => oldModMap.set(mod.name, mod));
        newMods.forEach(mod => newModMap.set(mod.name, mod));

        // Find added mods
        newMods.forEach(mod => {
            if (!oldModMap.has(mod.name)) {
                changes.added.push({
                    ...mod,
                    changelogNote: ''
                });
            }
        });

        // Find removed mods
        oldMods.forEach(mod => {
            if (!newModMap.has(mod.name)) {
                changes.removed.push({
                    ...mod,
                    changelogNote: ''
                });
            }
        });

        // Find updated mods
        newMods.forEach(mod => {
            const oldMod = oldModMap.get(mod.name);
            if (oldMod && oldMod.version !== mod.version) {
                changes.updated.push({
                    name: mod.name,
                    oldVersion: oldMod.version,
                    newVersion: mod.version,
                    mod: mod,
                    changelogNote: ''
                });
            }
        });

        // Update current changelog
        this.currentChangelog = {
            version: this.generateVersionNumber(),
            date: new Date().toISOString(),
            overallDescription: '',
            changes: changes
        };

        return this.currentChangelog;
    }

    // Generate version number based on date
    generateVersionNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    }

    // Show changelog editor
    showChangelogEditor(changelog) {
        this.currentChangelog = changelog;
        const section = document.getElementById('changelogSection');
        const content = document.getElementById('changelogContent');
        
        if (!section || !content) return;

        // Generate changelog form
        content.innerHTML = this.generateChangelogForm(changelog);
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth' });
    }

    // Generate changelog form HTML
    generateChangelogForm(changelog) {
        let html = `
            <div class="changelog-summary">
                <h3>Changelog Summary</h3>
                <div class="summary-stats">
                    <span class="stat-item added">${changelog.changes.added.length} Added</span>
                    <span class="stat-item updated">${changelog.changes.updated.length} Updated</span>
                    <span class="stat-item removed">${changelog.changes.removed.length} Removed</span>
                </div>
                
                <div class="form-group">
                    <label for="changelogVersion">Version:</label>
                    <input type="text" id="changelogVersion" value="${changelog.version}" 
                           placeholder="e.g., 2024.01.15 or v1.2.3">
                </div>
                
                <div class="form-group">
                    <label for="overallDescription">Overall Description:</label>
                    <textarea id="overallDescription" placeholder="Describe the main changes in this update..."
                              rows="3">${changelog.overallDescription}</textarea>
                </div>
            </div>
        `;

        // Added mods
        if (changelog.changes.added.length > 0) {
            html += `
                <div class="changelog-entry">
                    <div class="changelog-entry-header change-added">
                        <i class="fas fa-plus"></i> Added Mods (${changelog.changes.added.length})
                    </div>
                    <div class="changelog-entry-body">
            `;
            
            changelog.changes.added.forEach((mod, index) => {
                html += `
                    <div class="mod-changelog-item">
                        <h5>${mod.name} v${mod.version}</h5>
                        <p><strong>Author(s):</strong> ${Array.isArray(mod.authors) ? mod.authors.join(', ') : (mod.authors || 'Unknown')}</p>
                        ${mod.description ? `<p><strong>Description:</strong> ${mod.description}</p>` : ''}
                        <label>Why was this mod added?</label>
                        <textarea data-type="added" data-index="${index}" placeholder="Explain why this mod was added to the pack...">${mod.changelogNote || ''}</textarea>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        // Updated mods
        if (changelog.changes.updated.length > 0) {
            html += `
                <div class="changelog-entry">
                    <div class="changelog-entry-header change-updated">
                        <i class="fas fa-arrow-up"></i> Updated Mods (${changelog.changes.updated.length})
                    </div>
                    <div class="changelog-entry-body">
            `;
            
            changelog.changes.updated.forEach((change, index) => {
                html += `
                    <div class="mod-changelog-item">
                        <h5>${change.name}: ${change.oldVersion} → ${change.newVersion}</h5>
                        ${change.mod && change.mod.description ? `<p><strong>Description:</strong> ${change.mod.description}</p>` : ''}
                        <label>What changed in this update?</label>
                        <textarea data-type="updated" data-index="${index}" placeholder="Describe the changes, new features, or bug fixes...">${change.changelogNote || ''}</textarea>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        // Removed mods
        if (changelog.changes.removed.length > 0) {
            html += `
                <div class="changelog-entry">
                    <div class="changelog-entry-header change-removed">
                        <i class="fas fa-minus"></i> Removed Mods (${changelog.changes.removed.length})
                    </div>
                    <div class="changelog-entry-body">
            `;
            
            changelog.changes.removed.forEach((mod, index) => {
                html += `
                    <div class="mod-changelog-item">
                        <h5>${mod.name} v${mod.version}</h5>
                        <p><strong>Author(s):</strong> ${Array.isArray(mod.authors) ? mod.authors.join(', ') : (mod.authors || 'Unknown')}</p>
                        <label>Why was this mod removed?</label>
                        <textarea data-type="removed" data-index="${index}" placeholder="Explain why this mod was removed from the pack...">${mod.changelogNote || ''}</textarea>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        return html;
    }

    // Collect form data and update changelog
    updateChangelogFromForm() {
        const versionInput = document.getElementById('changelogVersion');
        const descriptionInput = document.getElementById('overallDescription');
        
        if (versionInput) {
            this.currentChangelog.version = versionInput.value || this.generateVersionNumber();
        }
        
        if (descriptionInput) {
            this.currentChangelog.overallDescription = descriptionInput.value || '';
        }

        // Collect changelog notes from textareas
        const textareas = document.querySelectorAll('#changelogContent textarea[data-type]');
        textareas.forEach(textarea => {
            const type = textarea.getAttribute('data-type');
            const index = parseInt(textarea.getAttribute('data-index'));
            const note = textarea.value.trim();
            
            if (this.currentChangelog.changes[type] && this.currentChangelog.changes[type][index]) {
                this.currentChangelog.changes[type][index].changelogNote = note;
            }
        });
    }

    // Download changelog as JSON file
    downloadChangelog() {
        this.updateChangelogFromForm();
        
        const filename = `changelog-${this.currentChangelog.version.replace(/[^a-zA-Z0-9.-]/g, '_')}.json`;
        const dataStr = JSON.stringify(this.currentChangelog, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = filename;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showMessage('success', `Changelog saved as ${filename}. Upload this file to the /changelogs folder in your GitHub repository.`);
    }

    // Export changelog as markdown
    exportChangelogMarkdown() {
        this.updateChangelogFromForm();
        
        let markdown = this.generateMarkdown(this.currentChangelog);
        
        const filename = `changelog-${this.currentChangelog.version.replace(/[^a-zA-Z0-9.-]/g, '_')}.md`;
        const dataStr = markdown;
        const dataUri = 'data:text/markdown;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', filename);
        linkElement.click();
        
        this.showMessage('success', `Changelog exported as ${filename}`);
    }

    // Generate markdown from changelog
    generateMarkdown(changelog) {
        let markdown = `# Changelog v${changelog.version}\n\n`;
        markdown += `**Date:** ${new Date(changelog.date).toLocaleDateString()}\n\n`;

        if (changelog.overallDescription) {
            markdown += `## Overview\n${changelog.overallDescription}\n\n`;
        }

        // Added mods
        if (changelog.changes.added.length > 0) {
            markdown += `## ➕ Added Mods (${changelog.changes.added.length})\n\n`;
            changelog.changes.added.forEach(mod => {
                markdown += `### ${mod.name} v${mod.version}\n`;
                if (mod.url) {
                    markdown += `**Link:** ${mod.url}\n`;
                }
                if (mod.authors) {
                    const authors = Array.isArray(mod.authors) ? mod.authors.join(', ') : mod.authors;
                    markdown += `**Author(s):** ${authors}\n`;
                }
                if (mod.description) {
                    markdown += `**Description:** ${mod.description}\n`;
                }
                if (mod.changelogNote) {
                    markdown += `**Why added:** ${mod.changelogNote}\n`;
                }
                markdown += '\n';
            });
        }

        // Updated mods
        if (changelog.changes.updated.length > 0) {
            markdown += `## 🔄 Updated Mods (${changelog.changes.updated.length})\n\n`;
            changelog.changes.updated.forEach(change => {
                markdown += `### ${change.name}: ${change.oldVersion} → ${change.newVersion}\n`;
                if (change.mod && change.mod.url) {
                    markdown += `**Link:** ${change.mod.url}\n`;
                }
                if (change.changelogNote) {
                    markdown += `**Changes:** ${change.changelogNote}\n`;
                }
                markdown += '\n';
            });
        }

        // Removed mods
        if (changelog.changes.removed.length > 0) {
            markdown += `## ➖ Removed Mods (${changelog.changes.removed.length})\n\n`;
            changelog.changes.removed.forEach(mod => {
                markdown += `### ${mod.name} v${mod.version}\n`;
                if (mod.changelogNote) {
                    markdown += `**Why removed:** ${mod.changelogNote}\n`;
                }
                markdown += '\n';
            });
        }

        markdown += '\n---\n';
        markdown += '*This changelog was generated via the Modpack Manager tool.*';

        return markdown;
    }

    // Hide changelog editor
    hideChangelog() {
        const section = document.getElementById('changelogSection');
        if (section) {
            section.style.display = 'none';
        }
    }

    // Display message to user
    showMessage(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `${type}-message`;
        alertDiv.innerHTML = message;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }

    // Get changelog history for display
    getChangelogHistory() {
        return this.changelogHistory;
    }

    // Display changelog history (optional feature)
    displayChangelogHistory() {
        if (this.changelogHistory.length === 0) {
            return '<p>No previous changelogs found.</p>';
        }

        let html = '<div class="changelog-history">';
        html += '<h3>Previous Changelogs</h3>';
        
        this.changelogHistory.forEach(changelog => {
            const date = new Date(changelog.date).toLocaleDateString();
            const totalChanges = changelog.changes.added.length + 
                               changelog.changes.updated.length + 
                               changelog.changes.removed.length;
            
            html += `
                <div class="changelog-history-item">
                    <h4>v${changelog.version} - ${date}</h4>
                    <p>${changelog.overallDescription || 'No description provided'}</p>
                    <div class="changelog-stats">
                        <span class="stat added">${changelog.changes.added.length} added</span>
                        <span class="stat updated">${changelog.changes.updated.length} updated</span>
                        <span class="stat removed">${changelog.changes.removed.length} removed</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
}

// Initialize changelog manager
window.changelogManager = new ChangelogManager();