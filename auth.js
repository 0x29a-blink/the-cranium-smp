// GitHub authentication and API integration for changelog submissions
class GitHubAuth {
    constructor() {
        this.clientId = null; // Will be set via config
        this.token = localStorage.getItem('github_token');
        this.user = null;
        this.repoOwner = '0x29a-blink'; // Your GitHub username
        this.repoName = 'the-cranium-smp'; // Your repository name
        
        this.init();
    }

    async init() {
        // Load config if available
        try {
            const response = await fetch('auth-config.json');
            if (response.ok) {
                const config = await response.json();
                this.clientId = config.github_client_id;
            }
        } catch (error) {
            console.log('No auth config found, using fallback methods');
        }

        // Check if user is logged in
        if (this.token) {
            await this.validateToken();
        }

        this.updateUI();
    }

    // GitHub OAuth flow
    startOAuthFlow() {
        if (!this.clientId) {
            this.showTokenInput();
            return;
        }

        const scope = 'repo'; // Need repo access to create issues
        const redirectUri = window.location.origin + window.location.pathname;
        const state = Math.random().toString(36).substring(7);
        
        localStorage.setItem('oauth_state', state);
        
        const authUrl = `https://github.com/login/oauth/authorize?` +
            `client_id=${this.clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${scope}&` +
            `state=${state}`;
        
        window.location.href = authUrl;
    }

    // Handle OAuth callback
    async handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const storedState = localStorage.getItem('oauth_state');

        if (code && state === storedState) {
            try {
                // Note: This would need a backend service to exchange code for token
                // For now, we'll show instructions for manual token creation
                this.showTokenInstructions();
            } catch (error) {
                console.error('OAuth error:', error);
                this.showError('Authentication failed. Please try again.');
            }
        }
    }

    // Show manual token input
    showTokenInput() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fab fa-github"></i> GitHub Authentication</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="auth-instructions">
                        <h4>Create a Personal Access Token</h4>
                        <ol>
                            <li>Go to <a href="https://github.com/settings/tokens" target="_blank">GitHub Settings → Developer settings → Personal access tokens</a></li>
                            <li>Click "Generate new token (classic)"</li>
                            <li>Give it a name like "Modpack Manager"</li>
                            <li>Select the <strong>"repo"</strong> scope</li>
                            <li>Click "Generate token"</li>
                            <li>Copy the token and paste it below</li>
                        </ol>
                        
                        <div class="token-input-section">
                            <label for="tokenInput">Personal Access Token:</label>
                            <input type="password" id="tokenInput" placeholder="ghp_..." style="width: 100%; margin: 0.5rem 0;">
                            <button onclick="githubAuth.setToken(document.getElementById('tokenInput').value)" class="btn btn-primary">
                                <i class="fas fa-check"></i> Save Token
                            </button>
                        </div>
                        
                        <div class="auth-note">
                            <p><strong>Note:</strong> Your token is stored locally and never sent to our servers. It's only used to authenticate with GitHub's API.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Set token manually
    async setToken(token) {
        if (!token || !token.startsWith('ghp_')) {
            this.showError('Please enter a valid GitHub Personal Access Token');
            return;
        }

        this.token = token;
        localStorage.setItem('github_token', token);
        
        const isValid = await this.validateToken();
        if (isValid) {
            document.querySelector('.modal')?.remove();
            this.updateUI();
            this.showSuccess('Successfully authenticated with GitHub!');
        }
    }

    // Validate token and get user info
    async validateToken() {
        if (!this.token) return false;

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                this.user = await response.json();
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Token validation error:', error);
            this.logout();
            return false;
        }
    }

    // Logout
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('github_token');
        this.updateUI();
    }

    // Update UI based on auth state
    updateUI() {
        const authButton = document.getElementById('authButton');
        const authStatus = document.getElementById('authStatus');
        
        if (!authButton) return;

        if (this.user) {
            authButton.innerHTML = `
                <img src="${this.user.avatar_url}" alt="${this.user.login}" style="width: 20px; height: 20px; border-radius: 50%; margin-right: 0.5rem;">
                ${this.user.login}
                <i class="fas fa-caret-down" style="margin-left: 0.5rem;"></i>
            `;
            authButton.onclick = () => this.showUserMenu();
            
            if (authStatus) {
                authStatus.innerHTML = `<i class="fas fa-check-circle" style="color: var(--success);"></i> Authenticated as ${this.user.login}`;
            }
        } else {
            authButton.innerHTML = `<i class="fab fa-github"></i> Sign in with GitHub`;
            authButton.onclick = () => this.startOAuthFlow();
            
            if (authStatus) {
                authStatus.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i> Sign in to submit changelogs`;
            }
        }
    }

    // Show user menu
    showUserMenu() {
        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-menu-content">
                <div class="user-info">
                    <img src="${this.user.avatar_url}" alt="${this.user.login}">
                    <div>
                        <div class="user-name">${this.user.name || this.user.login}</div>
                        <div class="user-login">@${this.user.login}</div>
                    </div>
                </div>
                <hr>
                <button onclick="githubAuth.logout(); this.closest('.user-menu').remove();" class="menu-item">
                    <i class="fas fa-sign-out-alt"></i> Sign out
                </button>
            </div>
        `;
        
        // Position menu
        const authButton = document.getElementById('authButton');
        const rect = authButton.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 5) + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
        
        document.body.appendChild(menu);
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    // Submit changelog as GitHub issue
    async submitChangelog(changelog) {
        if (!this.token || !this.user) {
            this.showError('Please sign in with GitHub to submit changelogs');
            return false;
        }

        try {
            // Prepare issue content
            const title = `Changelog v${changelog.version} - ${new Date().toLocaleDateString()}`;
            const body = this.formatChangelogForIssue(changelog);

            const response = await fetch(`https://api.github.com/repos/${this.repoOwner}/${this.repoName}/issues`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    body: body,
                    labels: ['changelog', 'modpack-update']
                })
            });

            if (response.ok) {
                const issue = await response.json();
                this.showSuccess(`Changelog submitted successfully! <a href="${issue.html_url}" target="_blank">View Issue #${issue.number}</a>`);
                return true;
            } else {
                const error = await response.json();
                this.showError(`Failed to submit changelog: ${error.message}`);
                return false;
            }
        } catch (error) {
            console.error('Changelog submission error:', error);
            this.showError('Failed to submit changelog. Please try again.');
            return false;
        }
    }

    // Format changelog for GitHub issue
    formatChangelogForIssue(changelog) {
        let markdown = `# Changelog v${changelog.version}\n\n`;
        markdown += `**Submitted by:** @${this.user.login}\n`;
        markdown += `**Date:** ${new Date().toLocaleDateString()}\n\n`;

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
        markdown += '*This changelog was submitted via the Modpack Manager tool.*';

        return markdown;
    }

    // Utility methods
    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'error-message';
        alert.innerHTML = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }

    showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'success-message';
        alert.innerHTML = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }

    // Check if user can submit changelogs
    canSubmitChangelogs() {
        return this.token && this.user;
    }

    // Get submission history (if needed)
    async getChangelogHistory() {
        if (!this.token) return [];

        try {
            const response = await fetch(`https://api.github.com/repos/${this.repoOwner}/${this.repoName}/issues?labels=changelog&state=all`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching changelog history:', error);
        }
        
        return [];
    }
}

// Initialize GitHub auth
window.githubAuth = new GitHubAuth();

// Handle OAuth callback on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.search.includes('code=')) {
        githubAuth.handleOAuthCallback();
    }
});