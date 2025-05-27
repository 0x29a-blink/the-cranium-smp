// Changelog management system
class ChangelogManager {
    constructor() {
        this.changelogs = new Map();
        this.currentChanges = null;
        this.storageKey = 'modpack_changelogs';
        this.loadChangelogs();
    }

    // Load changelogs from localStorage
    loadChangelogs() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.changelogs = new Map(data.changelogs || []);
            }
        } catch (error) {
            console.error('Error loading changelogs:', error);
        }
    }

    // Save changelogs to localStorage
    saveChangelogs() {
        try {
            const data = {
                changelogs: Array.from(this.changelogs.entries()),
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving changelogs:', error);
        }
    }

    // Generate changelog ID based on timestamp
    generateChangelogId() {
        return `changelog_${Date.now()}`;
    }

    // Create a new changelog from mod comparison
    createChangelog(changes, version = null) {
        const changelogId = this.generateChangelogId();
        const changelog = {
            id: changelogId,
            version: version || this.generateVersionNumber(),
            timestamp: new Date().toISOString(),
            changes: changes,
            entries: this.initializeChangelogEntries(changes),
            published: false
        };

        this.changelogs.set(changelogId, changelog);
        this.currentChanges = changelog;
        this.saveChangelogs();
        
        return changelog;
    }

    // Initialize changelog entries for each change
    initializeChangelogEntries(changes) {
        const entries = {
            overall: '',
            added: new Map(),
            removed: new Map(),
            updated: new Map()
        };

        // Initialize entries for added mods
        changes.added.forEach(mod => {
            entries.added.set(mod.name, '');
        });

        // Initialize entries for removed mods
        changes.removed.forEach(mod => {
            entries.removed.set(mod.name, '');
        });

        // Initialize entries for updated mods
        changes.updated.forEach(change => {
            entries.updated.set(change.name, '');
        });

        return entries;
    }

    // Generate version number
    generateVersionNumber() {
        const existingVersions = Array.from(this.changelogs.values())
            .map(cl => cl.version)
            .filter(v => v.match(/^\d+\.\d+\.\d+$/))
            .sort((a, b) => this.compareVersions(b, a));

        if (existingVersions.length === 0) {
            return '1.0.0';
        }

        const latest = existingVersions[0];
        const parts = latest.split('.').map(Number);
        parts[2]++; // Increment patch version
        
        return parts.join('.');
    }

    // Compare version strings
    compareVersions(a, b) {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;
            
            if (aPart !== bPart) {
                return aPart - bPart;
            }
        }
        
        return 0;
    }

    // Update changelog entry
    updateChangelogEntry(changelogId, type, modName, content) {
        const changelog = this.changelogs.get(changelogId);
        if (!changelog) return false;

        if (type === 'overall') {
            changelog.entries.overall = content;
        } else if (changelog.entries[type]) {
            changelog.entries[type].set(modName, content);
        }

        this.saveChangelogs();
        return true;
    }

    // Get changelog by ID
    getChangelog(changelogId) {
        return this.changelogs.get(changelogId);
    }

    // Get all changelogs
    getAllChangelogs() {
        return Array.from(this.changelogs.values())
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Publish changelog
    publishChangelog(changelogId) {
        const changelog = this.changelogs.get(changelogId);
        if (changelog) {
            changelog.published = true;
            changelog.publishedAt = new Date().toISOString();
            this.saveChangelogs();
            return true;
        }
        return false;
    }

    // Delete changelog
    deleteChangelog(changelogId) {
        const deleted = this.changelogs.delete(changelogId);
        if (deleted) {
            this.saveChangelogs();
        }
        return deleted;
    }

    // Export changelog as markdown
    exportAsMarkdown(changelogId) {
        const changelog = this.changelogs.get(changelogId);
        if (!changelog) return null;

        let markdown = `# Changelog v${changelog.version}\n\n`;
        markdown += `**Released:** ${new Date(changelog.timestamp).toLocaleDateString()}\n\n`;

        if (changelog.entries.overall) {
            markdown += `## Overview\n\n${changelog.entries.overall}\n\n`;
        }

        // Added mods
        if (changelog.changes.added.length > 0) {
            markdown += `## Added Mods (${changelog.changes.added.length})\n\n`;
            changelog.changes.added.forEach(mod => {
                const entry = changelog.entries.added.get(mod.name) || '';
                markdown += `### ${mod.name} v${mod.version}\n`;
                markdown += `**Author(s):** ${this.formatAuthors(mod.authors)}\n`;
                markdown += `**Platform:** ${this.capitalizeFirst(mod.platform)}\n`;
                if (mod.description) {
                    markdown += `**Description:** ${mod.description}\n`;
                }
                if (entry) {
                    markdown += `**Notes:** ${entry}\n`;
                }
                markdown += `**Link:** [${mod.name}](${mod.url})\n\n`;
            });
        }

        // Updated mods
        if (changelog.changes.updated.length > 0) {
            markdown += `## Updated Mods (${changelog.changes.updated.length})\n\n`;
            changelog.changes.updated.forEach(change => {
                const entry = changelog.entries.updated.get(change.name) || '';
                markdown += `### ${change.name}\n`;
                markdown += `**Version:** ${change.oldVersion} → ${change.newVersion}\n`;
                markdown += `**Author(s):** ${this.formatAuthors(change.mod.authors)}\n`;
                if (entry) {
                    markdown += `**Changes:** ${entry}\n`;
                }
                markdown += `**Link:** [${change.name}](${change.mod.url})\n\n`;
            });
        }

        // Removed mods
        if (changelog.changes.removed.length > 0) {
            markdown += `## Removed Mods (${changelog.changes.removed.length})\n\n`;
            changelog.changes.removed.forEach(mod => {
                const entry = changelog.entries.removed.get(mod.name) || '';
                markdown += `### ${mod.name} v${mod.version}\n`;
                markdown += `**Author(s):** ${this.formatAuthors(mod.authors)}\n`;
                if (entry) {
                    markdown += `**Reason:** ${entry}\n`;
                }
                markdown += '\n';
            });
        }

        return markdown;
    }

    // Export changelog as JSON
    exportAsJSON(changelogId) {
        const changelog = this.changelogs.get(changelogId);
        if (!changelog) return null;

        return JSON.stringify(changelog, null, 2);
    }

    // Export changelog as HTML
    exportAsHTML(changelogId) {
        const changelog = this.changelogs.get(changelogId);
        if (!changelog) return null;

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Changelog v${changelog.version}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
        h1, h2, h3 { color: #2563eb; }
        .mod-entry { margin-bottom: 1.5rem; padding: 1rem; border-left: 4px solid #e2e8f0; background: #f8fafc; }
        .added { border-left-color: #10b981; }
        .updated { border-left-color: #f59e0b; }
        .removed { border-left-color: #ef4444; }
        .meta { color: #64748b; font-size: 0.875rem; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>`;

        html += `<h1>Changelog v${changelog.version}</h1>`;
        html += `<p class="meta">Released: ${new Date(changelog.timestamp).toLocaleDateString()}</p>`;

        if (changelog.entries.overall) {
            html += `<h2>Overview</h2><p>${this.escapeHtml(changelog.entries.overall)}</p>`;
        }

        // Added mods
        if (changelog.changes.added.length > 0) {
            html += `<h2>Added Mods (${changelog.changes.added.length})</h2>`;
            changelog.changes.added.forEach(mod => {
                const entry = changelog.entries.added.get(mod.name) || '';
                html += `<div class="mod-entry added">`;
                html += `<h3>${this.escapeHtml(mod.name)} v${this.escapeHtml(mod.version)}</h3>`;
                html += `<p class="meta">Author(s): ${this.escapeHtml(this.formatAuthors(mod.authors))}</p>`;
                html += `<p class="meta">Platform: ${this.capitalizeFirst(mod.platform)}</p>`;
                if (mod.description) {
                    html += `<p>${this.escapeHtml(mod.description)}</p>`;
                }
                if (entry) {
                    html += `<p><strong>Notes:</strong> ${this.escapeHtml(entry)}</p>`;
                }
                html += `<p><a href="${mod.url}" target="_blank">View on ${this.capitalizeFirst(mod.platform)}</a></p>`;
                html += `</div>`;
            });
        }

        // Updated mods
        if (changelog.changes.updated.length > 0) {
            html += `<h2>Updated Mods (${changelog.changes.updated.length})</h2>`;
            changelog.changes.updated.forEach(change => {
                const entry = changelog.entries.updated.get(change.name) || '';
                html += `<div class="mod-entry updated">`;
                html += `<h3>${this.escapeHtml(change.name)}</h3>`;
                html += `<p class="meta">Version: ${this.escapeHtml(change.oldVersion)} → ${this.escapeHtml(change.newVersion)}</p>`;
                html += `<p class="meta">Author(s): ${this.escapeHtml(this.formatAuthors(change.mod.authors))}</p>`;
                if (entry) {
                    html += `<p><strong>Changes:</strong> ${this.escapeHtml(entry)}</p>`;
                }
                html += `<p><a href="${change.mod.url}" target="_blank">View on ${this.capitalizeFirst(change.mod.platform)}</a></p>`;
                html += `</div>`;
            });
        }

        // Removed mods
        if (changelog.changes.removed.length > 0) {
            html += `<h2>Removed Mods (${changelog.changes.removed.length})</h2>`;
            changelog.changes.removed.forEach(mod => {
                const entry = changelog.entries.removed.get(mod.name) || '';
                html += `<div class="mod-entry removed">`;
                html += `<h3>${this.escapeHtml(mod.name)} v${this.escapeHtml(mod.version)}</h3>`;
                html += `<p class="meta">Author(s): ${this.escapeHtml(this.formatAuthors(mod.authors))}</p>`;
                if (entry) {
                    html += `<p><strong>Reason:</strong> ${this.escapeHtml(entry)}</p>`;
                }
                html += `</div>`;
            });
        }

        html += `</body></html>`;
        return html;
    }

    // Utility methods
    formatAuthors(authors) {
        if (Array.isArray(authors)) {
            return authors.join(', ');
        }
        return authors || 'Unknown';
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Generate changelog summary
    generateSummary(changelogId) {
        const changelog = this.changelogs.get(changelogId);
        if (!changelog) return null;

        const added = changelog.changes.added.length;
        const updated = changelog.changes.updated.length;
        const removed = changelog.changes.removed.length;
        const total = added + updated + removed;

        let summary = `Version ${changelog.version} includes ${total} changes: `;
        const parts = [];
        
        if (added > 0) parts.push(`${added} added`);
        if (updated > 0) parts.push(`${updated} updated`);
        if (removed > 0) parts.push(`${removed} removed`);
        
        summary += parts.join(', ') + '.';
        
        return summary;
    }

    // Import changelog from JSON
    importChangelog(jsonData) {
        try {
            const changelog = JSON.parse(jsonData);
            
            // Validate required fields
            if (!changelog.id || !changelog.changes || !changelog.entries) {
                throw new Error('Invalid changelog format');
            }
            
            this.changelogs.set(changelog.id, changelog);
            this.saveChangelogs();
            
            return changelog.id;
        } catch (error) {
            console.error('Error importing changelog:', error);
            return null;
        }
    }
}

// Export for use in other files
window.ChangelogManager = ChangelogManager;