/**
 * Utilities for exporting changelog data in various formats
 */


/**
 * Escape special characters for JavaScript string literals
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeJsString(str) {
  if (!str) return '';
  // Convert to string in case we get passed a non-string value
  str = String(str);
  // Remove any control characters that could break JavaScript
  str = str.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  // Escape special characters
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'") 
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Generate Markdown format changelog
 * @param {Object} project - Project information
 * @param {Object} changelog - Changelog information
 * @param {Object} baseVersion - Base version information
 * @param {Object} targetVersion - Target version information
 * @param {Array} baseModlist - Base modlist
 * @param {Array} targetModlist - Target modlist
 * @returns {Promise<string>} - Markdown content
 */
async function generateMarkdown(project, changelog, baseVersion, targetVersion, baseModlist, targetModlist) {
  // Create a header with project and version information
  let markdown = `# ${project.name} - Changelog\n\n`;
  markdown += `## ${baseVersion.name} → ${targetVersion.name}\n\n`;
  
  // Add overall notes if available
  if (changelog.overallNotes && changelog.overallNotes.trim() !== '') {
    markdown += `### Notes\n\n${changelog.overallNotes}\n\n`;
  }
  
  // Add statistics
  const addedCount = changelog.modChanges?.added?.length || 0;
  const removedCount = changelog.modChanges?.removed?.length || 0;
  const updatedCount = changelog.modChanges?.updated?.length || 0;
  
  markdown += `### Summary\n\n`;
  markdown += `- Added: ${addedCount} mods\n`;
  markdown += `- Removed: ${removedCount} mods\n`;
  markdown += `- Updated: ${updatedCount} mods\n\n`;
  
  // Added mods
  if (addedCount > 0) {
    markdown += `### Added Mods\n\n`;
    
    for (const mod of changelog.modChanges.added) {
      // Create mod name with hyperlink if URL is available
      const modNameWithLink = mod.url ? `[${mod.name}](${mod.url})` : mod.name;
      markdown += `#### ${modNameWithLink} (${mod.version})\n`;
      
      // Add mod comments if available
      const modComment = changelog.modChanges.comments?.[mod.name];
      if (modComment) {
        markdown += `**Change Notes:** ${modComment}\n\n`;
      }
      
      // Add author information if available
      if (mod.authors && mod.authors.length > 0) {
        markdown += `- Authors: ${mod.authors.join(', ')}\n`;
      }
      
      // Add link if available or a note if not
      if (mod.url) {
        markdown += `- [View Mod Details](${mod.url})\n`;
      } else {
        markdown += `- ⚠️ *No mod link available. Check Modrinth/CurseForge or verify in Prism Launcher.*\n`;
      }
      
      markdown += '\n';
    }
  }
  
  // Removed mods
  if (removedCount > 0) {
    markdown += `### Removed Mods\n\n`;
    
    for (const mod of changelog.modChanges.removed) {
      // Create mod name with hyperlink if URL is available
      const modNameWithLink = mod.url ? `[${mod.name}](${mod.url})` : mod.name;
      markdown += `#### ${modNameWithLink} (${mod.version})\n`;
      
      // Add mod comments if available
      const modComment = changelog.modChanges.comments?.[mod.name];
      if (modComment) {
        markdown += `**Change Notes:** ${modComment}\n\n`;
      }
      
      // Add link if available or a note if not
      if (mod.url) {
        markdown += `- [View Mod Details](${mod.url})\n`;
      } else {
        markdown += `- ⚠️ *No mod link available. Check Modrinth/CurseForge or verify in Prism Launcher.*\n`;
      }
      
      markdown += '\n';
    }
  }
  
  // Updated mods
  if (updatedCount > 0) {
    markdown += `### Updated Mods\n\n`;
    
    for (const update of changelog.modChanges.updated) {
      const oldMod = update.oldMod;
      const newMod = update.newMod;
      
      // Create mod name with hyperlink if URL is available
      const modNameWithLink = newMod.url ? `[${newMod.name}](${newMod.url})` : newMod.name;
      markdown += `#### ${modNameWithLink}: ${oldMod.version} → ${newMod.version}\n`;
      
      // Add mod comments if available
      const modComment = changelog.modChanges.comments?.[newMod.name];
      if (modComment) {
        markdown += `**Change Notes:** ${modComment}\n\n`;
      }
      
      // Add link if available or a note if not
      if (newMod.url) {
        markdown += `- [View Mod Details](${newMod.url})\n`;
      } else {
        markdown += `- ⚠️ *No mod link available. Check Modrinth/CurseForge or verify in Prism Launcher.*\n`;
      }
      
      markdown += '\n';
    }
  }
  
  // Add footer with generation date
  markdown += `\n---\n\n*Generated on ${new Date().toLocaleDateString()}*\n`;
  
  return markdown;
}

