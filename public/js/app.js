(function() {
  // Global variables
  let currentProjectId = null;
  let currentBaseVersionId = null;
  let currentTargetVersionId = null;
  let currentChangelogId = null;
  let currentDiff = null;

  // DOM elements
  const authContainer = document.getElementById('authContainer');
  const appContainer = document.getElementById('appContainer');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const projectSelectionView = document.getElementById('projectSelectionView');
  const projectDetailsView = document.getElementById('projectDetailsView');
  const compareView = document.getElementById('compareView');
  const changelogEditor = document.getElementById('changelogEditor');
  const exportOptions = document.getElementById('exportOptions');
  
  /**
   * Utility function to fetch with credentials included
   * @param {string} url - The URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} - The fetch response
   */
  async function fetchWithCredentials(url, options = {}) {
    const opts = {
      ...options,
      credentials: 'same-origin'
    };
    
    // Ensure headers object exists if content-type is needed
    if (opts.method && ['POST', 'PUT'].includes(opts.method.toUpperCase()) && !opts.headers) {
      opts.headers = {};
    }
    
    // Add content-type for JSON if sending data and not FormData
    if (opts.body && !(opts.body instanceof FormData) && !opts.headers['Content-Type']) {
      opts.headers['Content-Type'] = 'application/json';
    }
    
    console.log(`Fetching ${url} with credentials`);
    return fetch(url, opts);
  }

  // Load and display all projects in the dashboard
async function loadProjects() {
  const projectsList = document.getElementById('projectsList');
  projectsList.innerHTML = '<p>Loading projects...</p>';
  try {
    const response = await fetchWithCredentials('/api/projects');
    if (!response.ok) throw new Error('Failed to fetch projects');
    const data = await response.json();
    const projects = data.projects || [];
    if (projects.length === 0) {
      projectsList.innerHTML = '<p>No projects found. Create a new project to get started.</p>';
      return;
    }
    // Build project cards
    projectsList.innerHTML = '';
    projects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'col-md-4';
      card.innerHTML = `
        <div class="card project-card mb-4" style="cursor:pointer;">
          <div class="card-body">
            <h5 class="card-title">${escapeHtml(project.name)}</h5>
            <p class="card-text">${escapeHtml(project.description || 'No description')}</p>
            <small class="text-muted">Created: ${formatDate(project.createdAt)}</small>
          </div>
        </div>
      `;
      card.addEventListener('click', () => showProjectDetails(project.id));
      projectsList.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading projects:', error);
    projectsList.innerHTML = '<p class="text-danger">Failed to load projects.</p>';
  }
}

  // Show the changelog editor for the current comparison
function showChangelogEditor() {
  // Make sure we preserve the current project context
  if (!currentProjectId) {
    console.error('No current project ID when trying to show changelog editor');
    showError('Project context lost. Please reload the page and try again.');
    showView(projectSelectionView);
    return;
  }
  
  if (!currentBaseVersionId || !currentTargetVersionId) {
    console.error('Missing version IDs when trying to show changelog editor');
    showError('Version selection lost. Please select versions again.');
    // Go back to the project details view where user can select versions again
    showProjectDetails(currentProjectId);
    return;
  }
  
  // Now that we've verified the context is valid, update and show the editor
  updateChangelogEditor();
  showView(changelogEditor);
}

  // Enable sorting for mods table headers
  function setupModsTableSorting() {
    const headerMap = [
      { id: 'modHeaderName', column: 'name' },
      { id: 'modHeaderSource', column: 'source' },
      { id: 'modHeaderAuthors', column: 'authors' },
      { id: 'modHeaderFilename', column: 'filename' },
      { id: 'modHeaderDescription', column: 'description' }
    ];
    headerMap.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) {
        el.onclick = function() {
          if (!window.modsSortState) window.modsSortState = { column: 'name', ascending: true };
          if (window.modsSortState.column === h.column) {
            window.modsSortState.ascending = !window.modsSortState.ascending;
          } else {
            window.modsSortState.column = h.column;
            window.modsSortState.ascending = true;
          }
          // Re-render mods table using current data
          if (window.lastVersionDetailsData) {
            updateVersionDetails(window.lastVersionDetailsData);
          }
        };
      }
    });
  }

  // Patch updateVersionDetails to save last data and set up sorting
  const origUpdateVersionDetails = updateVersionDetails;
  updateVersionDetails = function(data) {
    window.lastVersionDetailsData = data;
    origUpdateVersionDetails(data);
    setupModsTableSorting();
  };

  // Initialize application
  document.addEventListener('DOMContentLoaded', () => {
    // Check authentication status
    checkAuthStatus();

    // Set up event listeners
    setupEventListeners();
  });
  /**
   * Check if user is authenticated
   */
  async function checkAuthStatus() {
    try {
      showLoading();
      const response = await fetchWithCredentials('/api/auth/status');
      const data = await response.json();

      if (data.authenticated) {
        // User is authenticated, show app
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        
        // Check if we have saved state to restore
        const savedState = localStorage.getItem('appState');
        if (savedState) {
          try {
            const state = JSON.parse(savedState);
            console.log('Restoring application state:', state);
            
            if (state.projectId) {
              // We have a project ID, load that project
              currentProjectId = state.projectId;
              
              // Load projects first to ensure the list is populated
              await loadProjects();
              
              // Then show the specific project
              await showProjectDetails(state.projectId);
              
              // If we also have version IDs, try to restore the comparison
              if (state.baseVersionId && state.targetVersionId) {
                // Set the select values
                const baseSelect = document.getElementById('baseVersionSelect');
                const targetSelect = document.getElementById('targetVersionSelect');
                
                if (baseSelect && targetSelect) {
                  baseSelect.value = state.baseVersionId;
                  targetSelect.value = state.targetVersionId;
                  
                  // Trigger the comparison
                  await handleCompareVersions();
                }
              }
              
              return; // Skip the default project loading
            }
          } catch (e) {
            console.error('Error restoring application state:', e);
            // Continue with normal initialization
          }
        }
        
        // Default: Load projects if no state to restore
        await loadProjects();
      } else {
        // User is not authenticated, show login
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      showError('Failed to check authentication status');
    } finally {
      hideLoading();
    }
  }

  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    // Login form submission
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Create project button
    document.getElementById('createProjectBtn').addEventListener('click', () => {
      const createProjectModal = new bootstrap.Modal(document.getElementById('createProjectModal'));
      createProjectModal.show();
    });

    // Create project submission
    document.getElementById('submitCreateProject').addEventListener('click', handleCreateProject);

    // Back to projects links
    const backToProjectsButtons = [
      'backToProjects', 'backToProjects2', 'backToProjects3', 'backToProjects4', 'backToProjects5'
    ];
    
    backToProjectsButtons.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', (e) => {
          e.preventDefault();
          showView(projectSelectionView);
          loadProjects();
        });
      }
    });
    
    // Back to project links
    const backToProjectButtons = [
      'backToProject', 'backToProject2', 'backToProject3', 'backToProject4'
    ];
    
    backToProjectButtons.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', (e) => {
          e.preventDefault();
          if (currentProjectId) {
            showProjectDetails(currentProjectId);
          }
        });
      }
    });
    
    // Back to versions button
    const backToVersionsBtn = document.getElementById('backToVersionsBtn');
    if (backToVersionsBtn) {
      backToVersionsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentProjectId) {
          showProjectDetails(currentProjectId);
        }
      });
    }

    // Back to compare view
    const backToCompareButtons = [
      'backToCompare', 'backToCompare2', 'backToCompareFromExport'
    ];
    
    backToCompareButtons.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', (e) => {
          e.preventDefault();
          showView(compareView);
        });
      }
      // Removed erroneous code that was causing the ReferenceError
    });
    document.getElementById('backToCompareFromExport').addEventListener('click', (e) => {
      e.preventDefault();
      showView(compareView);
    });

    // Upload modlist button
    document.getElementById('uploadModlistBtn').addEventListener('click', () => {
      const uploadModlistModal = new bootstrap.Modal(document.getElementById('uploadModlistModal'));
      uploadModlistModal.show();
    });

    // Upload modlist submission
    document.getElementById('submitUploadModlist').addEventListener('click', handleUploadModlist);

    // Compare form submission
    document.getElementById('compareForm').addEventListener('submit', (e) => {
      e.preventDefault();
      handleCompareVersions();
    });

    // Edit changelog button
    document.getElementById('editChangelogBtn').addEventListener('click', () => {
      showChangelogEditor();
    });

    // Export changelog button
    document.getElementById('exportChangelogBtn').addEventListener('click', () => {
      showExportOptions();
    });

    // Changelog form submission
    document.getElementById('changelogForm').addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveChangelog();
    });

    // Cancel changelog button
    document.getElementById('cancelChangelogBtn').addEventListener('click', () => {
      showView(compareView);
    });

    // Export format buttons
    document.getElementById('exportMarkdown').addEventListener('click', (e) => {
      e.preventDefault();
      handleExport('markdown');
    });
    document.getElementById('exportMarkdownTable').addEventListener('click', (e) => {
      e.preventDefault();
      handleExport('markdown-table');
    });
    document.getElementById('exportDiscord').addEventListener('click', (e) => {
      e.preventDefault();
      handleExport('discord');
    });
    document.getElementById('exportHtml').addEventListener('click', (e) => {
      e.preventDefault();
      handleExport('html');
    });
    
    // Clipboard export buttons
    document.getElementById('copyMarkdown').addEventListener('click', (e) => {
      e.preventDefault();
      handleExport('markdown', { clipboard: true });
    });
    document.getElementById('copyMarkdownTable').addEventListener('click', (e) => {
      e.preventDefault();
      handleExport('markdown-table', { clipboard: true });
    });
    document.getElementById('copyDiscord').addEventListener('click', (e) => {
      e.preventDefault();
      handleExport('discord', { clipboard: true });
    });
    document.getElementById('copyHtml').addEventListener('click', (e) => {
      e.preventDefault();
      handleExport('html', { clipboard: true });
    });
    
    // Save to project button
    document.getElementById('saveToProject').addEventListener('click', (e) => {
      e.preventDefault();
      // Show project save options modal
      const projectSaveModal = new bootstrap.Modal(document.getElementById('projectSaveModal'));
      projectSaveModal.show();
    });
    
    // Project save options form submission
    document.getElementById('projectSaveForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const format = document.getElementById('projectFormat').value;
      const path = document.getElementById('projectPath').value || 'docs/index.html';
      const createDocsDir = document.getElementById('createDocsDir').checked;
      const saveToRoot = document.getElementById('saveToRoot').checked;
      const setAsMainProject = document.getElementById('setAsMainProject').checked;
      
      // Close the modal
      const projectSaveModal = bootstrap.Modal.getInstance(document.getElementById('projectSaveModal'));
      projectSaveModal.hide();
      
      // If setting as main project, update the config
      if (setAsMainProject) {
        try {
          showLoading('Setting as main project...');
          const response = await fetchWithCredentials('/api/config', {
            method: 'POST',
            body: JSON.stringify({ mainProjectId: currentProjectId })
          });
          
          if (!response.ok) {
            throw new Error('Failed to set as main project');
          }
          
          showSuccess('Project set as main project for GitHub Pages');
        } catch (error) {
          console.error('Error setting main project:', error);
          showError(`Failed to set as main project: ${error.message}`);
        } finally {
          hideLoading();
        }
      }
      
      // Export to project directory
      handleExport(format, {
        saveToProject: true,
        path,
        createDocsDir,
        saveToRoot
      });
    });

  }

  /**
   * Handle login form submission
   * @param {Event} e - Form submit event
{{ ... }}
   */  async function handleLogin(e) {
    e.preventDefault();
    
    const adminKey = document.getElementById('adminKey').value;
    
    if (!adminKey) {
      showError('Admin key is required');
      return;
    }
    
    try {
      showLoading();      const response = await fetchWithCredentials('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ adminKey })
      });
      
      if (response.ok) {
        // Login successful, show app
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        
        // Load projects
        await loadProjects();
      } else {
        const error = await response.json();
        showError(error.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('Login failed due to a network error');
    } finally {
      hideLoading();
    }
  }

  /**
   * Handle creating a new project
   */
  async function handleCreateProject() {
    const projectName = document.getElementById('projectName').value;
    const projectDescription = document.getElementById('projectDescription').value;
    
    if (!projectName) {
      showError('Project name is required');
      return;
    }
    
    try {
      showLoading();
        const response = await fetchWithCredentials('/api/projects/create', {
        method: 'POST',
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          gameVersion: '1.20.1',
          modLoader: 'forge'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Close modal
        const createProjectModal = bootstrap.Modal.getInstance(document.getElementById('createProjectModal'));
        createProjectModal.hide();
        
        // Clear form
        document.getElementById('projectName').value = '';
        document.getElementById('projectDescription').value = '';
        
        // Reload projects
        await loadProjects();
        
        // Show the new project
        showProjectDetails(data.project.id);
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Create project error:', error);
      showError('Failed to create project due to a network error');
    } finally {
      hideLoading();
    }
  }  /**
   * Handle uploading a modlist
   */  
  async function handleUploadModlist() {
    const versionName = document.getElementById('versionName').value;
    const versionType = document.getElementById('versionType').value;
    const modlistFile = document.getElementById('modlistFile').files[0];
    const submitBtn = document.getElementById('submitUploadModlist');
    
    if (!versionName) {
      showError('Version name is required');
      return;
    }
    
    if (!modlistFile) {
      showError('Modlist file is required');
      return;
    }
    
    try {
      // Add loading state to button
      submitBtn.classList.add('loading');
      submitBtn.setAttribute('disabled', 'disabled');
      submitBtn.textContent = 'Uploading...';
      
      showLoading('Uploading and processing modlist... This may take a moment.');
      
      // Create form data
      const formData = new FormData();
      formData.append('versionName', versionName);
      formData.append('versionType', versionType);
      formData.append('modlist', modlistFile);
      
      console.log(`Uploading modlist: ${modlistFile.name}, Size: ${(modlistFile.size / 1024).toFixed(2)} KB, Type: ${modlistFile.type}`);
        const response = await fetchWithCredentials(`/api/modlists/${currentProjectId}/upload`, {
        method: 'POST',
        body: formData
      });
        if (response.ok) {
        const data = await response.json();
        
        // Close modal
        const uploadModlistModal = bootstrap.Modal.getInstance(document.getElementById('uploadModlistModal'));
        uploadModlistModal.hide();
        
        // Clear form
        document.getElementById('versionName').value = '';
        document.getElementById('versionType').value = 'alpha';
        document.getElementById('modlistFile').value = '';
        
        // Show success message
        showSuccess(`Successfully uploaded modlist with ${data.version.modCount} mods`);
        
        // Reload project details
        await showProjectDetails(currentProjectId);
      } else {
        let errorMessage = 'Failed to upload modlist';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          console.error('Failed to parse error response:', e);
          errorMessage = `Server returned status ${response.status}`;
        }
        
        console.error('Upload error:', errorMessage);
        showError(errorMessage);
      }
    } catch (error) {
      console.error('Upload modlist error:', error);
      showError(`Failed to upload modlist due to a network error: ${error.message}`);
    } finally {
      // Reset button state
      submitBtn.classList.remove('loading');
      submitBtn.removeAttribute('disabled');
      submitBtn.textContent = 'Upload';
      
      hideLoading();
    }
  }

  /**
   * Handle comparing two versions
   */
  async function handleCompareVersions() {
    console.log('Starting handleCompareVersions');
    const baseVersionId = document.getElementById('baseVersionSelect').value;
    const targetVersionId = document.getElementById('targetVersionSelect').value;
    
    if (!baseVersionId || !targetVersionId) {
      showError('Both base and target versions must be selected');
      return;
    }
    
    if (baseVersionId === targetVersionId) {
      showError('Base and target versions cannot be the same');
      return;
    }
    
    try {
      showLoading('Comparing versions...');
      console.log(`Comparing versions: base=${baseVersionId}, target=${targetVersionId}, project=${currentProjectId}`);
      
      // Make sure we have a valid project ID before proceeding
      if (!currentProjectId) {
        console.error('No current project ID found');
        showError('Project ID is missing. Please reload the page and try again.');
        return;
      }
      
      // Save current state to localStorage to prevent losing context
      saveAppState({
        projectId: currentProjectId,
        baseVersionId: baseVersionId,
        targetVersionId: targetVersionId
      });
      
      const url = `/api/modlists/${currentProjectId}/compare?baseVersionId=${baseVersionId}&targetVersionId=${targetVersionId}`;
      console.log('Fetching URL:', url);
      
      const response = await fetchWithCredentials(url);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Comparison data received:', data);
        
        // Store current version IDs
        currentBaseVersionId = baseVersionId;
        currentTargetVersionId = targetVersionId;
        
        // Store diff data
        currentDiff = data.diff;
        
        // Update compare view
        updateCompareView(data);
        
        // Show compare view
        showView(compareView);
      } else {
        console.error('API error response:', response.status);
        let errorMessage = 'Failed to compare versions';
        
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        
        showError(errorMessage);
        // Stay on the project details view
        showView(projectDetailsView);
      }
    } catch (error) {
      console.error('Compare versions error:', error);
      showError('Failed to compare versions due to a network error: ' + error.message);
      // Stay on the current view instead of redirecting
      if (currentProjectId) {
        // If we have a project ID, make sure we stay on the project details view
        showView(projectDetailsView);
      }
    } finally {
      hideLoading();
    }
  }

  /**
   * Handle saving a changelog
   */
  async function handleSaveChangelog() {
    const overallNotes = document.getElementById('overallNotes').value;
    
    // Collect mod comments
    const modChanges = {
      added: currentDiff.added,
      removed: currentDiff.removed,
      updated: currentDiff.updated,
      comments: {}
    };
    
    // Get comments for added mods
    document.querySelectorAll('.added-mod-comment').forEach(input => {
      const modName = input.dataset.modName;
      const comment = input.value;
      
      if (comment.trim()) {
        modChanges.comments[modName] = comment;
      }
    });
    
    // Get comments for removed mods
    document.querySelectorAll('.removed-mod-comment').forEach(input => {
      const modName = input.dataset.modName;
      const comment = input.value;
      
      if (comment.trim()) {
        modChanges.comments[modName] = comment;
      }
    });
    
    // Get comments for updated mods
    document.querySelectorAll('.updated-mod-comment').forEach(input => {
      const modName = input.dataset.modName;
      const comment = input.value;
      
      if (comment.trim()) {
        modChanges.comments[modName] = comment;
      }
    });
    
    try {
      showLoading();
      
      let url = `/api/changelogs/${currentProjectId}/save`;
      let method = 'POST';
      
      const requestData = {
        baseVersionId: currentBaseVersionId,
        targetVersionId: currentTargetVersionId,
        overallNotes,
        modChanges
      };
      
      // If we have a changelog ID, we're updating an existing changelog
      if (currentChangelogId) {
        url = `/api/changelogs/${currentProjectId}/${currentChangelogId}`;
        method = 'PUT';
      }
      
      console.log(`Saving changelog to ${url} with method ${method}`);
      const response = await fetchWithCredentials(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Changelog saved successfully:', data);
        
        // Store changelog ID
        currentChangelogId = data.changelog.id;
        
        // Show success message
        showSuccess('Changelog saved successfully!');
        
        // Show compare view
        showView(compareView);
        
        // Update the export button to show it's available
        const exportBtn = document.getElementById('exportChangelogBtn');
        if (exportBtn) {
          exportBtn.classList.remove('btn-secondary');
          exportBtn.classList.add('btn-success');
          exportBtn.textContent = 'Export Changelog ✓';
        }
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to save changelog');
      }
    } catch (error) {
      console.error('Save changelog error:', error);
      showError('Failed to save changelog due to a network error');
    } finally {
      hideLoading();
    }
  }

  /**
   * Handle exporting a changelog
   * @param {string} format - Export format
   */
  async function handleExport(format, options = {}) {
    if (!currentChangelogId) {
      showError('Please save the changelog first');
      return;
    }
    
    try {
      showLoading('Preparing export...');
      console.log(`Exporting changelog ${currentChangelogId} in format: ${format}`, options);
      
      // First check if the changelog exists
      const checkResponse = await fetchWithCredentials(`/api/changelogs/${currentProjectId}/${currentChangelogId}`);
      
      if (!checkResponse.ok) {
        showError('Changelog not found. Please save it again.');
        return;
      }
      
      // Construct the export URL with options
      let exportUrl = `/api/exports/${currentProjectId}/${currentChangelogId}?format=${format}`;
      
      // Add clipboard option if specified
      if (options.clipboard) {
        exportUrl += '&clipboard=true';
      }
      
      // Add local export option if specified
      if (options.saveToProject) {
        // Use POST method for saving to project
        if (options.path) {
          exportUrl += `&path=${encodeURIComponent(options.path)}`;
        }
        if (options.createDocsDir) {
          exportUrl += '&createDocsDir=true';
        }
        if (options.saveToRoot) {
          exportUrl += '&saveToRoot=true';
        }
      }
      
      console.log('Export URL:', exportUrl);
      
      if (options.clipboard) {
        // For clipboard, we need to fetch the content and copy it
        const response = await fetchWithCredentials(exportUrl);
        
        if (response.ok) {
          const content = await response.text();
          
          // Copy to clipboard
          await navigator.clipboard.writeText(content)
            .then(() => {
              showSuccess(`Changelog copied to clipboard in ${format} format`);
            })
            .catch(err => {
              console.error('Clipboard write failed:', err);
              showError('Failed to copy to clipboard. Browser may not support this feature.');
              
              // Fallback: Open in new tab
              window.open(exportUrl, '_blank');
            });
        } else {
          throw new Error(`Export request failed with status ${response.status}`);
        }
      } else if (options.saveToProject) {
        // For saving to project directory, make a POST request
        const response = await fetchWithCredentials(exportUrl, { method: 'POST' });
        
        if (response.ok) {
          const result = await response.json();
          showSuccess(`Changelog saved to project: ${result.path || 'Success'}`);
        } else {
          const error = await response.json();
          throw new Error(error.error || `Failed to save to project with status ${response.status}`);
        }
      } else {
        // Standard export: Open in new tab
        showSuccess(`Exporting changelog in ${format} format`);
        window.open(exportUrl, '_blank');
      }
    } catch (error) {
      console.error('Export error:', error);
      showError(`Failed to export changelog: ${error.message}`);
    } finally {
      hideLoading();
    }
  }

  /**
        
try {
showLoading();
        
const response = await fetchWithCredentials(`/api/modlists/${currentProjectId}/compare?baseVersionId=${baseVersionId}&targetVersionId=${targetVersionId}`);
        
if (response.ok) {
const data = await response.json();
        
// Store current version IDs
currentBaseVersionId = baseVersionId;
currentTargetVersionId = targetVersionId;
        
// Store diff data
currentDiff = data.diff;
        
// Update compare view
updateCompareView(data);
        
// Show compare view
showView(compareView);
} else {
const error = await response.json();
showError(error.error || 'Failed to compare versions');
}
} catch (error) {
console.error('Compare versions error:', error);
showError('Failed to compare versions due to a network error');
} finally {
hideLoading();
}
   * @param {string} versionId - Version ID
   */
  async function showVersionDetails(projectId, versionId) {
    try {
      showLoading('Loading version details...');
      
      // Set current project ID if not already set
      currentProjectId = projectId;
      
      // Show version details view
      showView(document.getElementById('versionDetailsView'));
      
      // Fetch version details
      const response = await fetchWithCredentials(`/api/modlists/${projectId}/versions/${versionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load version details');
      }
      
      const data = await response.json();
      
      // Update the UI with version details
      updateVersionDetails(data);
      
    } catch (error) {
      console.error('Error loading version details:', error);
      showError('Failed to load version details');
      showView(projectDetailsView);
    } finally {
      hideLoading();
    }
  }
  
  /**
   * Update version details in the UI
   * @param {Object} data - Version data
   */
  function updateVersionDetails(data) {
    const { version, modlist } = data;
    
    // Update version information
    document.getElementById('versionTitle').textContent = version.name;
    document.getElementById('versionNameBreadcrumb').textContent = version.name;
    document.getElementById('versionDetailName').textContent = version.name;
    document.getElementById('versionDetailCreated').textContent = formatDate(version.createdAt);
    document.getElementById('versionDetailModCount').textContent = modlist.mods ? modlist.mods.length : 0;
    
    // Set version type with badge
    const versionTypeElement = document.getElementById('versionDetailType');
    versionTypeElement.className = `badge ${getVersionBadgeClass(version.type)}`;
    versionTypeElement.textContent = version.type;
    
    // Update mods list
    const modsList = document.getElementById('versionModsList');
    
    if (!modlist.mods || modlist.mods.length === 0) {
      modsList.innerHTML = '<tr><td colspan="5">No mods found in this version.</td></tr>';
      return;
    }
    
    // Sorting logic
    if (!window.modsSortState) {
      window.modsSortState = {
        column: 'name',
        ascending: true
      };
    }
    let sortedMods = [...modlist.mods];
    const sortColumn = window.modsSortState.column;
    const ascending = window.modsSortState.ascending;
    sortedMods.sort((a, b) => {
      let valA, valB;
      switch (sortColumn) {
        case 'name':
          valA = a.name || '';
          valB = b.name || '';
          break;
        case 'source':
          valA = a.provider || a.source || a.sourceName || a.sourceUrl || a.url || 'NA';
          valB = b.provider || b.source || b.sourceName || b.sourceUrl || b.url || 'NA';
          break;
        case 'authors':
          valA = Array.isArray(a.authors) ? a.authors.join(', ') : (a.authors || 'N/A');
          valB = Array.isArray(b.authors) ? b.authors.join(', ') : (b.authors || 'N/A');
          break;
        case 'filename':
          valA = a.filename || 'N/A';
          valB = b.filename || 'N/A';
          break;
        case 'description':
          valA = (a.additionalInfo && a.additionalInfo.description) ? a.additionalInfo.description : (a.description || 'N/A');
          valB = (b.additionalInfo && b.additionalInfo.description) ? b.additionalInfo.description : (b.description || 'N/A');
          break;
        default:
          valA = a.name || '';
          valB = b.name || '';
      }
      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    });

    // Clear existing mods
    modsList.innerHTML = '';

    // Add mods to the table
    sortedMods.forEach(mod => {
      const row = document.createElement('tr');

      // Name cell (with link if available)
      let nameCell = '<td>';
      if (mod.url) {
        nameCell += `<a href="${escapeHtml(mod.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(mod.name)}</a>`;
      } else {
        nameCell += escapeHtml(mod.name || 'N/A');
      }
      nameCell += '</td>';

      // Source cell: provider, or best fallback
      let source = mod.provider || mod.source || mod.sourceName || mod.sourceUrl || mod.url;
      if (source) {
        // Normalize known providers
        if (typeof source === 'string') {
          if (source.toLowerCase().includes('curseforge')) source = 'Curseforge';
          else if (source.toLowerCase().includes('modrinth')) source = 'Modrinth';
          else if (source.toLowerCase().includes('github')) source = 'Github';
        }
      }
      const sourceCell = `<td>${escapeHtml(source || 'NA')}</td>`;

      // Authors cell
      const authors = Array.isArray(mod.authors) ? mod.authors.join(', ') : (mod.authors || 'N/A');
      const authorsCell = `<td>${escapeHtml(authors)}</td>`;

      // Filename cell
      const filenameCell = `<td>${escapeHtml(mod.filename || 'N/A')}</td>`;

      // Description cell (from additionalInfo if present)
      let description = '';
      if (mod.additionalInfo && mod.additionalInfo.description) {
        description = mod.additionalInfo.description;
      } else if (mod.description) {
        description = mod.description;
      } else {
        description = 'N/A';
      }
      const descriptionCell = `<td>${escapeHtml(description)}</td>`;

      // Compose row: Name, Source, Mod Author, JAR file, Description
      row.innerHTML = nameCell + sourceCell + authorsCell + filenameCell + descriptionCell;
      modsList.appendChild(row);
    });
  }
  
  /**
   * Show project details
   * @param {string} projectId - Project ID
   */
  async function showProjectDetails(projectId) {
    currentProjectId = projectId;
    
    try {
      showLoading();
      // Fetch project details
      const projectResponse = await fetchWithCredentials(`/api/projects/${projectId}`);
      
      if (!projectResponse.ok) {
        const error = await projectResponse.json();
        throw new Error(error.error || 'Failed to load project');
      }
      
      const projectData = await projectResponse.json();
      // Fetch project versions
      const versionsResponse = await fetchWithCredentials(`/api/modlists/${projectId}/versions`);
      
      if (!versionsResponse.ok) {
        const error = await versionsResponse.json();
        throw new Error(error.error || 'Failed to load versions');
      }
      
      const versionsData = await versionsResponse.json();
      
      // Update project details
      updateProjectDetails(projectData.project, versionsData.versions);
      
      // Show project details view
      showView(projectDetailsView);
    } catch (error) {
      console.error('Show project details error:', error);
      showError(error.message || 'Failed to load project details');
      
      // Go back to project selection
      showView(projectSelectionView);
    } finally {
      hideLoading();
    }
  }

  /**
   * Update project details
   * @param {Object} project - Project object
   * @param {Array} versions - List of versions
   */
  function updateProjectDetails(project, versions) {
    // Update project information
    document.getElementById('projectTitle').textContent = project.name;
    document.getElementById('projectDescription').textContent = project.description || 'No description';
    document.getElementById('projectNameBreadcrumb').textContent = project.name;
    
    // Update versions list
    const versionsList = document.getElementById('versionsList');
    
    if (versions.length === 0) {
      versionsList.innerHTML = '<tr><td colspan="5">No versions found. Upload a modlist to create a version.</td></tr>';
    } else {
      let html = '';
      
      for (const version of versions) {
        html += `
          <tr>
            <td>${escapeHtml(version.name)}</td>
            <td><span class="badge ${getVersionBadgeClass(version.type)}">${version.type}</span></td>
            <td>${formatDate(version.createdAt)}</td>
            <td>${version.modCount}</td>
            <td>
              <button class="btn btn-sm btn-outline-primary view-version" data-version-id="${version.id}">View</button>
            </td>
          </tr>
        `;
      }
      
      versionsList.innerHTML = html;
      
      // Add event listeners to version buttons
      document.querySelectorAll('.view-version').forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          const versionId = button.getAttribute('data-version-id');
          showVersionDetails(currentProjectId, versionId);
        });
      });
    }
    
    // Update version selects for comparison
    const baseVersionSelect = document.getElementById('baseVersionSelect');
    const targetVersionSelect = document.getElementById('targetVersionSelect');
    
    let baseOptions = '<option value="">Select base version...</option>';
    let targetOptions = '<option value="">Select target version...</option>';
    
    for (const version of versions) {
      baseOptions += `<option value="${version.id}">${escapeHtml(version.name)} (${version.type})</option>`;
      targetOptions += `<option value="${version.id}">${escapeHtml(version.name)} (${version.type})</option>`;
    }
    
    baseVersionSelect.innerHTML = baseOptions;
    targetVersionSelect.innerHTML = targetOptions;

    // Ensure upload modlist button and submit button always have event listeners
    const uploadBtn = document.getElementById('uploadModlistBtn');
    if (uploadBtn) {
      uploadBtn.onclick = () => {
        const uploadModlistModal = new bootstrap.Modal(document.getElementById('uploadModlistModal'));
        uploadModlistModal.show();
      };
    }
    const submitBtn = document.getElementById('submitUploadModlist');
    if (submitBtn) {
      submitBtn.onclick = handleUploadModlist;
    }
  }

  /**
   * Update compare view
   * @param {Object} data - Comparison data
   */
  function updateCompareView(data) {
    const diff = data.diff;
    const baseVersion = data.baseVersion;
    const targetVersion = data.targetVersion;
    
    // Update description
    document.getElementById('compareDescription').textContent = `Comparing ${baseVersion.name} to ${targetVersion.name}`;
    
    // Update statistics
    document.getElementById('diffStatsAdded').textContent = diff.added.length;
    document.getElementById('diffStatsRemoved').textContent = diff.removed.length;
    document.getElementById('diffStatsUpdated').textContent = diff.updated.length;
    
    // Update added mods list
    const addedModsList = document.getElementById('addedModsList');
    
    if (diff.added.length === 0) {
      addedModsList.innerHTML = '<p>No added mods found.</p>';
    } else {
      let html = '';
      
      for (const mod of diff.added) {
        html += `
          <div class="list-group-item mod-list-item mod-added">
            <div class="d-flex w-100 justify-content-between">
              <h5 class="mb-1">${escapeHtml(mod.name)}</h5>
              <span class="badge bg-success">Added</span>
            </div>
            <p class="mb-1">Version: ${escapeHtml(mod.version)}</p>
            ${mod.authors && mod.authors.length > 0 ? `<p class="mb-1">Authors: ${escapeHtml(mod.authors.join(', '))}</p>` : ''}
            ${mod.url ? `<a href="${mod.url}" target="_blank" class="btn btn-sm btn-outline-success mt-2">View Source</a>` : ''}
          </div>
        `;
      }
      
      addedModsList.innerHTML = html;
    }
    
    // Update removed mods list
    const removedModsList = document.getElementById('removedModsList');
    
    if (diff.removed.length === 0) {
      removedModsList.innerHTML = '<p>No removed mods found.</p>';
    } else {
      let html = '';
      
      for (const mod of diff.removed) {
        html += `
          <div class="list-group-item mod-list-item mod-removed">
            <div class="d-flex w-100 justify-content-between">
              <h5 class="mb-1">${escapeHtml(mod.name)}</h5>
              <span class="badge bg-danger">Removed</span>
            </div>
            <p class="mb-1">Version: ${escapeHtml(mod.version)}</p>
            ${mod.authors && mod.authors.length > 0 ? `<p class="mb-1">Authors: ${escapeHtml(mod.authors.join(', '))}</p>` : ''}
          </div>
        `;
      }
      
      removedModsList.innerHTML = html;
    }
    
    // Update updated mods list
    const updatedModsList = document.getElementById('updatedModsList');
    
    if (diff.updated.length === 0) {
      updatedModsList.innerHTML = '<p>No updated mods found.</p>';
    } else {
      let html = '';
      
      for (const update of diff.updated) {
        const oldMod = update.oldMod;
        const newMod = update.newMod;
        
        html += `
          <div class="list-group-item mod-list-item mod-updated">
            <div class="d-flex w-100 justify-content-between">
              <h5 class="mb-1">${escapeHtml(newMod.name)}</h5>
              <span class="badge bg-primary">Updated</span>
            </div>
            <p class="mb-1">Version: ${escapeHtml(oldMod.version)} → ${escapeHtml(newMod.version)}</p>
            ${newMod.authors && newMod.authors.length > 0 ? `<p class="mb-1">Authors: ${escapeHtml(newMod.authors.join(', '))}</p>` : ''}
            ${newMod.url ? `<a href="${newMod.url}" target="_blank" class="btn btn-sm btn-outline-primary mt-2">View Source</a>` : ''}
          </div>
        `;
      }
      
      updatedModsList.innerHTML = html;
    }
  }

  /**
   * Update changelog editor
   */
  async function updateChangelogEditor() {
    console.log('Starting updateChangelogEditor');
    console.log('Current state:', { 
      projectId: currentProjectId, 
      baseVersionId: currentBaseVersionId, 
      targetVersionId: currentTargetVersionId 
    });
    
    // Validate required context is available
    if (!currentProjectId || !currentBaseVersionId || !currentTargetVersionId || !currentDiff) {
      console.error('Missing required context for changelog editor', { 
        projectId: currentProjectId, 
        baseVersionId: currentBaseVersionId, 
        targetVersionId: currentTargetVersionId,
        hasDiff: !!currentDiff
      });
      showError('Missing required information to display changelog editor. Please try comparing versions again.');
      
      // If we at least have a project ID, go back to project details
      if (currentProjectId) {
        showProjectDetails(currentProjectId);
      } else {
        // Otherwise go back to project selection
        showView(projectSelectionView);
      }
      return; // Exit early
    }
    
    // Check if a changelog already exists for this comparison
    let existingChangelog = null;
    
    try {
      showLoading('Loading existing changelog data...');
      console.log(`Fetching changelogs for project ${currentProjectId}`);
      
      const response = await fetchWithCredentials(`/api/changelogs/${currentProjectId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Changelogs data received:', data);
        
        // Find changelog for current comparison
        existingChangelog = data.changelogs.find(
          changelog => changelog.baseVersionId === currentBaseVersionId && changelog.targetVersionId === currentTargetVersionId
        );
        
        if (existingChangelog) {
          console.log('Found existing changelog:', existingChangelog);
          currentChangelogId = existingChangelog.id;
        } else {
          console.log('No existing changelog found for this comparison');
        }
      } else {
        console.error('Error response when fetching changelogs:', response.status);
        // Continue anyway - we can still create a new changelog
      }
    } catch (error) {
      console.error('Error loading changelogs:', error);
      // Continue anyway - we can still create a new changelog
    } finally {
      hideLoading();
    }
    
    // Update description
    document.getElementById('changelogEditorDescription').textContent = `Editing changelog for ${document.getElementById('compareDescription').textContent}`;
    
    // Update overall notes
    document.getElementById('overallNotes').value = existingChangelog?.overallNotes || '';
    
    // Update added mods comments
    const addedModsComments = document.getElementById('addedModsComments');
    
    if (currentDiff.added.length === 0) {
      addedModsComments.innerHTML = '<p>No added mods found.</p>';
    } else {
      let html = '';
      
      for (const mod of currentDiff.added) {
        const existingComment = existingChangelog?.modChanges?.comments?.[mod.name] || '';
        
        html += `
          <div class="mb-3">
            <label class="form-label">${escapeHtml(mod.name)} (${escapeHtml(mod.version)})</label>
            <textarea class="form-control added-mod-comment" data-mod-name="${mod.name}" rows="2" placeholder="Add notes about why this mod was added...">${existingComment}</textarea>
          </div>
        `;
      }
      
      addedModsComments.innerHTML = html;
    }
    
    // Update removed mods comments
    const removedModsComments = document.getElementById('removedModsComments');
    
    if (currentDiff.removed.length === 0) {
      removedModsComments.innerHTML = '<p>No removed mods found.</p>';
    } else {
      let html = '';
      
      for (const mod of currentDiff.removed) {
        const existingComment = existingChangelog?.modChanges?.comments?.[mod.name] || '';
        
        html += `
          <div class="mb-3">
            <label class="form-label">${escapeHtml(mod.name)} (${escapeHtml(mod.version)})</label>
            <textarea class="form-control removed-mod-comment" data-mod-name="${mod.name}" rows="2" placeholder="Add notes about why this mod was removed...">${existingComment}</textarea>
          </div>
        `;
      }
      
      removedModsComments.innerHTML = html;
    }
    
    // Update updated mods comments
    const updatedModsComments = document.getElementById('updatedModsComments');
    
    if (currentDiff.updated.length === 0) {
      updatedModsComments.innerHTML = '<p>No updated mods found.</p>';
    } else {
      let html = '';
      
      for (const update of currentDiff.updated) {
        const newMod = update.newMod;
        const oldMod = update.oldMod;
        const existingComment = existingChangelog?.modChanges?.comments?.[newMod.name] || '';
        
        html += `
          <div class="mb-3">
            <label class="form-label">${escapeHtml(newMod.name)} (${escapeHtml(oldMod.version)} → ${escapeHtml(newMod.version)})</label>
            <textarea class="form-control updated-mod-comment" data-mod-name="${newMod.name}" rows="2" placeholder="Add notes about this update...">${existingComment}</textarea>
          </div>
        `;
      }
      
      updatedModsComments.innerHTML = html;
    }
  }

  /**
   * Show export options view
   */
  function showExportOptions() {
    // Update export options before showing
    updateExportOptions();
    
    // Show export options view
    showView(exportOptions);
  }
  
  /**
   * Update export options
   */
  function updateExportOptions() {
    // Update description
    document.getElementById('exportOptionsDescription').textContent = `Export changelog for ${document.getElementById('compareDescription').textContent}`;
  }

  /**
   * Show a specific view
   * @param {HTMLElement} view - View to show
   */
  function showView(view) {
    // Hide all views
    projectSelectionView.style.display = 'none';
    projectDetailsView.style.display = 'none';
    compareView.style.display = 'none';
    changelogEditor.style.display = 'none';
    exportOptions.style.display = 'none';
    
    // Show the specified view
    view.style.display = 'block';
  }
  /**
   * Show loading spinner with custom message
   * @param {string} message - Optional loading message
   */
  function showLoading(message = 'Processing your request...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    
    loadingMessage.textContent = message;
    loadingOverlay.style.display = 'flex';
    
    // Also add loading state to buttons
    document.querySelectorAll('.btn[data-loading="true"]').forEach(btn => {
      btn.classList.add('loading');
      btn.setAttribute('disabled', 'disabled');
    });
  }

  /**
   * Hide loading spinner
   */
  function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'none';
    
    // Remove loading state from buttons
    document.querySelectorAll('.btn.loading').forEach(btn => {
      btn.classList.remove('loading');
      btn.removeAttribute('disabled');
    });
  }
  
  /**
   * Save application state to localStorage
   * @param {Object} state - State to save
   */
  function saveAppState(state) {
    try {
      console.log('Saving app state to localStorage:', state);
      localStorage.setItem('appState', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving app state:', error);
    }
  }

  /**
   * Restore application state from localStorage
   * @returns {Object|null} - Restored state or null if not found
   */
  function restoreAppState() {
    try {
      const stateJson = localStorage.getItem('appState');
      if (stateJson) {
        const state = JSON.parse(stateJson);
        console.log('Restored app state from localStorage:', state);
        return state;
      }
    } catch (error) {
      console.error('Error restoring app state:', error);
    }
    return null;
  }
  
  /**
   * Show an error message
   * @param {string} message - Error message
   */
  function showError(message) {
    hideLoading(); // Make sure to hide loading indicators
    
    const toastContainer = document.querySelector('.toast-container');
    const toastId = 'toast-' + Date.now();
    
    const toastHtml = `
      <div id="${toastId}" class="toast bg-danger text-white" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header">
          <strong class="me-auto">Error</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          ${escapeHtml(message)}
        </div>
      </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
    toast.show();
    
    // Add event listener to remove the toast from DOM after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
    });
  }
  function showSuccess(message) {
    const toastContainer = document.querySelector('.toast-container');
    const toastId = 'toast-' + Date.now();
    
    const toastHtml = `
      <div id="${toastId}" class="toast bg-success text-white" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header">
          <strong class="me-auto">Success</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          ${escapeHtml(message)}
        </div>
      </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
    toast.show();
    
    // Add event listener to remove the toast from DOM after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
    });
  }

  /**
   * Format a date string
   * @param {string} dateString - ISO date string
   * @returns {string} - Formatted date string
   */
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  /**
   * Get badge class for version type
   * @param {string} type - Version type
   * @returns {string} - Badge class
   */
  function getVersionBadgeClass(type) {
    switch (type) {
      case 'alpha':
        return 'bg-warning';
      case 'beta':
        return 'bg-info';
      case 'release':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  }

  /**
   * Escape HTML special characters
   * @param {string} unsafe - Unsafe string
   * @returns {string} - Safe string
   */
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
