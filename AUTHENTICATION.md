# GitHub Authentication Setup

This modpack manager supports GitHub integration for submitting changelogs as GitHub Issues. There are two ways to set up authentication:

## Option 1: Personal Access Token (Recommended for Individual Use)

This is the simplest method and works immediately:

1. **Create a Personal Access Token:**
   - Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Give it a name like "Modpack Manager"
   - Select the **"repo"** scope (this gives access to create issues)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again)

2. **Use the Token:**
   - Click "Sign in with GitHub" in the modpack manager
   - Paste your token when prompted
   - The token is stored locally in your browser and never sent to external servers

## Option 2: GitHub OAuth App (For Team/Organization Use)

This provides a smoother login experience but requires setup:

1. **Create a GitHub OAuth App:**
   - Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/applications/new)
   - Fill in the application details:
     - Application name: "Modpack Manager"
     - Homepage URL: `https://your-username.github.io/the-cranium-smp/`
     - Authorization callback URL: `https://your-username.github.io/the-cranium-smp/`
   - Click "Register application"
   - Copy the **Client ID**

2. **Configure the App:**
   - Rename `auth-config.json.example` to `auth-config.json`
   - Replace `your_github_oauth_app_client_id_here` with your actual Client ID
   - Commit and push the file to your repository

3. **OAuth Limitations:**
   - GitHub Pages is static hosting, so we can't securely handle the OAuth flow
   - Users will still need to create Personal Access Tokens, but the UI will be more polished

## How It Works

### Changelog Submission Process:
1. Compare two modpack versions using the "Compare Versions" feature
2. Fill out the changelog form with descriptions for each change
3. Click "Submit to GitHub" to create a GitHub Issue
4. The issue will be created in your repository with the "changelog" label

### What Gets Created:
- **GitHub Issue** with a formatted changelog
- **Labels**: "changelog" and "modpack-update"  
- **Content**: Markdown-formatted changelog with all mod changes
- **Author**: The authenticated GitHub user

### Security Notes:
- Personal Access Tokens are stored locally in your browser
- Tokens are never sent to external servers (only to GitHub's API)
- You can revoke tokens anytime in your GitHub settings
- The "repo" scope is required to create issues in your repository

## Troubleshooting

### "Failed to submit changelog" Error:
- Check that your token has the "repo" scope
- Verify the repository owner/name is correct in the auth.js file
- Make sure the repository exists and you have write access

### Token Not Working:
- Regenerate the token with the correct scopes
- Clear your browser's localStorage and try again
- Check that the token hasn't expired

### No "Submit to GitHub" Button:
- Make sure you're signed in (green checkmark in header)
- Create a changelog by comparing two mod lists first
- Check browser console for any JavaScript errors

## Repository Configuration

The authentication system is configured for:
- **Repository Owner**: `0x29a-blink`
- **Repository Name**: `the-cranium-smp`

To change this for your own repository, edit the values in `auth.js`:
```javascript
this.repoOwner = 'your-username';
this.repoName = 'your-repository-name';
```

## Privacy & Data

- **Local Storage**: Authentication tokens are stored in your browser's localStorage
- **No External Services**: No data is sent to third-party services
- **GitHub Only**: All API calls go directly to GitHub's official API
- **No Tracking**: No analytics or tracking of any kind

Your authentication data never leaves your browser except to communicate with GitHub's API.