/**
 * Generate Markdown Table format changelog
 * @param {Object} project - Project information
 * @param {Object} changelog - Changelog information
 * @param {Object} baseVersion - Base version information
 * @param {Object} targetVersion - Target version information
 * @param {Array} baseModlist - Base modlist
 * @param {Array} targetModlist - Target modlist
 * @returns {Promise<string>} - Markdown Table content
 */
async function generateMarkdownTable(project, changelog, baseVersion, targetVersion, baseModlist, targetModlist) {
  // Create a header with project and version information
  let markdown = `# ${project.name} - Changelog\n\n`;
  markdown += `## ${baseVersion.name} → ${targetVersion.name}\n\n`;
  
  // Add overall notes if available
  if (changelog.overallNotes && changelog.overallNotes.trim() !== '') {
    markdown += `### Notes\n\n${changelog.overallNotes}\n\n`;
  }
  
  // Add statistics
  const addedCount = changelog.modChanges?.added?.length || 0;
  const removedCount = changelog.modChanges?.removed?.length || 0;
  const updatedCount = changelog.modChanges?.updated?.length || 0;
  
  markdown += `### Summary\n\n`;
  markdown += `- Added: ${addedCount} mods\n`;
  markdown += `- Removed: ${removedCount} mods\n`;
  markdown += `- Updated: ${updatedCount} mods\n\n`;
  
  // Added mods
  if (addedCount > 0) {
    markdown += `### Added Mods\n\n`;
    markdown += `| Mod | Version | Authors | Change Notes |\n`;
    markdown += `| --- | --- | --- | --- |\n`;
    
    for (const mod of changelog.modChanges.added) {
      const authors = mod.authors && mod.authors.length > 0 ? mod.authors.join(', ') : '';
      const changeNotes = changelog.modChanges.comments?.[mod.name] || '';
      const modName = mod.url ? `[${mod.name}](${mod.url})` : mod.name;
      
      markdown += `| ${modName} | ${mod.version} | ${authors} | ${changeNotes} |\n`;
    }
    
    markdown += '\n';
  }
  
  // Removed mods
  if (removedCount > 0) {
    markdown += `### Removed Mods\n\n`;
    markdown += `| Mod | Version | Change Notes |\n`;
    markdown += `| --- | --- | --- |\n`;
    
    for (const mod of changelog.modChanges.removed) {
      const changeNotes = changelog.modChanges.comments?.[mod.name] || '';
      markdown += `| ${mod.name} | ${mod.version} | ${changeNotes} |\n`;
    }
    
    markdown += '\n';
  }
  
  // Updated mods
  if (updatedCount > 0) {
    markdown += `### Updated Mods\n\n`;
    markdown += `| Mod | Old Version | New Version | Change Notes |\n`;
    markdown += `| --- | --- | --- | --- |\n`;
    
    for (const update of changelog.modChanges.updated) {
      const oldMod = update.oldMod;
      const newMod = update.newMod;
      const changeNotes = changelog.modChanges.comments?.[newMod.name] || '';
      const modName = newMod.url ? `[${newMod.name}](${newMod.url})` : newMod.name;
      
      markdown += `| ${modName} | ${oldMod.version} | ${newMod.version} | ${changeNotes} |\n`;
    }
    
    markdown += '\n';
  }
  
  // Add footer with generation date
  markdown += `\n---\n\n*Generated on ${new Date().toLocaleDateString()}*\n`;
  
  return markdown;
}

/**
 * Generate Discord-friendly Markdown changelog
 * @param {Object} project - Project information
 * @param {Object} changelog - Changelog information
 * @param {Object} baseVersion - Base version information
 * @param {Object} targetVersion - Target version information
 * @param {Array} baseModlist - Base modlist
 * @param {Array} targetModlist - Target modlist
 * @returns {Promise<string>} - Discord Markdown content
 */
