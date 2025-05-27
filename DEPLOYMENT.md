# Deployment Guide

This guide explains how to deploy and maintain your modpack manager on GitHub Pages.

## 🚀 Initial Setup

### 1. Repository Setup
```bash
# Fork or clone the repository
git clone https://github.com/0x29a-blink/the-cranium-smp.git
cd the-cranium-smp

# Update the repository URL in changelog.js (line 30)
# Change '0x29a-blink/the-cranium-smp' to your username/repo-name
```

### 2. Enable GitHub Pages
1. Go to your repository settings
2. Scroll to "Pages" section
3. Select "Deploy from branch"
4. Choose "main" branch and "/ (root)" folder
5. Click "Save"

### 3. Update Your Modlist
Replace `cfmod.json` with your actual modpack data:
```json
{
  "mods": [
    {
      "name": "Your Mod",
      "version": "1.0.0",
      "authors": ["Author Name"],
      "url": "https://curseforge.com/projects/123456",
      "filename": "yourmod-1.0.0.jar"
    }
  ]
}
```

## 📝 Maintaining Changelogs

### Workflow for Updates:

1. **Before Making Changes**:
   ```bash
   # Export current modlist from the web interface
   # Save as 'previous-modlist.json'
   ```

2. **Update Your Modpack**:
   - Add/remove/update mods in your pack
   - Export new modlist from your modpack manager
   - Update `cfmod.json` in the repository

3. **Generate Changelog**:
   - Visit your GitHub Pages site
   - Use "Compare Versions" and upload the previous modlist
   - Click "Create Changelog"
   - Fill in descriptions for each change
   - Download both JSON and Markdown files

4. **Deploy Changes**:
   ```bash
   git add cfmod.json
   git add changelogs/changelog-YYYY.MM.DD.json
   git commit -m "Update modpack to version YYYY.MM.DD"
   git push origin main
   ```

## 🔧 Customization

### Branding
Update these files to match your modpack:
- `index.html`: Change title and header text
- `README.md`: Update repository URLs and descriptions
- `styles.css`: Modify colors and styling (CSS variables at the top)

### API Configuration
The tool automatically detects mod platforms and fetches data:
- **CurseForge**: Web scraping (no API key needed)
- **Modrinth**: Official API
- **GitHub**: Repository API
- **Other**: URL validation only

### Adding Custom Platforms
Edit `api.js` to add support for new mod platforms:
1. Add platform detection logic
2. Implement data fetching function
3. Add platform icon and styling

## 📊 Monitoring

### Analytics (Optional)
Add Google Analytics or similar by including the tracking code in `index.html`.

### Performance
- The tool caches API responses to reduce load times
- Multiple CORS proxies ensure reliable CurseForge scraping
- Rate limiting prevents API abuse

## 🐛 Troubleshooting

### Common Issues:

**Mods not loading data:**
- Check console for API errors
- Verify mod URLs are correct
- Some CurseForge pages may block scraping

**Changelog not saving:**
- Ensure browser allows file downloads
- Check that JSON is valid format
- Verify changelog folder exists in repository

**GitHub Pages not updating:**
- Check Actions tab for build errors
- Ensure all files are committed and pushed
- Wait a few minutes for deployment

**CORS errors:**
- The tool uses multiple proxy services
- Some corporate networks may block these
- Try from different network if issues persist

## 🔒 Security Notes

- No sensitive data is stored or transmitted
- All processing happens client-side
- Mod data is fetched from public APIs only
- Generated files contain only modpack information

## 📱 Mobile Optimization

The interface is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile phones
- Different screen orientations

## 🚀 Advanced Features

### Custom Styling
Modify CSS variables in `styles.css`:
```css
:root {
    --primary-color: #your-color;
    --surface: #your-background;
    /* etc... */
}
```

### Adding New View Modes
1. Add button to view toggle in `index.html`
2. Create CSS class in `styles.css`
3. Update view switching logic in `app.js`

### API Extensions
Add new data sources by:
1. Creating fetch function in `api.js`
2. Adding platform detection logic
3. Updating UI to display new data

## 📋 Maintenance Checklist

### Weekly:
- [ ] Check for mod updates in your pack
- [ ] Update `cfmod.json` if changes made
- [ ] Generate changelog for any updates

### Monthly:
- [ ] Review and update documentation
- [ ] Check for broken mod links
- [ ] Update dependencies if needed

### As Needed:
- [ ] Add new mods to pack
- [ ] Remove outdated/broken mods
- [ ] Update branding/styling
- [ ] Add new features

## 🤝 Contributing Back

If you make improvements:
1. Fork the original repository
2. Create feature branch
3. Make changes
4. Submit pull request
5. Help others with same needs

---

**Happy modpack managing!** 🎮