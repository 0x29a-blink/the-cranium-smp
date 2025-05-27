# Changelogs

This folder contains the changelog history for the modpack. Each changelog is stored as a JSON file that can be generated using the Modpack Manager tool.

## How to Add a Changelog

1. Use the Modpack Manager tool to compare two versions of your modlist
2. Click "Create Changelog" to open the changelog editor
3. Fill in descriptions for each mod change
4. Click "Save Changelog" to download the JSON file
5. Upload the JSON file to this folder
6. The changelog will automatically appear in the manager

## File Naming Convention

Changelog files should be named: `changelog-YYYY.MM.DD.json` or `changelog-vX.Y.Z.json`

Examples:
- `changelog-2024.01.15.json`
- `changelog-v1.2.3.json`

## JSON Structure

Each changelog file contains:
- `version`: Version identifier
- `date`: ISO date string
- `overallDescription`: General description of the update
- `changes`: Object containing arrays of added, updated, and removed mods