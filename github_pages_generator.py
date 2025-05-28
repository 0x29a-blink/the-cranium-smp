import os
import json
import shutil
from datetime import datetime
import re
import markdown
from markdown.extensions.fenced_code import FencedCodeExtension
from markdown.extensions.tables import TableExtension
from modpack_utils import list_modpacks, load_modpack

# Constants
DOCS_DIR = 'docs'
PROJECTS_DIR = os.path.join(DOCS_DIR, 'projects')
CSS_DIR = os.path.join(DOCS_DIR, 'css')
JS_DIR = os.path.join(DOCS_DIR, 'js')
ASSETS_DIR = os.path.join(DOCS_DIR, 'assets')

# Helper functions
def ensure_directory(directory):
    """Ensure a directory exists, create it if it doesn't"""
    if not os.path.exists(directory):
        os.makedirs(directory)

def slugify(text):
    """Convert text to URL-friendly slug"""
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')

def markdown_to_html(text):
    """Convert markdown text to HTML"""
    if not text:
        return ''
    
    # Use Python's markdown library with extensions for code blocks and tables
    extensions = [
        FencedCodeExtension(),
        TableExtension(),
        'nl2br',  # Convert newlines to <br>
        'sane_lists'  # Better list handling
    ]
    
    # Convert markdown to HTML
    html = markdown.markdown(text, extensions=extensions)
    return html