async function generateDiscordMarkdown(project, changelog, baseVersion, targetVersion, baseModlist, targetModlist) {
  // Create a header with project and version information
  let markdown = `**${project.name} - Changelog**\n\n`;
  markdown += `**${baseVersion.name} → ${targetVersion.name}**\n\n`;
  
  // Add overall notes if available
  if (changelog.overallNotes && changelog.overallNotes.trim() !== '') {
    markdown += `**Notes**\n${changelog.overallNotes}\n\n`;
  }
  
  // Add statistics
  const addedCount = changelog.modChanges?.added?.length || 0;
  const removedCount = changelog.modChanges?.removed?.length || 0;
  const updatedCount = changelog.modChanges?.updated?.length || 0;
  
  markdown += `**Summary**\n`;
  markdown += `- Added: ${addedCount} mods\n`;
  markdown += `- Removed: ${removedCount} mods\n`;
  markdown += `- Updated: ${updatedCount} mods\n\n`;
  
  // Added mods
  if (addedCount > 0) {
    markdown += `**Added Mods**\n`;
    
    for (const mod of changelog.modChanges.added) {
      // Create mod name with hyperlink if URL is available
      const modNameWithLink = mod.url ? `[${mod.name}](${mod.url})` : mod.name;
      markdown += `- **${modNameWithLink}** (${mod.version})`;
      
      // Add mod comments if available
      const modComment = changelog.modChanges.comments?.[mod.name];
      if (modComment) {
        markdown += ` - ${modComment}`;
      }
      
      markdown += '\n';
    }
    
    markdown += '\n';
  }
  
  // Removed mods
  if (removedCount > 0) {
    markdown += `**Removed Mods**\n`;
    
    for (const mod of changelog.modChanges.removed) {
      // Create mod name with hyperlink if URL is available
      const modNameWithLink = mod.url ? `[${mod.name}](${mod.url})` : mod.name;
      markdown += `- **${modNameWithLink}** (${mod.version})`;
      
      // Add mod comments if available
      const modComment = changelog.modChanges.comments?.[mod.name];
      if (modComment) {
        markdown += ` - ${modComment}`;
      }
      
      markdown += '\n';
    }
    
    markdown += '\n';
  }
  
  // Updated mods
  if (updatedCount > 0) {
    markdown += `**Updated Mods**\n`;
    
    for (const update of changelog.modChanges.updated) {
      const oldMod = update.oldMod;
      const newMod = update.newMod;
      
      // Create mod name with hyperlink if URL is available
      const modNameWithLink = newMod.url ? `[${newMod.name}](${newMod.url})` : newMod.name;
      markdown += `- **${modNameWithLink}**: ${oldMod.version} → ${newMod.version}`;
      
      // Add mod comments if available
      const modComment = changelog.modChanges.comments?.[newMod.name];
      if (modComment) {
        markdown += ` - ${modComment}`;
      }
      
      markdown += '\n';
    }
    
    markdown += '\n';
  }
  
  // Add footer with generation date
  markdown += `\n*Generated on ${new Date().toLocaleDateString()}*`;
  
  return markdown;
}

/**
 * Generate HTML format changelog
 * @param {Object} project - Project information
 * @param {Object} changelog - Changelog information
 * @param {Object} baseVersion - Base version information
 * @param {Object} targetVersion - Target version information
 * @param {Array} baseModlist - Base modlist
 * @param {Array} targetModlist - Target modlist
 * @returns {Promise<string>} - HTML content
 */
