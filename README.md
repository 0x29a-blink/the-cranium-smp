# Minecraft Modpack Changelog Generator

A tool for generating changelogs from Minecraft modpack differences. It allows you to upload and manage different versions of your modpacks, compare them, and generate beautiful changelogs in various formats.

## Features

- Simple local web server with basic authentication
- Upload and compare different versions of modpacks
- Detect added, removed, and updated mods
- Add custom notes and comments to each change
- Export changelogs in multiple formats:
  - Markdown
  - Markdown tables
  - Discord-friendly Markdown
  - HTML for GitHub Pages
- Integration with CurseForge and Modrinth APIs
- API rate limiting to prevent hitting rate limits
- Organize modpacks by version type (alpha, beta, release)

## Setup

1. Clone the repository
2. Install dependencies:

```
npm install
```

3. Create a `.env` file in the root directory (you can copy from `.env.example`):

```
ADMIN_KEY=cranium-admin-login
PORT=3000
CURSEFORGE_API_KEY=your-curseforge-api-key
CURSEFORGE_RATE_LIMIT=1000
MODRINTH_RATE_LIMIT=500
```

4. Start the server:

```
npm start
```

## Usage

1. Open your browser and go to `http://localhost:3000`
2. Enter the admin key to log in (`cranium-admin-login` by default)
3. Create a new project or select an existing one
4. Upload modlists (cfmod.json files) for different versions
5. Compare versions to generate changelogs
6. Add comments and notes to your changelog
7. Export the changelog in your preferred format

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with admin key
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Check authentication status

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create a new project
- `GET /api/projects/:id` - Get a project by ID
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### Modlists
- `POST /api/modlists/:projectId/upload` - Upload a new modlist
- `GET /api/modlists/:projectId/versions` - Get all versions of a project
- `GET /api/modlists/:projectId/versions/:versionId` - Get a specific version
- `GET /api/modlists/:projectId/compare` - Compare two versions

### Changelogs
- `POST /api/changelogs/:projectId/save` - Save a changelog
- `GET /api/changelogs/:projectId` - Get all changelogs for a project
- `GET /api/changelogs/:projectId/:changelogId` - Get a specific changelog
- `PUT /api/changelogs/:projectId/:changelogId` - Update a changelog
- `DELETE /api/changelogs/:projectId/:changelogId` - Delete a changelog

### Exports
- `GET /api/exports/:projectId/:changelogId` - Generate exports for a changelog

## License

MIT