def create_css():
    """Create CSS files for the GitHub Pages site"""
    ensure_directory(CSS_DIR)
    
    # Create Inter font CSS file
    with open(os.path.join(CSS_DIR, 'inter.css'), 'w', encoding='utf-8') as f:
        f.write("""
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        """)
    
    # Create FontAwesome CSS file - using a direct embed approach to avoid external dependency issues
    with open(os.path.join(CSS_DIR, 'fontawesome.css'), 'w', encoding='utf-8') as f:
        f.write("""
/* Font Awesome Free 5.15.4 by @fontawesome - https://fontawesome.com */
@font-face{font-family:"Font Awesome 5 Free";font-style:normal;font-weight:900;font-display:block;src:url(../webfonts/fa-solid-900.woff2) format("woff2"),url(../webfonts/fa-solid-900.ttf) format("truetype")}.fa,.fas{font-family:"Font Awesome 5 Free";font-weight:900}
        """)
    
    # Ensure webfonts directory exists
    ensure_directory(os.path.join(DOCS_DIR, 'webfonts'))
    
    # Write main CSS file
    with open(os.path.join(CSS_DIR, 'style.css'), 'w', encoding='utf-8') as f:
        f.write("""
:root {
    --primary-color: #4a76a8;
    --primary-rgb: 74, 118, 168;
    --secondary-color: #6c757d;
    --background-color: #f8f9fa;
    --text-color: #333;
    --border-color: #dee2e6;
    --hover-color: #e9ecef;
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --added-color: #28a745;
    --removed-color: #dc3545;
    --updated-color: #3b82f6;
    --card-bg: #fff;
    --card-shadow: 0 2px 8px rgba(0,0,0,0.10);
    --card-hover-shadow: 0 4px 16px rgba(0,0,0,0.18);
}

body {
    font-family: var(--font-family);
    background: var(--background-color);
    color: var(--text-color);
    margin: 0;
    padding: 0;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
}

header {
    background-color: var(--primary-color);
    color: white;
    padding: 2rem 1rem;
    text-align: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

header h1 {
    margin: 0;
    font-size: 2.5rem;
    font-weight: 700;
}

header p {
    margin-top: 0.5rem;
    font-size: 1.1rem;
    opacity: 0.9;
}

/* GRID-ONLY LAYOUT - Main layout system */
.mod-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2.5rem 2rem;
    margin: 2rem 0 3rem 0;
}

/* Card styling - consistent across all pages */
.mod-card {
    background: var(--card-bg);
    border-radius: 14px;
    box-shadow: var(--card-shadow);
    border: 1px solid var(--border-color);
    padding: 1.5rem 1.5rem 1.2rem 1.5rem;
    display: flex;
    flex-direction: column;
    transition: box-shadow 0.2s, transform 0.15s;
    position: static;
    z-index: 1;
    margin-bottom: 2.5rem;
    height: auto;
    overflow: visible;
}

.mod-card:hover {
    box-shadow: var(--card-hover-shadow);
    transform: translateY(-2px);
}

.mod-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1rem;
    gap: 0.5rem;
}

.mod-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--primary-color);
    margin-bottom: 0.2rem;
    letter-spacing: 0.01em;
}

.mod-details {
    display: block;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: visible;
}

.mod-info {
    margin-bottom: 0.7rem;
    flex: 1;
}

.mod-info-item {
    margin-bottom: 0.5rem;
    font-size: 1rem;
    line-height: 1.5;
    word-break: break-word;
}

.mod-info-label {
    font-weight: 600;
    color: #3a4667;
    min-width: 90px;
    display: inline-block;
}

.category-pill {
    display: inline-block;
    background: #e3e7ef;
    color: #3a4667;
    border-radius: 12px;
    padding: 2px 12px;
    margin-right: 6px;
    margin-bottom: 6px;
    font-size: 0.85rem;
    margin-bottom: 2px;
    font-size: 0.93em;
    font-weight: 500;
    letter-spacing: 0.02em;
}

.mod-actions {
    display: flex;
    gap: 12px;
    margin-top: 1.2rem;
    flex-wrap: wrap;
    padding-top: 0.5rem;
    border-top: 1px solid #eee;
}

.mod-btn {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    background: #e5e8ee;
    color: #333;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: 0;
    transition: background 0.2s;
    box-sizing: border-box;
    max-width: 100%;
    white-space: nowrap;
}

.mod-btn.primary {
    background: #3a4667;
    color: #fff;
}

.mod-btn:active, .mod-btn:focus {
    outline: 2px solid #7a8ed6;
}

/* Responsive adjustments */
@media (max-width: 900px) {
    .mod-grid {
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1.2rem;
    }
    .mod-card {
        padding: 1.1rem 1.1rem 1rem 1.1rem;
    }
}
@media (max-width: 600px) {
    .mod-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    .mod-card {
        padding: 0.8rem 0.7rem 0.7rem 0.7rem;
    }
}

/* Minecraft theme accent: pixel border on hover */
.mod-card:hover {
    box-shadow: 0 6px 24px rgba(60,70,120,0.18), 0 0 0 2px #8bc34a;
    border-color: #8bc34a;
}

/* Add a subtle Minecraft blocky effect to the card corners */
.mod-card {
    border-radius: 10px 18px 10px 18px/18px 10px 18px 10px;
}

/* End modern Minecraft mod card grid styling */
header {
    background-color: var(--primary-color);
    color: white;
    padding: 2rem 1rem;
    text-align: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

header h1 {
    margin: 0;
    font-size: 2.5rem;
    font-weight: 700;
}

header p {
    margin-top: 0.5rem;
    font-size: 1.1rem;
    opacity: 0.9;
}

header a {
    color: white;
    text-decoration: none;
    opacity: 0.9;
    transition: opacity 0.2s;
}

header a:hover {
    opacity: 1;
    text-decoration: underline;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
}

h2, h3 {
    color: var(--primary-color);
    font-weight: 600;
}

h2 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--primary-color);
    display: inline-block;
}

/* Grid layout for cards */
.mod-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
    margin-bottom: 2rem;
}

/* Project card styling */
.project-card {
    background-color: var(--card-bg);
    border-radius: 10px;
    box-shadow: var(--card-shadow);
    padding: 1.5rem;
    transition: all 0.2s ease-in-out;
    display: flex;
    flex-direction: column;
}

.project-card:hover {
    transform: translateY(-5px);
    box-shadow: var(--card-hover-shadow);
}

.project-card h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--primary-color);
    font-size: 1.4rem;
    font-weight: 600;
}

/* Stats cards */
.stats-container {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
}

.stat-card {
    flex: 1;
    min-width: 100px;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.stat-card.added {
    background-color: var(--added-color);
}

.stat-card.removed {
    background-color: var(--removed-color);
}

.stat-card.updated {
    background-color: var(--updated-color);
}

.stat-number {
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.3rem;
}

.stat-label {
    font-size: 0.85rem;
    opacity: 0.9;
}

/* Mod cards */
.mod-card {
    background-color: var(--card-bg);
    border-radius: 12px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
    transition: all 0.3s;
    border: 1px solid var(--border-color);
    height: auto;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    position: relative;
}

.mod-card:hover {
    box-shadow: var(--card-hover-shadow);
    transform: translateY(-2px);
}

/* Compact mod cards */
.mod-card.compact {
    padding: 0;
    overflow: hidden;
}

.mod-card.compact .mod-header {
    padding: 0.75rem 1rem;
    background-color: rgba(0, 0, 0, 0.02);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mod-card .mod-details {
    display: block;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: visible;
}

.mod-expand-btn {
    background: none;
    border: none;
    color: var(--primary-color);
    cursor: pointer;
    font-size: 0.9rem;
    opacity: 0.7;
    transition: all 0.2s;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mod-expand-btn:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.05);
}

.mod-card.compact.expanded .mod-expand-btn i {
    transform: rotate(180deg);
}

.version-button:hover {
    background-color: var(--border-color);
    text-decoration: none;
}

.version-button.current {
    background-color: var(--secondary-color);
    color: white;
    border-color: var(--secondary-color);
}

.mod-section {
    margin-bottom: 32px;
}

.mod-section-title {
    font-size: 1.25rem;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
}

/* This section was moved up in the file */

.mod-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
}

.mod-title {
    font-weight: 700;
    font-size: 1.25rem;
    color: var(--primary-color);
    margin-bottom: 0.5rem;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 0.75rem;
}

.mod-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    color: white;
}

.mod-badge.added {
    background-color: var(--added-color);
}

.mod-badge.removed {
    background-color: var(--removed-color);
}

.mod-badge.updated {
    background-color: var(--updated-color);
}

.mod-info {
    margin-bottom: 0.75rem;
    flex: 1;
    font-size: 0.85rem;
}

.mod-info-item {
    margin-bottom: 8px;
    line-height: 1.4;
    padding-left: 8px;
    border-left: 2px solid var(--border-color);
}

.mod-info-label {
    font-weight: 600;
    color: var(--accent-color);
    font-size: 0.8rem;
}

.mod-info-value {
    font-size: 0.8rem;
}

.category-pill {
    display: inline-block;
    background-color: var(--accent-color-light);
    color: var(--text-color);
    padding: 0.2rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    margin: 0.1rem;
}

.mod-warning {
    background-color: #fff3cd;
    color: #856404;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin: 0.5rem 0 1rem;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    line-height: 1.4;
}

.mod-warning i {
    margin-right: 6px;
    color: var(--warning-color);
}

.mod-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
}

.mod-btn {
    padding: 0.6rem 1rem;
    border-radius: 6px;
    border: none;
    font-size: 0.9rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 0.75rem;
    text-decoration: none;
    transition: all 0.2s;
}

.mod-btn:hover {
    background-color: var(--border-color);
}

.mod-btn i {
    margin-right: 4px;
}

.mod-btn.primary {
    background-color: var(--secondary-color);
    color: white;
    border-color: var(--secondary-color);
}

.mod-btn.primary:hover {
    background-color: #1d4ed8;
}

.mod-categories {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 1rem;
}

.mod-category {
    display: inline-block;
    background-color: var(--light-bg);
    color: var(--text-color);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.85rem;
    margin-right: 6px;
    margin-bottom: 6px;
}

.version-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 2rem;
    background-color: var(--light-gray);
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.version-button {
    padding: 0.5rem 1rem;
    background-color: white;
    border-radius: 6px;
    color: var(--text-color);
    text-decoration: none;
    font-size: 0.9rem;
    transition: all 0.2s;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.version-button:hover {
    background-color: var(--hover-color);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.version-button.current {
    background-color: var(--primary-color);
    color: white;
    font-weight: 500;
    border-color: var(--primary-color);
    box-shadow: 0 2px 4px rgba(74, 118, 168, 0.25);
}

.versi.mod-btn.primary {
    background-color: var(--primary-color);
    color: white;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}

.mod-btn.primary:hover {
    background-color: var(--primary-color-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.search-container {
    margin-bottom: 1.5rem;
}

.search-wrapper {
    position: relative;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
}

.search-container input {
    width: 100%;
    padding: 12px 40px;
    border: 1px solid var(--border-color);
    border-radius: 24px;
    font-size: 1rem;
    font-family: var(--font-family);
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    transition: all 0.2s ease;
}

.search-container input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 1px 3px rgba(74, 118, 168, 0.25);
}

.mod-highlight {
    border-color: var(--primary-color) !important;
    box-shadow: 0 0 10px var(--primary-color) !important;
    animation: pulse-highlight 3s ease-out;
}

@keyframes pulse-highlight {
    0% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(var(--primary-rgb), 0); }
    100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0); }
}

/* Notes section */
.notes-section {
    background-color: white;
    border-radius: 10px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: var(--card-shadow);
}

.notes-section h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.3rem;
}

.changelog-content {
    white-space: pre-line;
    line-height: 1.6;
    margin-bottom: 1.5rem;
}

.no-comments {
    color: #6c757d;
    font-style: italic;
    font-size: 0.95rem;
}

/* Changelog cards */
.mod-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
}

@media (max-width: 1200px) {
    .mod-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .mod-grid {
        grid-template-columns: 1fr;
    }
}

.changelog-cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
}

.changelog-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    transition: all 0.2s;
    border-left: 3px solid var(--updated-color);
    margin-bottom: 0.75rem;
}

.changelog-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
}

.changelog-card.added {
    border-left-color: var(--added-color);
}

.changelog-card.removed {
    border-left-color: var(--removed-color);
}

.changelog-card.updated {
    border-left-color: var(--updated-color);
}

.changelog-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background-color: rgba(0, 0, 0, 0.02);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.changelog-card-title {
    font-weight: 600;
    font-size: 0.9rem;
}

.changelog-card-content {
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text-color);
    margin-top: 0.5rem;
}

.changelog-card-mod-details {
    padding: 0 0.75rem 0.75rem;
    font-size: 0.85rem;
}

/* Markdown styling */
.changelog-description, .changelog-card-content {
    line-height: 1.6;
}

.changelog-description {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background-color: rgba(0, 0, 0, 0.02);
    border-radius: 4px;
}

/* Code blocks and inline code */
.changelog-description pre, .changelog-card-content pre {
    background-color: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 0.8rem;
    overflow-x: auto;
    margin: 1rem 0;
}

.changelog-description code, .changelog-card-content code {
    background-color: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 3px;
    padding: 0.1rem 0.3rem;
    font-family: monospace;
    font-size: 0.9em;
}

/* Lists */
.changelog-description ul, .changelog-description ol,
.changelog-card-content ul, .changelog-card-content ol {
    padding-left: 2rem;
    margin: 0.5rem 0;
}

.changelog-description li, .changelog-card-content li {
    margin-bottom: 0.3rem;
}

.changelog-card-actions {
    padding: 0 1rem 1rem;
    display: flex;
    justify-content: flex-end;
}

.mod-highlight {
    animation: highlight-pulse 2s ease-in-out;
}

@keyframes highlight-pulse {
    0% { box-shadow: 0 0 0 0 rgba(74, 118, 168, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(74, 118, 168, 0); }
    100% { box-shadow: 0 0 0 0 rgba(74, 118, 168, 0); }
}

/* Compact changelog */
.compact-changelog {
    margin-top: 2rem;
    background-color: rgba(0, 0, 0, 0.02);
    border-radius: 8px;
    padding: 1rem;
}

.compact-changelog h4 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.1rem;
    color: var(--text-color);
    font-weight: 600;
}

.compact-changelog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
}

.compact-changelog-title {
    font-size: 1rem;
    margin-top: 0;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    color: var(--updated-color);
}

.compact-changelog-title.added {
    color: var(--added-color);
}

.compact-changelog-title.removed {
    color: var(--removed-color);
}

.compact-changelog-list {
    list-style-type: none;
    padding-left: 0;
    margin: 0;
}

.compact-changelog-item {
    margin-bottom: 0.5rem;
    border-radius: 6px;
    font-size: 0.9rem;
    overflow: hidden;
    background-color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s;
}

.compact-changelog-item:hover {
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.compact-item-header {
    padding: 0.6rem 0.8rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.02);
    border-radius: 4px;
}

.compact-item-header.clickable {
    cursor: pointer;
    transition: background-color 0.2s;
}

.compact-item-header.clickable:hover {
    background-color: rgba(0, 0, 0, 0.05);
}

.compact-item-text {
    font-weight: 500;
}

.compact-item-toggle {
    color: var(--text-color);
    opacity: 0.5;
    transition: all 0.2s;
}

.compact-item-header:hover .compact-item-toggle {
    opacity: 1;
}

.compact-item-details {
    padding: 0.8rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-top: none;
    display: none;
    background-color: white;
    border-radius: 0 0 4px 4px;
    margin-bottom: 0.8rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.compact-changelog-item.expanded .compact-item-details {
    display: block;
}

.compact-changelog-item.expanded .compact-item-toggle i {
    transform: rotate(180deg);
}

.changelog {
    background-color: var(--light-bg);
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 24px;
}

.changelog h3 {
    color: var(--primary-color);
    margin-bottom: 16px;
}

.changelog-content {
    white-space: pre-line;
}

.footer {
    text-align: center;
    margin-top: 40px;
    padding: 20px;
    color: var(--light-text);
    font-size: 0.875rem;
}

@media (max-width: 768px) {
    body {
        padding: 16px;
    }
    
    .stats-container {
        flex-direction: column;
        gap: 12px;
    }
    
    .mod-grid {
        grid-template-columns: 1fr;
    }
    
    .version-nav {
        flex-direction: column;
    }
}
        """)