async function generateHtml(project, changelog, baseVersion, targetVersion, baseModlist, targetModlist) {
  // Create a header with project and version information
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} - Changelog</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f8f9fa;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: #fff;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
    }
    h1, h2, h3 {
      font-weight: 600;
      margin-bottom: 20px;
      color: #343a40;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e9ecef;
    }
    .project-title {
      margin: 0;
      font-size: 2.5rem;
    }
    .version-badge {
      background-color: #6c757d;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 1rem;
      font-weight: 500;
    }
    .stats-container {
      display: flex;
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      flex: 1;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      color: white;
      font-weight: 500;
    }
    .stat-card.added {
      background-color: #28a745;
    }
    .stat-card.removed {
      background-color: #dc3545;
    }
    .stat-card.updated {
      background-color: #007bff;
    }
    .stat-card .count {
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .stat-card .label {
      font-size: 1rem;
    }
    .section-title {
      margin-top: 40px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e9ecef;
      color: #343a40;
    }
    .mod-card {
      margin-bottom: 20px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      height: 100%;
    }
    .added-mod .card-header {
      background-color: rgba(40, 167, 69, 0.1);
      color: #28a745;
    }
    .removed-mod .card-header {
      background-color: rgba(220, 53, 69, 0.1);
      color: #dc3545;
    }
    .updated-mod .card-header {
      background-color: rgba(0, 123, 255, 0.1);
      color: #007bff;
    }
    .card-header {
      padding: 12px 15px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-body {
      padding: 15px;
      background-color: white;
    }
    .card-body p {
      margin-bottom: 10px;
    }
    .badge {
      font-size: 0.75rem;
      padding: 5px 8px;
      border-radius: 4px;
      margin-left: 8px;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      color: #6c757d;
      font-size: 0.9rem;
    }
    .notes-section {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      border-left: 4px solid #6c757d;
    }
    .mod-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    @media (max-width: 768px) {
      .mod-grid {
        grid-template-columns: 1fr;
      }
      .stats-container {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-container">
      <h1 class="project-title">${project.name}</h1>
      <div class="version-badge">${baseVersion.name} → ${targetVersion.name}</div>
    </div>
    
    <div class="stats-container">
      <div class="stat-card added">
        <div class="count">${changelog.modChanges?.added?.length || 0}</div>
        <div class="label">Added Mods</div>
      </div>
      <div class="stat-card removed">
        <div class="count">${changelog.modChanges?.removed?.length || 0}</div>
        <div class="label">Removed Mods</div>
      </div>
      <div class="stat-card updated">
        <div class="count">${changelog.modChanges?.updated?.length || 0}</div>
        <div class="label">Updated Mods</div>
      </div>
    </div>
    
    ${changelog.overallNotes && changelog.overallNotes.trim() !== '' ? 
      `<div class="notes-section">
        <h3>Notes</h3>
        <p>${changelog.overallNotes}</p>
      </div>` : ''
    }
    
    <!-- Added Mods -->
    ${changelog.modChanges?.added?.length > 0 ? 
      `<h2 class="section-title">Added Mods</h2>
      <div class="row">` : ''
    }`;
    
    // Added mods
    if (changelog.modChanges?.added?.length > 0) {
      for (const mod of changelog.modChanges.added) {
        const authors = mod.authors && mod.authors.length > 0 ? mod.authors.join(', ') : 'Unknown';
        const comment = changelog.modChanges.comments?.[mod.name] || '';
        
        html += `
      <div class="col-md-6">
        <div class="card mod-card added-mod">
          <div class="card-header bg-success bg-opacity-25">
            <div>${mod.name} <span class="badge bg-success">Added</span></div>
            ${mod.url ? `<a href="${mod.url}" target="_blank" class="text-success" title="View mod page"><i class="fas fa-external-link-alt"></i></a>` : ''}
          </div>
          <div class="card-body">
            <p><strong>Version:</strong> ${mod.version}</p>
            <p><strong>Authors:</strong> ${authors}</p>
            ${comment ? `<p><strong>Change Notes:</strong> ${comment}</p>` : ''}
            <div class="d-flex gap-2">
              ${mod.url ? 
                `<a href="${mod.url}" target="_blank" class="btn btn-sm btn-outline-success"><i class="fas fa-external-link-alt me-1"></i> View Mod</a>` : 
                `<div class="alert alert-warning py-1 px-2 mb-2"><i class="fas fa-exclamation-triangle me-1"></i> No mod link available. Check Modrinth/CurseForge or verify in Prism Launcher.</div>`
              }
              <button type="button" class="btn btn-sm btn-outline-secondary" onclick="navigator.clipboard.writeText('${escapeJsString(mod.name)} (${mod.version})'); alert('Copied to clipboard!');"><i class="fas fa-clipboard me-1"></i> Copy</button>
            </div>
          </div>
        </div>
      </div>`;
      }
    }
    
    html += `
    ${changelog.modChanges?.added?.length > 0 ? `</div>` : ''}
    
    <!-- Removed Mods -->
    ${changelog.modChanges?.removed?.length > 0 ? 
      `<h2 class="section-title">Removed Mods</h2>
      <div class="row">` : ''
    }`;
    
    // Removed mods
    if (changelog.modChanges?.removed?.length > 0) {
      for (const mod of changelog.modChanges.removed) {
        const comment = changelog.modChanges.comments?.[mod.name] || '';
        
        html += `
      <div class="col-md-6">
        <div class="card mod-card removed-mod">
          <div class="card-header bg-danger bg-opacity-25">
            <div>${mod.name} <span class="badge bg-danger">Removed</span></div>
            ${mod.url ? `<a href="${mod.url}" target="_blank" class="text-danger" title="View mod page"><i class="fas fa-external-link-alt"></i></a>` : ''}
          </div>
          <div class="card-body">
            <p><strong>Version:</strong> ${mod.version}</p>
            ${comment ? `<p><strong>Change Notes:</strong> ${comment}</p>` : ''}
            
            <div class="d-flex gap-2">
              ${mod.url ? 
                `<a href="${mod.url}" target="_blank" class="btn btn-sm btn-outline-danger"><i class="fas fa-external-link-alt me-1"></i> View Mod</a>` : 
                `<div class="alert alert-warning py-1 px-2 mb-2"><i class="fas fa-exclamation-triangle me-1"></i> No mod link available. Check Modrinth/CurseForge or verify in Prism Launcher.</div>`
              }
              <button type="button" class="btn btn-sm btn-outline-secondary" onclick="navigator.clipboard.writeText('${escapeJsString(mod.name)} (${mod.version})'); alert('Copied to clipboard!');"><i class="fas fa-clipboard me-1"></i> Copy</button>
            </div>
          </div>
        </div>
      </div>`;
      }
    }
    
    html += `
    ${changelog.modChanges?.removed?.length > 0 ? `</div>` : ''}
    
    <!-- Updated Mods -->
    ${changelog.modChanges?.updated?.length > 0 ? 
      `<h2 class="section-title">Updated Mods</h2>
      <div class="row">` : ''
    }`;
    
    // Updated mods
    if (changelog.modChanges?.updated?.length > 0) {
      for (const update of changelog.modChanges.updated) {
        const oldMod = update.oldMod;
        const newMod = update.newMod;
        const comment = changelog.modChanges.comments?.[newMod.name] || '';
        
        html += `
      <div class="col-md-6">
        <div class="card mod-card updated-mod">
          <div class="card-header bg-primary bg-opacity-25">
            <div>${newMod.name} <span class="badge bg-primary">Updated</span></div>
            ${newMod.url ? `<a href="${newMod.url}" target="_blank" class="text-primary" title="View mod page"><i class="fas fa-external-link-alt"></i></a>` : ''}
          </div>
          <div class="card-body">
            <p><strong>Version:</strong> ${oldMod.version} → ${newMod.version}</p>
            ${comment ? `<p><strong>Change Notes:</strong> ${comment}</p>` : ''}
            
            <div class="d-flex gap-2">
              ${newMod.url ? 
                `<a href="${newMod.url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fas fa-external-link-alt me-1"></i> View Mod</a>` : 
                `<div class="alert alert-warning py-1 px-2 mb-2"><i class="fas fa-exclamation-triangle me-1"></i> No mod link available. Check Modrinth/CurseForge or verify in Prism Launcher.</div>`
              }
              <button type="button" class="btn btn-sm btn-outline-secondary" onclick="navigator.clipboard.writeText('${escapeJsString(newMod.name)} (${oldMod.version} → ${newMod.version})'); alert('Copied to clipboard!');"><i class="fas fa-clipboard me-1"></i> Copy</button>
            </div>
          </div>
        </div>
      </div>`;
      }
    }
    
    html += `
    ${changelog.modChanges?.updated?.length > 0 ? `</div>` : ''}
    
    <div class="footer">
      <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
  
  return html;
}

module.exports = {
  generateMarkdown,
  generateMarkdownTable,
  generateDiscordMarkdown,
  generateHtml
};
