# Minecraft Modpack Manager Manual

## Table of Contents
1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Command Line Usage](#command-line-usage)
4. [Managing Modpacks](#managing-modpacks)
5. [Generating Documentation](#generating-documentation)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#frequently-asked-questions)

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Git (recommended for version control)

### Automated Setup (Recommended)

1. Clone the repository (if not already done):
   ```bash
   git clone https://github.com/0x29a-blink/the-cranium-smp.git
   cd the-cranium-smp
   ```

2. Run the setup script:
   ```bash
   .\setup.bat
   ```
   This will:
   - Create a Python virtual environment
   - Install all required dependencies
   - Set up necessary directories
   - Create a default configuration file

### Manual Setup

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Getting Started

### Starting the Application

1. Activate the virtual environment (if not already activated):
   ```bash
   .\venv\Scripts\activate
   ```

2. Run the Modpack Manager:
   ```bash
   python modpack_manager_gui.py
   ```

## Command Line Usage

### Available Scripts

- `setup.bat` - Initial project setup
- `github_pages_generator.py` - Generate web documentation

### Python Scripts

- `modpack_manager_gui.py` - Main application
- `modpack_utils.py` - Core functionality
- `github_pages_generator.py` - Documentation generator

## Managing Modpacks

### Creating a New Modpack

1. Click "Create New Modpack" in the main window
2. Fill in the modpack details:
   - Name
   - Description
   - Version
   - Minecraft version
3. Select a modlist file (JSON format)
4. Click "Create"

### Updating a Modpack

1. Select a modpack from the list
2. Click "Edit Modpack"
3. Make your changes:
   - Add/remove mods
   - Update versions
   - Modify metadata
4. Add a changelog entry
5. Click "Save Changes"

### Exporting a Modpack

1. Select a modpack
2. Click "Export"
3. Choose export format (ZIP, JSON, etc.)
4. Select destination folder
5. Click "Save"

## Generating Documentation

To generate web-based documentation for your modpacks:

```bash
python github_pages_generator.py
```

This will create HTML files in the `docs` directory that you can host on GitHub Pages or any web server.

## Troubleshooting

### Common Issues

#### Python Not Found
```
'python' is not recognized as an internal or external command
```
- Ensure Python is installed and added to your system PATH
- Try using `python3` instead of `python`

#### Virtual Environment Issues
```
'venv\Scripts\activate' is not recognized
```
- Make sure you're in the project directory
- Try running the command prompt as administrator
- Delete the `venv` folder and run `setup.bat` again

#### Missing Dependencies
```
ModuleNotFoundError: No module named 'PyQt5'
```
- Activate the virtual environment
- Run `pip install -r requirements.txt`

## Frequently Asked Questions

### How do I update the application?
1. Pull the latest changes from the repository
2. Run `pip install -r requirements.txt --upgrade`
3. Restart the application

### Where are modpacks stored?
Modpacks are stored in the `modpacks` directory in JSON format.

### How can I contribute?
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### How do I report bugs?
Please open an issue in the repository with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)

## Support

For support, please open an issue in the repository or contact the maintainers.

---

© 2025 Minecraft Modpack Manager. All rights reserved.