def create_js():
    """Create JavaScript files for the GitHub Pages site"""
    ensure_directory(JS_DIR)
    
    # Main JS file
    with open(os.path.join(JS_DIR, 'main.js'), 'w', encoding='utf-8') as f:
        f.write("""
document.addEventListener('DOMContentLoaded', function() {
    // Add fuzzy search functionality
    const searchInput = document.getElementById('mod-search');
    const searchClear = document.getElementById('search-clear');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            const modCards = document.querySelectorAll('.mod-card');
            
            // Show/hide clear button
            if (searchTerm === '') {
                searchClear.classList.remove('visible');
                // Show all cards if search is empty
                modCards.forEach(card => {
                    card.style.display = '';
                });
            } else {
                searchClear.classList.add('visible');
                modCards.forEach(card => {
                    // Search in title
                    const title = card.querySelector('.mod-title');
                    // Search in description
                    const description = card.querySelector('.mod-description');
                    // Search in authors
                    const authors = card.querySelector('.mod-info-item:nth-child(2)');
                    // Search in categories
                    const categories = card.querySelector('.mod-categories');
                    
                    // Combine all searchable text
                    let searchableText = '';
                    if (title) searchableText += title.textContent.toLowerCase() + ' ';
                    if (description) searchableText += description.textContent.toLowerCase() + ' ';
                    if (authors) searchableText += authors.textContent.toLowerCase() + ' ';
                    if (categories) searchableText += categories.textContent.toLowerCase() + ' ';
                    
                    // Also search in data attributes for jar names etc.
                    const dataCategories = card.getAttribute('data-categories');
                    if (dataCategories) searchableText += dataCategories.toLowerCase() + ' ';
                    
                    // Split search term into words for more flexible matching
                    const searchWords = searchTerm.split(/\s+/);
                    
                    // Card is visible if ALL search words are found in the searchable text
                    const visible = searchWords.every(word => searchableText.includes(word));
                    
                    card.style.display = visible ? '' : 'none';
                });
            }
            
            // Show/hide sections based on visible cards
            document.querySelectorAll('.mod-section').forEach(section => {
                const visibleCards = Array.from(section.querySelectorAll('.mod-card')).filter(card => 
                    card.style.display !== 'none'
                );
                
                section.style.display = visibleCards.length === 0 ? 'none' : '';
            });
        });
        
        // Add clear button functionality
        if (searchClear) {
            searchClear.addEventListener('click', function() {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                searchInput.focus();
            });
        }
    }
    
    // Add category filter functionality
    const categoryFilters = document.querySelectorAll('.category-filter');
    categoryFilters.forEach(filter => {
        filter.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.dataset.category;
            const modCards = document.querySelectorAll('.mod-card');
            
            if (category === 'all') {
                modCards.forEach(card => card.style.display = '');
                
                // Show all sections
                document.querySelectorAll('.mod-section').forEach(section => {
                    section.style.display = '';
                });
                
                return;
            }
            
            modCards.forEach(card => {
                const categories = card.dataset.categories ? card.dataset.categories.split(',') : [];
                if (categories.includes(category)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Update section visibility based on whether they have visible cards
            document.querySelectorAll('.mod-section').forEach(section => {
                const visibleCards = section.querySelectorAll('.mod-card[style=""]').length;
                if (visibleCards === 0) {
                    section.style.display = 'none';
                } else {
                    section.style.display = '';
                }
            });
            
            // Update active filter
            document.querySelectorAll('.category-filter').forEach(f => {
                f.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // Copy buttons functionality
    document.querySelectorAll('.mod-btn.copy').forEach(btn => {
        btn.addEventListener('click', function() {
            const textToCopy = this.dataset.copy;
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Change button text temporarily
                    const originalText = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => {
                        this.innerHTML = originalText;
                    }, 2000);
                });
            }
        });
    });
    
    // We've removed the find mod functionality as requested
    
    // We're removing the expandable functionality since all cards are expanded by default
    
    // Add click handlers for compact changelog items
    document.querySelectorAll('.compact-item-header.clickable').forEach(header => {
        header.addEventListener('click', function() {
            const item = this.closest('.compact-changelog-item');
            if (item) {
                item.classList.toggle('expanded');
            }
        });
    });
});
        """)

