# The Cranium SMP - Modpack Manager

A modern web-based tool for managing and documenting Minecraft modpack changes with automatic mod information fetching and changelog generation.

## ✨ Features

- **📋 Mod List Display**: View all mods with detailed information
- **🔍 Smart Search & Filtering**: Filter by platform, sort by various criteria
- **👁️ Multiple View Modes**: 
  - **Grid View**: Traditional card layout for browsing
  - **List View**: Detailed rows with full descriptions (default)
  - **Compact View**: Dense view for quick scanning
- **🔗 Automatic Data Fetching**: 
  - CurseForge: Web scraping with fallback proxies
  - Modrinth: Official API integration
  - GitHub: Repository information
- **📊 Statistics Dashboard**: Total mods and platform breakdowns
- **🔄 Version Comparison**: Compare two modpack versions
- **📝 Changelog Generation**: Create detailed changelogs with downloadable JSON/Markdown
- **📱 Responsive Design**: Works on desktop and mobile

## 🚀 Quick Start

1. **View the modpack**: Visit the [live site](https://0x29a-blink.github.io/the-cranium-smp/)
2. **Browse mods**: Use the search, filters, and view toggles
3. **Compare versions**: Upload a previous modlist JSON to see changes
4. **Generate changelogs**: Create detailed documentation of updates

## 📝 Changelog Workflow

### For Modpack Maintainers:

1. **Export Current List**: Use the "Export List" button to save your current modlist
2. **Make Modpack Changes**: Add, remove, or update mods in your pack
3. **Update cfmod.json**: Replace the file with your new modlist
4. **Compare Versions**: Use "Compare Versions" and upload the previous modlist
5. **Create Changelog**: Click "Create Changelog" after comparing
6. **Fill Details**: Add descriptions for each change
7. **Download Files**: Save the JSON and/or Markdown files
8. **Upload to GitHub**: Add the JSON file to the `/changelogs` folder

### File Structure:
```
the-cranium-smp/
├── cfmod.json              # Current modlist
├── changelogs/             # Changelog history
│   ├── README.md
│   ├── changelog-2024.01.15.json
│   └── changelog-2024.01.20.json
├── index.html              # Main application
├── app.js                  # Core functionality
├── api.js                  # Mod data fetching
├── changelog.js            # Changelog system
└── styles.css              # Styling
```

## 🔧 Technical Details

### Mod Data Sources:
- **CurseForge**: Web scraping with multiple CORS proxies for reliability
- **Modrinth**: Official API (v2)
- **GitHub**: Repository API for release information
- **Other**: Manual URL validation

### View Modes:
- **Grid View**: 300px cards with full information
- **List View**: Horizontal rows with descriptions 
- **Compact View**: 32px height rows with essential info only

### Changelog Format:
```json
{
  "version": "2024.01.15",
  "date": "2024-01-15T00:00:00.000Z",
  "overallDescription": "Description of the update",
  "changes": {
    "added": [...],
    "updated": [...],
    "removed": [...]
  }
}
```

## 🛠️ Development

### Local Setup:
```bash
# Clone the repository
git clone https://github.com/0x29a-blink/the-cranium-smp.git
cd the-cranium-smp

# Serve locally (Python example)
python -m http.server 8000

# Open http://localhost:8000
```

### Adding New Features:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📊 Mod Statistics

- **Total Mods**: Dynamically counted
- **Platform Distribution**: CurseForge, Modrinth, GitHub, Other
- **Update Tracking**: Version comparison and change detection

## 🔒 Privacy & Performance

- **No Authentication Required**: For viewing and basic features
- **Local Storage**: Preferences saved in browser
- **Caching**: API responses cached to reduce requests
- **Rate Limiting**: Built-in request throttling
- **CORS Proxies**: Multiple fallbacks for reliable scraping

## 📱 Browser Support

- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Additional mod platforms
- Better scraping techniques
- UI/UX enhancements
- Performance optimizations
- Documentation improvements

## 📄 License

This project is open source. See the repository for license details.

## 🐛 Issues & Support

- **Bug Reports**: Use GitHub Issues
- **Feature Requests**: Submit via Issues with enhancement label
- **Questions**: Check existing issues or create a new one

---

**Note**: This tool is designed for modpack documentation and management. Always verify mod information directly from official sources before making modpack decisions.