def generate_index_page(public_modpacks):
    """Generate the main index page listing all public modpacks"""
    ensure_directory(DOCS_DIR)
    
    with open(os.path.join(DOCS_DIR, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minecraft Modpacks</title>
    <link rel="stylesheet" href="css/inter.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/fontawesome.css">
</head>
<body>
    <header>
        <h1>Minecraft Modpacks</h1>
        <p>A collection of curated modpacks for Minecraft</p>
    </header>
    
    <div class="container">
        <h2>Available Modpacks</h2>
        <p>Browse our collection of {len(public_modpacks)} public modpacks:</p>
        
        <div class="mod-grid">
""")
        
        for modpack in public_modpacks:
            name = modpack.get('name', 'Unnamed Modpack')
            description = modpack.get('description', 'No description available.')
            versions = modpack.get('versions', [])
            latest_version = modpack.get('versions', [{}])[-1]
            version_number = latest_version.get('version', 'Unknown')
            mod_count = len(latest_version.get('mods', []))
            
            # Get last updated date
            last_updated = latest_version.get('date', 'Unknown')
            if last_updated == 'Unknown' and 'date' in modpack:
                last_updated = modpack.get('date', 'Unknown')
            
            # Calculate added/removed/updated counts
            changelog = latest_version.get('changelog', {})
            # Handle both string and dictionary changelog formats
            if isinstance(changelog, str):
                added_count = 0
                removed_count = 0
                updated_count = 0
            else:
                added_count = len(changelog.get('added', []))
                removed_count = len(changelog.get('removed', []))
                updated_count = len(changelog.get('updated', []))
            
            # Use pre-calculated stats if available
            if 'added_mods' in latest_version and isinstance(latest_version['added_mods'], list):
                added_count = len(latest_version['added_mods'])
            if 'removed_mods' in latest_version and isinstance(latest_version['removed_mods'], list):
                removed_count = len(latest_version['removed_mods'])
            if 'updated_mods' in latest_version and isinstance(latest_version['updated_mods'], list):
                updated_count = len(latest_version['updated_mods'])
            
            slug = slugify(name)
            f.write(f"""
            <div class="project-card">
                <h3>{name}</h3>
                <div class="stats-container">
                    <div class="stat-card added">
                        <span class="stat-number">{added_count}</span>
                        <span class="stat-label">Added Mods</span>
                    </div>
                    <div class="stat-card removed">
                        <span class="stat-number">{removed_count}</span>
                        <span class="stat-label">Removed Mods</span>
                    </div>
                    <div class="stat-card updated">
                        <span class="stat-number">{updated_count}</span>
                        <span class="stat-label">Updated Mods</span>
                    </div>
                </div>
                <p>{description}</p>
                <div class="mod-info">
                    <p class="mod-info-item"><span class="mod-info-label">Latest Version:</span> {version_number}</p>
                    <p class="mod-info-item"><span class="mod-info-label">Total Mods:</span> {mod_count}</p>
                    <p class="mod-info-item"><span class="mod-info-label">Last Updated:</span> {last_updated}</p>
                </div>
                <div class="mod-actions">
                    <a href="projects/{slug}/index.html" class="mod-btn primary"><i class="fas fa-eye"></i> View Details</a>
                </div>
            </div>
""")
        
        f.write("""
        </div>
    </div>
    
    <footer class="footer">
        <p>Generated by Minecraft Modpack Manager</p>
        <p>Last updated: """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """</p>
    </footer>
    
    <script src="js/main.js"></script>
</body>
</html>
""")

def generate_project_page(modpack):
    """Generate a page for a specific modpack with its latest version"""
    name = modpack.get('name', 'Unnamed Modpack')
    slug = slugify(name)
    project_dir = os.path.join(PROJECTS_DIR, slug)
    versions_dir = os.path.join(project_dir, 'versions')
    
    ensure_directory(project_dir)
    ensure_directory(versions_dir)
    
    # Get the latest version
    versions = modpack.get('versions', [])
    if not versions:
        return
    
    latest_version = versions[-1]
    version_number = latest_version.get('version', 'N/A')
    
    # Generate the main project page (showing latest version)
    with open(os.path.join(project_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(generate_version_html(modpack, latest_version, True))
    
    # Generate pages for each version
    for version in versions:
        version_number = version.get('version', 'N/A')
        version_slug = f"v{version_number}"
        
        with open(os.path.join(versions_dir, f"{version_slug}.html"), 'w', encoding='utf-8') as f:
            f.write(generate_version_html(modpack, version, False))

def generate_version_html(modpack, version, is_latest):
    """Generate HTML content for a specific version of a modpack"""
    name = modpack.get('name', 'Unnamed Modpack')
    description = modpack.get('description', 'No description available.')
    slug = slugify(name)
    version_number = version.get('version', 'N/A')
    mods = version.get('mods', [])
    
    # Handle different changelog formats
    changelog = version.get('changelog', '')
    general_comment = ''
    mod_comments = {}
    
    # Check if changelog is a string or a dict
    if isinstance(changelog, dict):
        general_comment = changelog.get('general', '')
        mod_comments = changelog.get('mods', {})
    elif isinstance(changelog, str):
        general_comment = changelog
    
    # Also check for changelog_comment field which is used in some versions
    if not general_comment and 'changelog_comment' in version:
        general_comment = version.get('changelog_comment', '')
        
    # Check for mod_comments field which might be separate
    if not mod_comments and 'mod_comments' in version:
        mod_comments = version.get('mod_comments', {})
    
    # Get all versions for navigation
    versions = modpack.get('versions', [])
    
    # Get the full list of mods from the current version
    all_mods = version.get('mods', [])
    
    # Get stats for this version
    added_mods = []
    removed_mods = []
    updated_mods = []
    
    # Check if we have pre-calculated stats
    if 'added_mods' in version and isinstance(version['added_mods'], list):
        added_mods = version['added_mods']
    if 'removed_mods' in version and isinstance(version['removed_mods'], list):
        removed_mods = version['removed_mods']
    if 'updated_mods' in version and isinstance(version['updated_mods'], list):
        updated_mods = version['updated_mods']
    
    # Start building HTML
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{name} - Version {version_number}</title>
    <link rel="stylesheet" href="/the-cranium-smp/css/inter.css">
    <link rel="stylesheet" href="/the-cranium-smp/css/style.css">
    <link rel="stylesheet" href="/the-cranium-smp/css/fontawesome.css">
</head>
<body>
    <header>
        <h1>{name}</h1>
        <p>{description}</p>
        <p><a href="/the-cranium-smp/index.html">&laquo; Back to All Modpacks</a></p>
    </header>
    
    <div class="container">
        <h2>[{version_number}] {name}{' (Latest)' if is_latest else ''}</h2>
        
        <div class="version-nav">
"""
    
    # Add version navigation
    for v in versions:
        v_number = v.get('version', 'N/A')
        v_slug = f"v{v_number}"
        is_current = v == version
        
        if is_current:
            html += f"""
            <span class="version-button current">Version {v_number}</span>
"""
        else:
            # Use absolute paths for GitHub Pages
            project_slug = slugify(name)
            href = f"/the-cranium-smp/projects/{project_slug}/versions/{v_slug}.html"
            
            html += f"""
            <a href="{href}" class="version-button">Version {v_number}</a>
"""
    
    # Add stats section
    html += f"""
        </div>
        
        <div class="stats-container">
            <div class="stat-card added">
                <span class="stat-number">{len(added_mods)}</span>
                <span class="stat-label">Added Mods</span>
            </div>
            <div class="stat-card removed">
                <span class="stat-number">{len(removed_mods)}</span>
                <span class="stat-label">Removed Mods</span>
            </div>
            <div class="stat-card updated">
                <span class="stat-number">{len(updated_mods)}</span>
                <span class="stat-label">Updated Mods</span>
            </div>
        </div>
"""
    
    # Helper function to generate full HTML details for a mod
    def _get_full_mod_details_html(mod_name_to_find, current_version_mods_list, version_added_mods_list, version_removed_mods_list, version_updated_mods_list):
        mod_html_details = ""
        mod_info_found = None
        search_name_lower = mod_name_to_find.lower()

        # Priority 1: Current version's mods (includes active, added, updated)
        for m_obj in current_version_mods_list:
            if isinstance(m_obj, dict) and m_obj.get('name', '').lower() == search_name_lower:
                mod_info_found = m_obj
                break
        
        # Priority 2: If not in current (e.g. it was a removed mod), check version_removed_mods_list
        if not mod_info_found:
            for m_obj in version_removed_mods_list:
                if isinstance(m_obj, dict) and m_obj.get('name', '').lower() == search_name_lower:
                    mod_info_found = m_obj
                    break

        # Priority 3 & 4: As a further fallback, check added and updated lists explicitly.
        # This might be redundant if current_version_mods_list is comprehensive for active mods 
        # and version_removed_mods_list for removed ones, but covers other potential edge cases.
        if not mod_info_found:
            for m_obj in version_added_mods_list:
                if isinstance(m_obj, dict) and m_obj.get('name', '').lower() == search_name_lower:
                    mod_info_found = m_obj
                    break
        if not mod_info_found:
            for m_obj in version_updated_mods_list:
                if isinstance(m_obj, dict) and m_obj.get('name', '').lower() == search_name_lower:
                    mod_info_found = m_obj
                    break
        
        if not mod_info_found:
            mod_html_details += f'<div class="mod-info"><p class="mod-info-item"><em>Comprehensive details for &quot;{mod_name_to_find}&quot; could not be located in this version context.</em></p></div>'
            escaped_mod_name = mod_name_to_find.replace('"', '&quot;')
            mod_html_details += '<div class="mod-actions">'
            mod_html_details += f'<button class="mod-btn copy" data-copy=\"{escaped_mod_name}\"><i class="fas fa-copy"></i> Copy Name</button>'
            mod_html_details += '</div>'
            return mod_html_details

        name = mod_info_found.get('name', 'Unknown')
        mod_version = mod_info_found.get('version', 'N/A')
        description_obj = mod_info_found.get('description', 'No description available.')
        url = mod_info_found.get('url', '')
        authors_list = mod_info_found.get('authors', [])
        filename = mod_info_found.get('filename', '')

        if not isinstance(authors_list, list):
            authors_list = [str(authors_list)] if authors_list else []
        authors_str = ', '.join(authors_list) if authors_list else 'Unknown'

        mod_description_text = ''
        icon_url_val = '' # Not used in this context currently, but parsed for completeness
        categories_list = mod_info_found.get('categories', [])[:] # Use a copy
        tags_list = mod_info_found.get('tags', [])[:] # Use a copy

        if isinstance(description_obj, dict):
            mod_description_text = description_obj.get('description', '')
            icon_url_val = description_obj.get('iconUrl', '') # Parsed but not used in this specific HTML output
            categories_list.extend(description_obj.get('categories', []))
            tags_list.extend(description_obj.get('tags', []))
        else:
            mod_description_text = description_obj if description_obj else ''
        
        # Ensure categories and tags are from the mod object itself if not in description_obj
        if 'iconUrl' in mod_info_found and not icon_url_val:
            icon_url_val = mod_info_found.get('iconUrl', '')
        # Check if 'categories' key exists and its value is a list before extending
        if 'categories' in mod_info_found and isinstance(mod_info_found['categories'], list):
            categories_list.extend(mod_info_found.get('categories', []))
        # Check if 'tags' key exists and its value is a list before extending
        if 'tags' in mod_info_found and isinstance(mod_info_found['tags'], list):
            tags_list.extend(mod_info_found.get('tags', []))

        all_display_categories = sorted(list(set(c for c in categories_list + tags_list if c and isinstance(c, str)))) # Filter out empty/None and ensure strings

        mod_html_details += '<div class="mod-info">'
        mod_html_details += f'<p class="mod-info-item"><span class="mod-info-label">Version:</span> <span class="mod-info-value">{mod_version}</span></p>'
        mod_html_details += f'<p class="mod-info-item"><span class="mod-info-label">Authors:</span> <span class="mod-info-value">{authors_str}</span></p>'
        if filename:
            mod_html_details += f'<p class="mod-info-item"><span class="mod-info-label">Filename:</span> <span class="mod-info-value">{filename}</span></p>'
        if url:
            mod_html_details += f'<p class="mod-info-item"><span class="mod-info-label">URL:</span> <a href="{url}" target="_blank" class="mod-info-value">{url}</a></p>'
        else:
            mod_html_details += f'<p class="mod-info-item"><span class="mod-info-label">URL:</span> <em class="mod-info-value">Not available</em></p>'
        
        if mod_description_text and mod_description_text != 'No description available.':
            # Ensure description is string before passing to markdown_to_html
            desc_to_render = str(mod_description_text) if not isinstance(mod_description_text, str) else mod_description_text
            # Convert markdown to HTML but remove any wrapping <p> tags that might cause nesting issues
            html_desc = markdown_to_html(desc_to_render)
            # Remove outer <p></p> if present and add our own container
            if html_desc.startswith('<p>') and html_desc.endswith('</p>'):
                html_desc = html_desc[3:-4]  # Strip the outer <p></p>
            mod_html_details += f'<p class="mod-info-item mod-description-text"><span class="mod-info-label">Description:</span> {html_desc}</p>'
        
        if all_display_categories:
            category_pills = ' '.join([f'<span class="category-pill">{cat}</span>' for cat in all_display_categories])
            mod_html_details += f'<p class="mod-info-item"><span class="mod-info-label">Categories:</span> {category_pills}</p>'
        mod_html_details += '</div>' # Close mod-info

        if not url:
            mod_html_details += """
                            <div class="mod-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>No mod link available. Check Modrinth/CurseForge or verify in Prism Launcher.</span>
                            </div>
"""
        mod_html_details += '<div class="mod-actions">'
        if url:
            mod_html_details += f'<a href="{url}" target="_blank" class="mod-btn primary"><i class="fas fa-external-link-alt"></i> View Mod</a>'
        
        escaped_mod_name = name.replace('"', '&quot;')
        mod_html_details += f'<button class="mod-btn copy" data-copy=\"{escaped_mod_name}\"><i class="fas fa-copy"></i> Copy Name</button>'
        mod_html_details += '</div>' # Close mod-actions
        return mod_html_details

    # Helper function to generate list item HTML for compact changelog
    # Defined here to be within generate_version_html's scope, accessible by the logic below.
    def _generate_li_content_for_compact_changelog(mod_name_str, current_version_mods_list, version_added_mods_list, version_removed_mods_list, version_updated_mods_list):
        li_html_content = f"""
                        <div class="compact-item-header clickable">
                            <span class="compact-item-text">{mod_name_str}</span>
                            <span class="compact-item-toggle"><i class="fas fa-chevron-down"></i></span>
                        </div>
                        <div class="compact-item-details">
                            {_get_full_mod_details_html(mod_name_str, current_version_mods_list, version_added_mods_list, version_removed_mods_list, version_updated_mods_list)}
                        </div>"""
        return li_html_content

    # Add notes/changelog section
    html += """
        <div class="notes-section">
            <h3>Changelog</h3>
"""
    
    # Add changelog comment if available
    changelog_comment = version.get('changelog_comment', '')
    if changelog_comment:
        # Convert markdown to HTML
        formatted_comment = markdown_to_html(changelog_comment)
        html += f"""
            <div class="changelog-description">{formatted_comment}</div>
"""
    
    # We're removing the large changelog text as requested
    
    # Always display the changelog section
    html += """
            <div class="changelog-cards">
"""
    
    # First display mods with comments
    has_commented_mods = False
    if mod_comments:
        for key, comment in mod_comments.items():
            if comment and comment.strip():
                has_commented_mods = True
                # Parse the key to get the change type and mod name
                change_type = "updated"
                mod_name = key
                
                if ':' in key:
                    parts = key.split(':', 1)
                    change_type = parts[0].lower().strip()
                    mod_name = parts[1].strip()
                
                # Map change types to CSS classes
                css_class = "updated"
                if "add" in change_type.lower():
                    css_class = "added"
                elif "remov" in change_type.lower() or "delet" in change_type.lower():
                    css_class = "removed"
                
                html += f"""
                <div class="changelog-card {css_class}">
                    <div class="changelog-card-header">
                        <div class="changelog-card-title">{mod_name}</div>
                        <span class="mod-badge {css_class}">{change_type.capitalize()}</span>
                    </div>
                    <div class="changelog-card-content">{markdown_to_html(comment.strip())}</div>
                    <div class="changelog-card-mod-details">
                        {_get_full_mod_details_html(mod_name, all_mods, added_mods, removed_mods, updated_mods)}
                    </div>
                </div>
"""
        
        if not has_commented_mods:
            html += """
                <p class="no-comments">No detailed mod change comments available for this version.</p>
"""
        
    # Then list mods without comments in a compact format
    compact_mods = {}
    if mod_comments:
        for key in mod_comments.keys():
            comment = mod_comments[key]
            if not comment or not comment.strip():
                change_type = "updated"
                mod_name = key
                
                if ':' in key:
                    parts = key.split(':', 1)
                    change_type = parts[0].lower().strip()
                    mod_name = parts[1].strip()
                
                if change_type not in compact_mods:
                    compact_mods[change_type] = []
                
                compact_mods[change_type].append(mod_name)
        


    # Compact changelog section using added_mods, removed_mods, updated_mods
    if added_mods or removed_mods or updated_mods:
        html += """
                <div class="compact-changelog">
                    <h4>Changed Mods</h4>
                    <div class="compact-changelog-grid">
"""
        if added_mods:
            html += """
                        <div class="compact-changelog-section">
                            <h5 class="compact-changelog-title added">Added</h5>
                            <ul class="compact-changelog-list">
"""
            for mod_obj in added_mods: # Iterate over mod objects
                mod_name_str = mod_obj.get('name', 'Unknown Mod') if isinstance(mod_obj, dict) else str(mod_obj) # Extract name string
                html += f"""
                                <li class="compact-changelog-item">
                                    {_generate_li_content_for_compact_changelog(mod_name_str, all_mods, added_mods, removed_mods, updated_mods)}
                                </li>
"""
            html += """
                            </ul>
                        </div>
"""

        if removed_mods:
            html += """
                        <div class="compact-changelog-section">
                            <h5 class="compact-changelog-title removed">Removed</h5>
                            <ul class="compact-changelog-list">
"""
            for mod_obj in removed_mods: # Iterate over mod objects
                mod_name_str = mod_obj.get('name', 'Unknown Mod') if isinstance(mod_obj, dict) else str(mod_obj) # Extract name string
                html += f"""
                                <li class="compact-changelog-item">
                                    {_generate_li_content_for_compact_changelog(mod_name_str, all_mods, added_mods, removed_mods, updated_mods)}
                                </li>
"""
            html += """
                            </ul>
                        </div>
"""
            
        if updated_mods:
            html += """
                        <div class="compact-changelog-section">
                            <h5 class="compact-changelog-title updated">Updated</h5>
                            <ul class="compact-changelog-list">
"""
            for mod_obj in updated_mods: # Iterate over mod objects
                mod_name_str = mod_obj.get('name', 'Unknown Mod') if isinstance(mod_obj, dict) else str(mod_obj) # Extract name string
                html += f"""
                                <li class="compact-changelog-item">
                                    {_generate_li_content_for_compact_changelog(mod_name_str, all_mods, added_mods, removed_mods, updated_mods)}
                                </li>
"""
            html += """
                            </ul>
                        </div>
"""
        
        html += """
                    </div>
                </div>
""" # Close compact-changelog-grid and compact-changelog
    elif not has_commented_mods: # This 'has_commented_mods' is set earlier in the function
        html += """
                <p class="no-changes">No changes for this version.</p>
"""

    html += """
            </div>
""" # Close changelog-cards (this was the original end of the TargetContent block)

    # Explicitly close the notes-section here to ensure proper grouping
    html += """
        </div>
""" # Close notes-section
    
    # Generate the mod list section
    html += f"""
    <section id="mods">
        <h2>Mod List</h2>
        <div class="search-container">
            <div class="search-wrapper">
                <i class="fas fa-search search-icon"></i>
                <input type="text" id="mod-search" placeholder="Search mods..." />
                <div class="search-clear" id="search-clear"><i class="fas fa-times"></i></div>
            </div>
        </div>
        <div class="mod-grid">
"""
    
    # All mods will be displayed in the mod grid
    # No need for additional section wrapper
    html += """
"""
    
    # Add all mods from the current version
    for mod in all_mods:
        if isinstance(mod, dict):
            name = mod.get('name', 'Unknown')
            mod_version = mod.get('version', 'N/A')
            description = mod.get('description', 'No description available.')
            url = mod.get('url', '')
            categories = mod.get('categories', [])
            authors = mod.get('authors', [])
        else:
            # If mod is a string, use it as the name
            name = str(mod)
            mod_version = 'N/A'
            description = 'No description available.'
            url = ''
            categories = []
            authors = []
            
        categories_str = ','.join(categories) if categories else ''
        if not isinstance(authors, list):
            authors = [str(authors)] if authors else []
        authors_str = ', '.join(authors) if authors else 'Unknown'
        
        # Get filename from mod if available
        filename = mod.get('filename', '') if isinstance(mod, dict) else ''
        
        # Handle description which can now be a dictionary
        mod_description = ''
        icon_url = ''
        categories = []
        tags = []
        
        if isinstance(description, dict):
            mod_description = description.get('description', '')
            icon_url = description.get('iconUrl', '')
            categories.extend(description.get('categories', []))
            tags.extend(description.get('tags', []))
        else:
            mod_description = description if description else ''
        
        # Get additional metadata directly from mod
        if isinstance(mod, dict):
            if not icon_url and 'iconUrl' in mod:
                icon_url = mod.get('iconUrl', '')
            if 'categories' in mod and not categories:
                categories.extend(mod.get('categories', []))
            if 'tags' in mod and not tags:
                tags.extend(mod.get('tags', []))
        
        # Create a unique list of categories
        all_categories = list(set(categories + tags))
        categories_str = ','.join(all_categories) if all_categories else ''
        
        html += f"""
        <div class="mod-card expanded" data-categories="{categories_str}">
            <div class="mod-header">
                <div class="mod-title">{name}</div>
            </div>
            <div class="mod-details">
                <div class="mod-info">
                    <p class="mod-info-item"><span class="mod-info-label">Version:</span> {mod_version}</p>
                    <p class="mod-info-item"><span class="mod-info-label">Authors:</span> {authors_str}</p>
"""                    
        # Add filename if available
        if filename:
            html += f"""
                    <p class="mod-info-item"><span class="mod-info-label">Filename:</span> {filename}</p>
"""
        
        # Add URL if available
        if url:
            html += f"""
                    <p class="mod-info-item"><span class="mod-info-label">URL:</span> <a href="{url}" target="_blank">{url}</a></p>
"""
        else:
            html += f"""
                    <p class="mod-info-item"><span class="mod-info-label">URL:</span> <em>Check Prism Launcher for mod source</em></p>
"""
            
        # Add description if available
        if mod_description and mod_description != 'No description available.':
            html += f"""
                    <p class="mod-info-item"><span class="mod-info-label">Description:</span> {mod_description}</p>
"""
        
        # Categories will be moved to the footer
            
        html += """
                </div>
                
                <!-- Categories as pills above action buttons -->
"""                
        # Add categories as pills above action buttons
        if all_categories:
            html += """
                <div class="mod-categories">
"""
            for category in all_categories:
                html += f"""
                    <span class="category-pill">{category}</span>
"""
            html += """
                </div>
"""
        
        # Add warning if no URL
        if not url:
            html += """
            <div class="mod-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>No mod link available. Check Modrinth/CurseForge or verify in Prism Launcher.</span>
            </div>
"""
        
        # Add actions
        html += """
            <div class="mod-actions">
"""
        
        if url:
            html += f"""
                <a href="{url}" target="_blank" class="mod-btn primary"><i class="fas fa-external-link-alt"></i> View Mod</a>
"""
        
        html += """
                <button class="mod-btn copy" data-copy=""" + name + """><i class="fas fa-copy"></i> Copy</button>
            </div>
"""
        
        # Categories are now above action buttons
        
        html += """
            </div>
        </div>
"""
    
    html += """
        </div>
    </section>
    
    <footer class="footer">
        <p>Generated by Minecraft Modpack Manager</p>
        <p>Last updated: """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """</p>
    </footer>
    
    <script src="/the-cranium-smp/js/main.js"></script>
</body>
</html>
"""
    
    return html

def generate_github_pages():
    """Main function to generate GitHub Pages for all public modpacks"""
    # Create required directories
    ensure_directory(DOCS_DIR)
    ensure_directory(PROJECTS_DIR)
    ensure_directory(CSS_DIR)
    ensure_directory(JS_DIR)
    ensure_directory(ASSETS_DIR)
    
    # Create CSS and JS files
    create_css()
    create_js()
    
    # Get all modpacks
    modpack_files = list_modpacks()
    public_modpacks = []
    
    # Filter for public modpacks
    for filename in modpack_files:
        modpack = load_modpack(filename)
        if modpack.get('public', False):
            public_modpacks.append(modpack)
    
    # Generate the index page
    generate_index_page(public_modpacks)
    
    # Generate individual project pages
    for modpack in public_modpacks:
        generate_project_page(modpack)
    
    return len(public_modpacks)

if __name__ == '__main__':
    count = generate_github_pages()
    print(f"Generated GitHub Pages for {count} public modpacks.")
