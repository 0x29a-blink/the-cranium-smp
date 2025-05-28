import sys
import json
import os
import requests
import threading
import webbrowser
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QPushButton, QLabel, QDialog, QLineEdit,
    QTextEdit, QFileDialog, QTableWidget, QTableWidgetItem, QHBoxLayout, QMessageBox, QMenuBar, QAction, QListWidget, QInputDialog,
    QScrollArea, QComboBox, QCheckBox, QHeaderView, QProgressDialog, QProgressBar
)
from PyQt5.QtCore import Qt, QUrl, QTimer
from PyQt5.QtGui import QDesktopServices
from modpack_utils import save_modpack, list_modpacks, load_modpack
from github_pages_generator import generate_github_pages

CONFIG_FILE = 'config.json'

# Helper function to parse modlist file
def parse_modlist(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        mods = json.load(f)
    return mods

# Config management for API key
def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_config(config):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)

# Prompt for API key dialog
class ApiKeyDialog(QDialog):
    def __init__(self, current_key='', parent=None):
        super().__init__(parent)
        self.setWindowTitle('Enter CurseForge API Key')
        self.api_key = ''
        layout = QVBoxLayout()
        layout.addWidget(QLabel('CurseForge API Key:'))
        self.key_edit = QLineEdit()
        self.key_edit.setText(current_key)
        layout.addWidget(self.key_edit)
        btn_layout = QHBoxLayout()
        ok_btn = QPushButton('OK')
        ok_btn.clicked.connect(self.accept)
        cancel_btn = QPushButton('Cancel')
        cancel_btn.clicked.connect(self.reject)
        btn_layout.addWidget(ok_btn)
        btn_layout.addWidget(cancel_btn)
        layout.addLayout(btn_layout)
        self.setLayout(layout)
    def accept(self):
        self.api_key = self.key_edit.text().strip()
        if not self.api_key:
            QMessageBox.critical(self, 'Error', 'API key cannot be empty!')
            return
        super().accept()

# Fetch mod description and info from APIs
def fetch_mod_details(mod, curseforge_api_key):
    url = mod.get('url', '')
    desc = ''
    categories = []
    icon_url = ''
    tags = []
    updated_fields = {}
    
    if 'curseforge.com' in url:
        # Try to extract project slug or id from URL
        try:
            # Example: https://www.curseforge.com/minecraft/mc-mods/jei
            parts = url.rstrip('/').split('/')
            if 'mc-mods' in parts:
                slug = parts[parts.index('mc-mods') + 1]
                # Use CurseForge API to get project by slug
                api_url = f'https://api.curseforge.com/v1/mods/search?gameId=432&slug={slug}'
                headers = {'x-api-key': curseforge_api_key}
                resp = requests.get(api_url, headers=headers, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    if data['data']:
                        mod_info = data['data'][0]
                        desc = mod_info.get('summary', '')
                        icon_url = mod_info.get('logo', {}).get('url', '')
                        # Extract categories
                        if 'categories' in mod_info:
                            categories = [cat.get('name', '') for cat in mod_info['categories']]
                        
                # fallback: try by project id if available
            elif parts[-1].isdigit():
                project_id = parts[-1]
                api_url = f'https://api.curseforge.com/v1/mods/{project_id}'
                headers = {'x-api-key': curseforge_api_key}
                resp = requests.get(api_url, headers=headers, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    mod_info = data['data']
                    desc = mod_info.get('summary', '')
                    icon_url = mod_info.get('logo', {}).get('url', '')
                    # Extract categories
                    if 'categories' in mod_info:
                        categories = [cat.get('name', '') for cat in mod_info['categories']]
        except Exception as e:
            print(f"Error fetching CurseForge data: {e}")
            return {}
    elif 'modrinth.com' in url:
        # Example: https://modrinth.com/mod/jei
        try:
            parts = url.rstrip('/').split('/')
            if 'mod' in parts:
                project_id = parts[parts.index('mod') + 1]
                api_url = f'https://api.modrinth.com/v2/project/{project_id}'
                resp = requests.get(api_url, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    desc = data.get('description', '')
                    icon_url = data.get('icon_url', '')
                    # Extract categories and tags
                    if 'categories' in data:
                        categories = data.get('categories', [])
                    if 'tags' in data:
                        tags = data.get('tags', [])
                        # Add tags to categories for unified filtering
                        categories.extend(tags)
        except Exception as e:
            print(f"Error fetching Modrinth data: {e}")
            return {}
    elif 'github.com' in url:
        # Example: https://github.com/author/repo
        try:
            parts = url.rstrip('/').split('/')
            if len(parts) >= 5:
                owner, repo = parts[3], parts[4]
                api_url = f'https://api.github.com/repos/{owner}/{repo}'
                resp = requests.get(api_url, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    desc = data.get('description', '')
                    # Extract topics as categories
                    if 'topics' in data:
                        categories = data.get('topics', [])
        except Exception as e:
            print(f"Error fetching GitHub data: {e}")
            return {}
    # else: leave desc blank
    
    # Prepare updated fields
    if categories:
        updated_fields['categories'] = list(set(categories))
    if desc:
        updated_fields['description'] = desc
    if icon_url:
        updated_fields['iconUrl'] = icon_url
    if tags:
        updated_fields['tags'] = tags
    return updated_fields

class CreateModpackDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle('Create New Modpack')
        self.modpack_name = ''
        self.modpack_desc = ''
        self.modlist_path = ''
        self.is_public = False
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        layout.addWidget(QLabel('Modpack Name:'))
        self.name_edit = QLineEdit()
        layout.addWidget(self.name_edit)
        layout.addWidget(QLabel('Description:'))
        self.desc_edit = QTextEdit()
        self.desc_edit.setFixedHeight(60)
        layout.addWidget(self.desc_edit)
        hlayout = QHBoxLayout()
        self.modlist_edit = QLineEdit()
        self.modlist_edit.setReadOnly(True)
        hlayout.addWidget(self.modlist_edit)
        browse_btn = QPushButton('Browse')
        browse_btn.clicked.connect(self.browse_modlist)
        hlayout.addWidget(browse_btn)
        layout.addWidget(QLabel('Upload Modlist (.json):'))
        layout.addLayout(hlayout)
        
        # Add public checkbox
        self.public_checkbox = QCheckBox('Make this modpack public (will appear on GitHub Pages)')
        self.public_checkbox.setChecked(False)
        layout.addWidget(self.public_checkbox)
        
        # Add help text for public checkbox
        help_label = QLabel('Note: Public modpacks will be displayed on the GitHub Pages site. Once made public, a modpack cannot be made private again.')
        help_label.setWordWrap(True)
        help_label.setStyleSheet('color: #666; font-style: italic; font-size: 10px;')
        layout.addWidget(help_label)
        
        btn_layout = QHBoxLayout()
        create_btn = QPushButton('Create')
        create_btn.clicked.connect(self.accept)
        cancel_btn = QPushButton('Cancel')
        cancel_btn.clicked.connect(self.reject)
        btn_layout.addWidget(create_btn)
        btn_layout.addWidget(cancel_btn)
        layout.addLayout(btn_layout)
        self.setLayout(layout)

    def browse_modlist(self):
        filepath, _ = QFileDialog.getOpenFileName(self, "Select Modlist", "", "JSON Files (*.json)")
        if filepath:
            self.modlist_edit.setText(filepath)
            self.modlist_path = filepath

    def accept(self):
        self.modpack_name = self.name_edit.text().strip()
        self.modpack_desc = self.desc_edit.toPlainText().strip()
        self.is_public = self.public_checkbox.isChecked()
        
        if not self.modpack_name:
            QMessageBox.critical(self, 'Error', 'Modpack name cannot be empty!')
            return
        if not self.modlist_path:
            QMessageBox.critical(self, 'Error', 'Please select a modlist file!')
            return
        super().accept()

class ChangelogCommentDialog(QDialog):
    def __init__(self, changes, parent=None):
        super().__init__(parent)
        self.setWindowTitle('Changelog & Comments')
        self.resize(700, 500)
        self.comments = {}
        self.general_comment = ''
        layout = QVBoxLayout()
        layout.addWidget(QLabel('General Changelog Comment:'))
        self.general_edit = QTextEdit()
        layout.addWidget(self.general_edit)
        layout.addWidget(QLabel('Mod Changes:'))
        
        # Create a scrollable area for mod changes
        self.list_widget = QWidget()
        self.list_layout = QVBoxLayout(self.list_widget)
        self.list_layout.setSpacing(10)
        self.input_widgets = []  # [(key, label, edit)]
        
        # Add mod changes to the scrollable list
        for change_type, mod in changes:
            row = QWidget()
            row_layout = QVBoxLayout(row)
            row_layout.setContentsMargins(5, 5, 5, 5)
            
            # Create header with mod info
            header_layout = QHBoxLayout()
            
            if change_type == 'added':
                name = mod.get('name','')
                version = mod.get('version','')
                filename = mod.get('filename','')
                url = mod.get('url','')
                label = f"Added: {name} ({version}) [{filename}]"
                key = f"added:{name}"
                
                # Create header label
                header_label = QLabel(f"<b>Added:</b> {name} ({version})")
                header_layout.addWidget(header_label)
                
            elif change_type == 'removed':
                name = mod.get('name','')
                version = mod.get('version','')
                filename = mod.get('filename','')
                url = mod.get('url','')
                label = f"Removed: {name} ({version}) [{filename}]"
                key = f"removed:{name}"
                
                # Create header label
                header_label = QLabel(f"<b>Removed:</b> {name} ({version})")
                header_layout.addWidget(header_label)
                
            elif change_type == 'updated':
                name = mod['new'].get('name','')
                old_version = mod['old'].get('version', '')
                new_version = mod['new'].get('version', '')
                url = mod['new'].get('url','')
                
                # Format version changes clearly
                version_changes = []
                for field, (oldv, newv) in mod['diffs'].items():
                    if field == 'version':
                        version_changes.append(f"<b>Version:</b> {oldv} → {newv}")
                    else:
                        version_changes.append(f"{field}: {oldv} → {newv}")
                        
                diffs = ', '.join([f"{field}: {oldv} -> {newv}" for field, (oldv, newv) in mod['diffs'].items()])
                label = f"Updated: {name} ({diffs})"
                key = f"updated:{name}"
                
                # Create header label
                header_label = QLabel(f"<b>Updated:</b> {name}")
                header_layout.addWidget(header_label)
                
                # Add version change info
                for change_info in version_changes:
                    change_label = QLabel(change_info)
                    row_layout.addWidget(change_label)
            else:
                continue
                
            # Add URL button if available
            if url:
                link_btn = QPushButton("Open Mod URL")
                link_btn.setMaximumWidth(150)
                link_btn.clicked.connect(lambda checked, u=url: QDesktopServices.openUrl(QUrl(u)))
                header_layout.addWidget(link_btn)
            else:
                no_url_label = QLabel("(No URL available)")
                no_url_label.setStyleSheet("color: gray;")
                header_layout.addWidget(no_url_label)
                
            header_layout.addStretch()
            row_layout.addLayout(header_layout)
            edit = QTextEdit()
            edit.setMinimumHeight(60)
            row_layout.addWidget(edit)
            self.list_layout.addWidget(row)
            self.input_widgets.append((key, label, edit))
            
        # Create scroll area and add the list widget to it
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setWidget(self.list_widget)
        scroll_area.setMinimumHeight(250)
        layout.addWidget(scroll_area)
        
        # Button layout
        btn_layout = QHBoxLayout()
        ok_btn = QPushButton('OK')
        ok_btn.clicked.connect(self.accept)
        cancel_btn = QPushButton('Cancel')
        cancel_btn.clicked.connect(self.reject)
        btn_layout.addWidget(ok_btn)
        btn_layout.addWidget(cancel_btn)
        layout.addLayout(btn_layout)
        self.setLayout(layout)
    def accept(self):
        self.general_comment = self.general_edit.toPlainText().strip()
        self.comments = {}
        for key, label, edit in self.input_widgets:
            txt = edit.toPlainText().strip()
            if txt:
                self.comments[key] = txt
        super().accept()

class ModsTableDialog(QDialog):
    def __init__(self, modpack_data, parent=None, editable=False, api_key=None):
        super().__init__(parent)
        self.setWindowTitle(f"Modpack: {modpack_data.get('name', '')}")
        self.resize(1300, 700)
        self.modpack_data = modpack_data
        self.api_key = api_key
        self.editable = editable
        self.all_mods = []
        
        # Set a flag to indicate we're initializing to prevent unnecessary processing
        self.initializing = True
        
        # Create a loading indicator
        self.loading_label = QLabel("Loading modpack data...", self)
        self.loading_label.setAlignment(Qt.AlignCenter)
        self.loading_label.setStyleSheet("font-size: 16px; color: #555;")
        
        # Create a temporary layout for the loading indicator
        # but don't set it as the dialog's layout yet
        self.temp_layout = QVBoxLayout()
        self.temp_layout.addWidget(self.loading_label)
        
        # We'll create a temporary widget to hold this layout
        temp_widget = QWidget(self)
        temp_widget.setLayout(self.temp_layout)
        temp_widget.setGeometry(0, 0, 1300, 700)
        
        # Initialize UI in a non-blocking way using a timer
        QTimer.singleShot(10, self.init_ui)

    def init_ui(self):
        from modpack_utils import get_next_version_number, compare_modlists, generate_changelog
        layout = QVBoxLayout()
        
        # Add a progress bar at the top
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(0)
        self.progress_bar.setTextVisible(True)
        self.progress_bar.setFormat("Loading mods: %p%")
        self.progress_bar.setVisible(False)  # Hide initially
        layout.addWidget(self.progress_bar)
        # Editable fields for modpack name/desc
        if self.editable:
            self.name_edit = QLineEdit(self.modpack_data.get('name', ''))
            self.desc_edit = QTextEdit(self.modpack_data.get('description', ''))
            layout.addWidget(QLabel('Modpack Name:'))
            layout.addWidget(self.name_edit)
            layout.addWidget(QLabel('Description:'))
            layout.addWidget(self.desc_edit)
            
            # Add public checkbox
            public_layout = QHBoxLayout()
            self.public_checkbox = QCheckBox('Public Modpack (will appear on GitHub Pages)')
            self.public_checkbox.setChecked(self.modpack_data.get('public', False))
            
            # If already public, disable the checkbox to prevent making it private again
            if self.modpack_data.get('public', False):
                self.public_checkbox.setEnabled(False)
                self.public_checkbox.setChecked(True)  # Ensure it's checked
                public_layout.addWidget(QLabel('This modpack is public and cannot be made private.'))
            
            # Connect to state changed to enforce the one-way toggle
            self.public_checkbox.stateChanged.connect(self._enforce_public_toggle)
            
            public_layout.addWidget(self.public_checkbox)
            public_layout.addStretch()
            layout.addLayout(public_layout)
        # Version history display
        self.versions = self.modpack_data.get('versions', [])
        # Create an initial version entry if none exists but we have mods
        if not self.versions and self.modpack_data.get('mods', []):
            from datetime import datetime
            # Create a v1 entry for the current mods
            initial_version = {
                'version': 1,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'mods': self.modpack_data.get('mods', []),
                'changelog': 'Initial version',
                'changelog_comment': 'Initial modpack version',
                'mod_comments': {}
            }
            self.versions = [initial_version]
            self.modpack_data['versions'] = self.versions
            
        # Display all versions in the list
        if self.versions:
            layout.addWidget(QLabel('Version History:'))
            self.version_list = QListWidget()
            for v in self.versions:
                label = f"v{v['version']} ({v['timestamp']})"
                self.version_list.addItem(label)
            # Connect the version list to the view_version_mods method
            self.version_list.currentRowChanged.connect(self.view_version_mods)
            # Track connection state for signal management
            self._version_list_connected = True
            layout.addWidget(self.version_list)
            
            # Add buttons for version actions in a horizontal layout
            btn_layout = QHBoxLayout()
            
            # Use different button text based on edit mode
            if self.editable:
                view_changelog_btn = QPushButton('Edit Changelog')
            else:
                view_changelog_btn = QPushButton('View Changelog')
            view_changelog_btn.clicked.connect(self.view_changelog)
            btn_layout.addWidget(view_changelog_btn)
            
            view_mods_btn = QPushButton('View Version Mods')
            view_mods_btn.clicked.connect(self.view_version_mods)
            btn_layout.addWidget(view_mods_btn)
            
            layout.addLayout(btn_layout)
        # Main mods table (current version)
        columns = ['Name', 'Version', 'Authors', 'Filename', 'URL', 'Description']
        # Add search bar
        search_layout = QHBoxLayout()
        search_layout.addWidget(QLabel('Search:'))
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText('Filter mods by name, author, version, etc.')
        self.search_input.textChanged.connect(lambda text: self.filter_mods(text))
        search_layout.addWidget(self.search_input)
        self.clear_search_btn = QPushButton('Clear')
        self.clear_search_btn.clicked.connect(self.clear_search)
        search_layout.addWidget(self.clear_search_btn)
        layout.addLayout(search_layout)
        
        # Create table for mods
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(['Name', 'Version', 'Authors', 'Filename', 'URL', 'Description'])
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(4, QHeaderView.ResizeToContents)
        self.table.horizontalHeader().setSectionResizeMode(5, QHeaderView.Stretch)
        
        # Create the return button (hidden by default)
        self.return_btn = QPushButton('Return to Current Version')
        self.return_btn.clicked.connect(self.show_current_mods)
        self.return_btn.setVisible(False)  # Hide initially
        
        # Add the return button to the top of the layout
        return_btn_layout = QHBoxLayout()
        return_btn_layout.addWidget(self.return_btn)
        return_btn_layout.addStretch()
        layout.insertLayout(layout.count(), return_btn_layout)
        
        # Find the latest version and display its mods
        self.all_mods = []
        if hasattr(self, 'versions') and self.versions:
            # Find the latest version by version number
            latest_version = max(self.versions, key=lambda v: v.get('version', 0))
            latest_index = self.versions.index(latest_version)
            
            # Get mods from the latest version
            mods = latest_version.get('mods', [])
            
            # Update window title to show we're viewing the latest version
            self.setWindowTitle(f"Modpack: {self.modpack_data.get('name', '')} - v{latest_version.get('version', '')} (Latest)")
            
            # If version list exists, select the latest version
            if hasattr(self, 'version_list'):
                self.version_list.setCurrentRow(latest_index)
        else:
            # No versions available, show current mods
            mods = self.modpack_data.get('mods', [])
            
        # Store the mods for later use without processing them yet
        self.all_mods = mods.copy()
        
        # Just set the row count without populating data yet
        self.table.setRowCount(len(mods))
        
        # Defer the actual population to a separate method that will run after UI is shown
        QTimer.singleShot(100, self.populate_table_deferred)
        if self.editable:
            self.table.setEditTriggers(QTableWidget.AllEditTriggers)
        else:
            self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.resizeColumnsToContents()
        layout.addWidget(self.table)
        self.btn_layout = QHBoxLayout()
        if self.editable:
            add_ver_btn = QPushButton('Add New Version (Upload Modlist)')
            add_ver_btn.clicked.connect(self.add_new_version)
            self.btn_layout.addWidget(add_ver_btn)
            refetch_btn = QPushButton('Refetch API Data')
            refetch_btn.clicked.connect(self.refetch_api_data)
            self.btn_layout.addWidget(refetch_btn)
            save_btn = QPushButton('Save Changes')
            save_btn.clicked.connect(self.save_changes)
            self.btn_layout.addWidget(save_btn)
            
            # Add backup and restore buttons
            backup_btn = QPushButton('Create Backup')
            backup_btn.clicked.connect(self.create_backup)
            self.btn_layout.addWidget(backup_btn)
            restore_btn = QPushButton('Restore Backup')
            restore_btn.clicked.connect(self.restore_backup)
            self.btn_layout.addWidget(restore_btn)
            
            # GitHub Pages button moved to main menu
        close_btn = QPushButton('Close')
        close_btn.clicked.connect(self.accept)
        self.btn_layout.addWidget(close_btn)
        layout.addLayout(self.btn_layout)
        self.setLayout(layout)

    def populate_table_deferred(self):
        """Populate the table with mod data - using a minimal loading strategy"""
        # If we have a loading label, hide it
        if hasattr(self, 'loading_label'):
            self.loading_label.setVisible(False)
        
        total_mods = len(self.all_mods)
        if total_mods == 0:
            # No mods to process
            return
        
        # Show the progress bar briefly just to indicate activity
        if hasattr(self, 'progress_bar'):
            self.progress_bar.setVisible(True)
            self.progress_bar.setValue(0)
            self.progress_bar.setFormat(f"Preparing {total_mods} mods...")
        
        print(f"Setting up table for {total_mods} mods...")
        
        # Just set the row count without populating data
        self.table.setRowCount(total_mods)
        
        # Connect to the table's scrolling to load visible rows
        if not hasattr(self, '_scroll_connected') or not self._scroll_connected:
            self.table.verticalScrollBar().valueChanged.connect(self._load_visible_rows)
            self._scroll_connected = True
        
        # Load only the visible rows initially
        QTimer.singleShot(0, self._load_visible_rows)
        
        # Update progress bar to 100% and hide after a brief delay
        if hasattr(self, 'progress_bar'):
            self.progress_bar.setValue(100)
            self.progress_bar.setFormat(f"Ready to display {total_mods} mods")
            QTimer.singleShot(500, lambda: self.progress_bar.setVisible(False))
            
        print(f"Table prepared for {total_mods} mods")
        self.initializing = False
        
    def _load_visible_rows(self):
        """Load only the rows that are currently visible in the table"""
        if not hasattr(self, 'table') or not hasattr(self, 'all_mods'):
            return
            
        # Get the visible row range
        first_visible_row = self.table.rowAt(0)
        if first_visible_row < 0:
            first_visible_row = 0
            
        # Calculate the last visible row based on table height
        last_visible_row = self.table.rowAt(self.table.viewport().height())
        if last_visible_row < 0:
            # If no row at bottom, use first visible + visible count
            rows_visible = self.table.viewport().height() // self.table.rowHeight(0) if self.table.rowHeight(0) > 0 else 20
            last_visible_row = first_visible_row + rows_visible
        
        # Add buffer rows above and below
        buffer = 10
        first_row = max(0, first_visible_row - buffer)
        last_row = min(len(self.all_mods) - 1, last_visible_row + buffer)
        
        print(f"Loading rows {first_row} to {last_row} (visible: {first_visible_row} to {last_visible_row})")
        
        # Load only the visible rows plus buffer
        for row in range(first_row, last_row + 1):
            # Skip if row is already populated
            if self.table.item(row, 0) is not None and self.table.item(row, 0).text() != "":
                continue
                
            try:
                mod = self.all_mods[row]
                
                # Safely get values with defaults to prevent errors
                name = str(mod.get('name', '')) if mod.get('name') else ''
                version = str(mod.get('version', '')) if mod.get('version') else ''
                
                # Handle authors safely
                authors = mod.get('authors', [])
                if not isinstance(authors, list):
                    authors = [str(authors)] if authors else []
                authors_str = ', '.join(str(a) for a in authors)
                
                filename = str(mod.get('filename', '')) if mod.get('filename') else ''
                url = str(mod.get('url', '')) if mod.get('url') else ''
                # Ensure description is always a string for display
                raw_desc = mod.get('description', '')
                if isinstance(raw_desc, dict):
                    description = str(raw_desc.get('description', ''))
                else:
                    description = str(raw_desc) if raw_desc else ''
                
                # Set table items
                self.table.setItem(row, 0, QTableWidgetItem(name))
                self.table.setItem(row, 1, QTableWidgetItem(version))
                self.table.setItem(row, 2, QTableWidgetItem(authors_str))
                self.table.setItem(row, 3, QTableWidgetItem(filename))
                self.table.setItem(row, 4, QTableWidgetItem(url))
                self.table.setItem(row, 5, QTableWidgetItem(description))
                
            except Exception as e:
                print(f"Error processing mod at row {row}: {e}")
                # Add placeholder for error
                self.table.setItem(row, 0, QTableWidgetItem(f"Error: {str(e)[:30]}..."))
                for col in range(1, 6):
                    self.table.setItem(row, col, QTableWidgetItem(""))
                    
        # Process events to keep UI responsive
        QApplication.processEvents()

    def refetch_api_data(self):
        """Explicitly refetch API data for all mods - only called when the user clicks the Refetch API Data button"""
        # Confirm with the user that they want to make API calls
        confirm = QMessageBox.question(self, "Confirm API Calls", 
                                      "This will make external API calls to fetch additional data for all mods. Continue?",
                                      QMessageBox.Yes | QMessageBox.No)
        if confirm != QMessageBox.Yes:
            return
            
        # Gather all mods in all versions
        total_mods = 0
        for version in getattr(self, 'versions', []):
            total_mods += len(version.get('mods', []))
        mod_idx = 0
        progress = QProgressDialog("Fetching mod details from external APIs...", "Cancel", 0, total_mods, self)
        progress.setWindowTitle("API Data")
        progress.setWindowModality(Qt.WindowModal)

        # Update all mods in all versions
        for version in getattr(self, 'versions', []):
            for mod in version.get('mods', []):
                if progress.wasCanceled():
                    if hasattr(self, 'progress_bar'):
                        self.progress_bar.setValue(100)
                        self.progress_bar.setFormat("API data fetch canceled")
                        QTimer.singleShot(1000, lambda: self.progress_bar.setVisible(False))
                    return
                if mod.get('url'):
                    try:
                        updated_mod = fetch_mod_details(mod, self.api_key)
                        for key in ('description', 'iconUrl', 'categories', 'tags'):
                            if key in updated_mod:
                                val = updated_mod[key]
                                if key == 'description' and isinstance(val, dict):
                                    mod[key] = str(val.get('description', ''))
                                else:
                                    mod[key] = val
                    except Exception as e:
                        print(f"Error fetching data for {mod.get('name')}: {e}")
                mod_idx += 1
                progress.setValue(mod_idx)
                if hasattr(self, 'progress_bar'):
                    progress_percent = int((mod_idx / total_mods) * 100) if total_mods else 0
                    self.progress_bar.setValue(progress_percent)
                    self.progress_bar.setFormat(f"Fetching API data: %p% ({mod_idx}/{total_mods})")

        # Also update self.all_mods for UI consistency
        for mod in getattr(self, 'all_mods', []):
            if mod.get('url'):
                try:
                    updated_mod = fetch_mod_details(mod, self.api_key)
                    for key in ('description', 'iconUrl', 'categories', 'tags'):
                        if key in updated_mod:
                            val = updated_mod[key]
                            if key == 'description' and isinstance(val, dict):
                                mod[key] = str(val.get('description', ''))
                            else:
                                mod[key] = val
                except Exception as e:
                    print(f"Error fetching data for {mod.get('name')}: {e}")

        # Finalize progress bar and UI
        if hasattr(self, 'progress_bar'):
            self.progress_bar.setValue(100)
            self.progress_bar.setFormat("API data fetch complete")
            QTimer.singleShot(1000, lambda: self.progress_bar.setVisible(False))
        progress.setValue(total_mods)
        # Refresh the table
        self.filter_mods(self.search_input.text() if hasattr(self, 'search_input') else '')
        QMessageBox.information(self, "API Data", f"Successfully fetched API data for {total_mods} mods.")
    def save_changes(self):
        if self.editable:
            self.modpack_data['name'] = self.name_edit.text().strip()
            self.modpack_data['description'] = self.desc_edit.toPlainText().strip()
            mods = []
            for row in range(self.table.rowCount()):
                mod = {
                    'name': self.table.item(row, 0).text() if self.table.item(row, 0) else '',
                    'version': self.table.item(row, 1).text() if self.table.item(row, 1) else '',
                    'authors': [a.strip() for a in self.table.item(row, 2).text().split(',')] if self.table.item(row, 2) else [],
                    'filename': self.table.item(row, 3).text() if self.table.item(row, 3) else '',
                    'url': self.table.item(row, 4).text() if self.table.item(row, 4) else '',
                    'description': self.table.item(row, 5).text() if self.table.item(row, 5) else ''
                }
                mods.append(mod)
            self.modpack_data['mods'] = mods
            fname, ok = QInputDialog.getText(self, 'Save Modpack', 'Enter filename (no extension):', text=self.modpack_data['name'])
            if not ok or not fname.strip():
                QMessageBox.warning(self, 'Not Saved', 'Modpack was not saved.')
                return
            save_modpack(self.modpack_data, fname.strip() + '.json')
            QMessageBox.information(self, 'Saved', f'Modpack saved as {fname.strip()}.json')

    def filter_mods(self, text):
        """Filter mods by search text"""
        # Store the original mods
        self.original_mods = getattr(self, 'original_mods', self.all_mods.copy())
        
        if not text:
            # If search is empty, restore original mods
            self.all_mods = self.original_mods.copy()
            self.table.setRowCount(len(self.all_mods))
            # Clear all items to force reload
            self.table.clearContents()
            # Load visible rows
            self._load_visible_rows()
            return
        
        # Filter mods by search text
        filtered_mods = []
        for mod in self.original_mods:
            # Check if search text is in any field
            name = str(mod.get('name', '')).lower() if mod.get('name') else ''
            version = str(mod.get('version', '')).lower() if mod.get('version') else ''
            
            # Handle authors safely
            authors = mod.get('authors', [])
            if not isinstance(authors, list):
                authors = [str(authors)] if authors else []
            authors_str = ', '.join(str(a).lower() for a in authors)
            
            filename = str(mod.get('filename', '')).lower() if mod.get('filename') else ''
            url = str(mod.get('url', '')).lower() if mod.get('url') else ''
            description = str(mod.get('description', '')).lower() if mod.get('description') else ''
            
            search_text = text.lower()
            if (search_text in name or search_text in version or search_text in authors_str or 
                search_text in filename or search_text in url or search_text in description):
                filtered_mods.append(mod)
        
        # Update all_mods with filtered list
        self.all_mods = filtered_mods
        
        # Update table with filtered mods
        self.table.setRowCount(len(filtered_mods))
        # Clear all items to force reload
        self.table.clearContents()
        # Load visible rows
        self._load_visible_rows()
    
    def clear_search(self):
        """Clear the search input and show all mods"""
        self.search_input.clear()
        self.filter_mods('')
        
    def view_changelog(self):
        idx = self.version_list.currentRow()
        if idx < 0 or idx >= len(self.versions):
            QMessageBox.warning(self, 'Select', 'Select a version to view its changelog.')
            return
        v = self.versions[idx]
        # Pass editable=True if we're in edit mode
        dlg = ChangelogHistoryDialog(v, parent=self, editable=self.editable)
        if dlg.exec_() and self.editable:
            # If dialog was accepted and we're in edit mode, refresh the version list
            # in case the version name was changed
            self.version_list.clear()
            for v in self.versions:
                label = f"v{v['version']} ({v['timestamp']})"
                self.version_list.addItem(label)
            self.version_list.setCurrentRow(idx)
        
    def view_version_mods(self, index=None):
        """View the mods from a specific version"""
        # If index is None, get it from the sender
        if index is None and hasattr(self, 'version_list'):
            index = self.version_list.currentRow()
        
        # Validate index
        if not hasattr(self, 'versions') or not self.versions or index < 0 or index >= len(self.versions):
            return
        
        # Get the version entry
        version_entry = self.versions[index]
        print(f"Viewing version at index {index}")
        
        # Get mods from the version
        mods = version_entry.get('mods', [])
        
        # Show the return button
        if hasattr(self, 'return_btn'):
            self.return_btn.setVisible(True)
        
        # Update window title to show we're viewing a specific version
        self.setWindowTitle(f"Modpack: {self.modpack_data.get('name', '')} - v{version_entry.get('version', '')}")
        
        # Store mods for loading
        self.all_mods = mods.copy()
        
        # Prepare the table
        self.table.setRowCount(len(mods))
        
        # Load mods immediately
        self.populate_table_deferred()
        if hasattr(self, 'return_btn'):
            self.return_btn.setVisible(True)
                
        # Clear any existing search
        if hasattr(self, 'search_input'):
            self.search_input.clear()
            
    def show_current_mods(self):
        """Return to showing the current version's mods"""
        # Hide the return button
        if hasattr(self, 'return_btn'):
            self.return_btn.setVisible(False)
        
        # Print debug info
        print("Showing current mods")
        print(f"Modpack name: {self.modpack_data.get('name', '')}")
        
        # Find the latest version
        if hasattr(self, 'versions') and self.versions:
            print(f"Number of versions: {len(self.versions)}")
            for i, v in enumerate(self.versions):
                print(f"  Version {i}: v{v.get('version', '')} ({v.get('timestamp', '')})")
                
            # Find the latest version by version number
            latest_version = max(self.versions, key=lambda v: v.get('version', 0))
            latest_index = self.versions.index(latest_version)
            print(f"Latest version is v{latest_version.get('version', '')} at index {latest_index}")
            
            # Get mods from the latest version
            latest_mods = latest_version.get('mods', [])
            print(f"Number of mods in latest version: {len(latest_mods)}")
            
            # Update window title to show we're viewing the latest version
            self.setWindowTitle(f"Modpack: {self.modpack_data.get('name', '')} - v{latest_version.get('version', '')} (Latest)")
            
            # Store mods and prepare table
            self.all_mods = latest_mods.copy()
            self.table.setRowCount(len(latest_mods))
            
            # Update the version list selection
            if hasattr(self, 'version_list') and self.version_list.count() > 0:
                # Temporarily disconnect signals to avoid triggering view_version_mods
                if hasattr(self, '_version_list_connected') and self._version_list_connected:
                    try:
                        self.version_list.currentRowChanged.disconnect()
                        self._version_list_connected = False
                        print("Disconnected version list signals")
                    except Exception as e:
                        print(f"Error disconnecting signals: {e}")
                
                # Select the latest version without triggering signals
                self.version_list.setCurrentRow(latest_index)
                print(f"Selected version at index {latest_index}")
                
                # Reconnect signals after a short delay
                QTimer.singleShot(100, self._reconnect_version_list_signals)
        else:
            # No versions available, show current mods
            mods = self.modpack_data.get('mods', [])
            self.all_mods = mods.copy()
            print(f"No versions found. Showing current mods: {len(self.all_mods)}")
            
            # Reset window title
            self.setWindowTitle(f"Modpack: {self.modpack_data.get('name', '')}")
            
            # Prepare table
            self.table.setRowCount(len(mods))
        
        # Clear any existing search
        if hasattr(self, 'search_input'):
            self.search_input.clear()
            
        # Load mods immediately
        self.populate_table_deferred()
    
    def _reconnect_version_list_signals(self):
        """Reconnect version list signals after they were temporarily disconnected"""
        if hasattr(self, 'version_list'):
            try:
                self.version_list.currentRowChanged.connect(self.view_version_mods)
                self._version_list_connected = True
                print("Reconnected version list signals")
            except Exception as e:
                print(f"Error reconnecting signals: {e}")
            
    def add_new_version(self):
        from modpack_utils import get_next_version_number, compare_modlists, generate_changelog, save_modpack
        # Prompt for new modlist
        fname, _ = QFileDialog.getOpenFileName(self, 'Select New Modlist', '', 'JSON Files (*.json)')
        if not fname:
            return
        try:
            with open(fname, 'r', encoding='utf-8') as f:
                new_mods = json.load(f)
        except Exception as e:
            QMessageBox.critical(self, 'Error', f'Failed to load modlist: {e}')
            return
            
        # Compare with last version or current mods
        if hasattr(self, 'versions') and self.versions:
            old_mods = self.versions[-1]['mods']
        else:
            old_mods = self.modpack_data.get('mods', [])
            
        # Check if there are actual changes
        added, removed, updated = compare_modlists(old_mods, new_mods)
        if not added and not removed and not updated:
            result = QMessageBox.question(self, 'No Changes', 'No changes detected between modlists. Do you still want to create a new version?', 
                                        QMessageBox.Yes | QMessageBox.No)
            if result != QMessageBox.Yes:
                return

    def create_backup(self):
        """Create a backup of the current modpack"""
        import os
        import shutil
        import datetime
        
        # Create backups directory if it doesn't exist
        backups_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')
        if not os.path.exists(backups_dir):
            os.makedirs(backups_dir)
        
        # Generate backup filename with timestamp
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        modpack_name = self.modpack_data.get('name', 'modpack').replace(' ', '_')
        backup_filename = f"{modpack_name}_backup_{timestamp}.json"
        backup_path = os.path.join(backups_dir, backup_filename)
        
        # Save the current modpack data to the backup file
        from modpack_utils import save_modpack
        try:
            save_modpack(self.modpack_data, backup_path)
            QMessageBox.information(self, 'Backup Created', 
                                   f'Backup created successfully:\n{backup_path}')
        except Exception as e:
            QMessageBox.critical(self, 'Backup Failed', f'Failed to create backup: {e}')
    
    def restore_backup(self):
        """Restore a modpack from a backup file"""
        import os
        
        # Get the backups directory
        backups_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')
        if not os.path.exists(backups_dir):
            QMessageBox.warning(self, 'No Backups', 'No backups found. Create a backup first.')
            return
        
        # List all backup files
        backup_files = [f for f in os.listdir(backups_dir) if f.endswith('.json')]
        if not backup_files:
            QMessageBox.warning(self, 'No Backups', 'No backup files found in the backups directory.')
            return
        
        # Sort backups by modification time (newest first)
        backup_files.sort(key=lambda f: os.path.getmtime(os.path.join(backups_dir, f)), reverse=True)
        
        # Show dialog to select a backup
        backup_file, ok = QInputDialog.getItem(self, 'Select Backup', 
                                            'Choose a backup to restore:', 
                                            backup_files, 0, False)
        if not ok or not backup_file:
            return
        
        # Confirm restoration
        confirm = QMessageBox.question(self, 'Confirm Restore', 
                                    f'Are you sure you want to restore from backup:\n{backup_file}?\n\n' +
                                    'This will replace your current modpack data!',
                                    QMessageBox.Yes | QMessageBox.No)
        if confirm != QMessageBox.Yes:
            return
        
        # Load the backup file
        backup_path = os.path.join(backups_dir, backup_file)
        try:
            with open(backup_path, 'r', encoding='utf-8') as f:
                import json
                backup_data = json.load(f)
            
            # Replace the current modpack data with the backup data
            self.modpack_data = backup_data
            
            # Update the UI to reflect the restored data
            self.name_edit.setText(backup_data.get('name', ''))
            self.desc_edit.setPlainText(backup_data.get('description', ''))
            
            # Update the mods table
            self.all_mods = backup_data.get('mods', [])
            self.table.setRowCount(len(self.all_mods))
            for row, mod in enumerate(self.all_mods):
                self.table.setItem(row, 0, QTableWidgetItem(mod.get('name', '')))
                self.table.setItem(row, 1, QTableWidgetItem(mod.get('version', '')))
                self.table.setItem(row, 2, QTableWidgetItem(', '.join(mod.get('authors', []))))
                self.table.setItem(row, 3, QTableWidgetItem(mod.get('filename', '')))
                self.table.setItem(row, 4, QTableWidgetItem(mod.get('url', '')))
                self.table.setItem(row, 5, QTableWidgetItem(mod.get('description', '')))
            
            # Update the versions list if it exists
            if hasattr(self, 'version_list') and 'versions' in backup_data:
                self.versions = backup_data.get('versions', [])
                self.version_list.clear()
                for v in self.versions:
                    label = f"v{v['version']} ({v['timestamp']})"
                    self.version_list.addItem(label)
            
            QMessageBox.information(self, 'Restore Complete', 
                                   f'Successfully restored modpack from backup:\n{backup_file}')
        except Exception as e:
            QMessageBox.critical(self, 'Restore Failed', f'Failed to restore from backup: {e}')
    
    def add_new_version(self):
        from modpack_utils import get_next_version_number, compare_modlists, generate_changelog, save_modpack
        # Prompt for new modlist
        fname, _ = QFileDialog.getOpenFileName(self, 'Select New Modlist', '', 'JSON Files (*.json)')
        if not fname:
            return
        try:
            with open(fname, 'r', encoding='utf-8') as f:
                new_mods = json.load(f)
        except Exception as e:
            QMessageBox.critical(self, 'Error', f'Failed to load modlist: {e}')
            return
            
        # Compare with last version or current mods
        if hasattr(self, 'versions') and self.versions:
            old_mods = self.versions[-1]['mods']
        else:
            old_mods = self.modpack_data.get('mods', [])
            
        # Check if there are actual changes
        added, removed, updated = compare_modlists(old_mods, new_mods)
        if not added and not removed and not updated:
            result = QMessageBox.question(self, 'No Changes', 'No changes detected between modlists. Do you still want to create a new version?', 
                                        QMessageBox.Yes | QMessageBox.No)
            if result == QMessageBox.No:
                return
                
        changelog = generate_changelog(old_mods, new_mods, added, removed, updated)
        
        # Prepare changes for modern dialog
        changes = []
        for m in added:
            changes.append(('added', m))
        for m in removed:
            changes.append(('removed', m))
        for u in updated:
            changes.append(('updated', u))
            
        # Show changelog comment dialog
        dlg = ChangelogCommentDialog(changes, parent=self)
        if not dlg.exec_():
            return
        comment = dlg.general_comment
        mod_comments = dlg.comments
        
        # Assign version number and timestamp
        from datetime import datetime
        version_num = get_next_version_number(self.modpack_data)
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        # Fetch and update details for all mods in the new version
        for mod in new_mods:
            if mod.get('url'):
                try:
                    updated_mod = fetch_mod_details(mod, self.api_key)
                    for key in ('description', 'iconUrl', 'categories', 'tags'):
                        if key in updated_mod:
                            val = updated_mod[key]
                            if key == 'description' and isinstance(val, dict):
                                mod[key] = str(val.get('description', ''))
                            else:
                                mod[key] = val
                except Exception as e:
                    print(f"Error fetching data for {mod.get('name')}: {e}")
        version_entry = {
            'version': version_num,
            'timestamp': timestamp,
            'mods': new_mods,
            'changelog': changelog,
            'changelog_comment': comment,
            'mod_comments': mod_comments,
            # Store the mod lists for easier access when editing
            'added_mods': added,
            'removed_mods': removed,
            'updated_mods': updated
        }
        
        # Update modpack data
        if 'versions' not in self.modpack_data:
            self.modpack_data['versions'] = []
        self.modpack_data['versions'].append(version_entry)
        self.modpack_data['mods'] = new_mods
        
        # Save immediately to ensure changes are persisted
        try:
            modpack_name = self.modpack_data.get('name', 'modpack')
            filename = f"{modpack_name}.json"
            save_modpack(self.modpack_data, filename)
            QMessageBox.information(self, 'Version Added', f'New version v{version_num} added and saved successfully.')
            
            # Update UI to show the new version
            if hasattr(self, 'version_list'):
                self.version_list.addItem(f"v{version_num} ({timestamp})")
                self.version_list.setCurrentRow(self.version_list.count() - 1)
            
            # Don't close the dialog, so user can see the updated version list
        except Exception as e:
            QMessageBox.critical(self, 'Error', f'Failed to save modpack: {e}')
            return
            
    def _enforce_public_toggle(self, state):
        """Enforce the one-way toggle for public flag - can only go from private to public, not back"""
        # If the modpack was already public, force the checkbox to stay checked
        if self.modpack_data.get('public', False) and not self.public_checkbox.isChecked():
            # Block signals to prevent recursion
            self.public_checkbox.blockSignals(True)
            self.public_checkbox.setChecked(True)
            self.public_checkbox.blockSignals(False)
            QMessageBox.warning(self, 'Public Status', 'Once a modpack is made public, it cannot be made private again.')
    
    def save_changes(self):
        """Save changes to the modpack"""
        if not self.editable:
            return
            
        # Update modpack name and description
        if hasattr(self, 'name_edit') and hasattr(self, 'desc_edit'):
            self.modpack_data['name'] = self.name_edit.text().strip()
            self.modpack_data['description'] = self.desc_edit.toPlainText().strip()
            
        # Update public flag if checkbox exists
        if hasattr(self, 'public_checkbox'):
            # Only allow changing from false to true, never from true to false
            if self.public_checkbox.isChecked():
                self.modpack_data['public'] = True
                # Once set to public, disable the checkbox to prevent toggling
                self.public_checkbox.setEnabled(False)
            
        # Save to file
        try:
            from modpack_utils import save_modpack
            modpack_name = self.modpack_data.get('name', 'modpack')
            filename = f"{modpack_name}.json"
            save_modpack(self.modpack_data, filename)
            QMessageBox.information(self, 'Saved', f'Modpack saved as {filename}')
        except Exception as e:
            QMessageBox.critical(self, 'Error', f'Failed to save modpack: {e}')
            
    def generate_github_pages(self):
        """Generate GitHub Pages for all public modpacks"""
        try:
            # Save any pending changes first
            self.save_changes()
            
            # Generate GitHub Pages
            count = generate_github_pages()
            
            # Show success message with link to open the pages
            msg_box = QMessageBox(self)
            msg_box.setWindowTitle('GitHub Pages Generated')
            msg_box.setText(f'Successfully generated GitHub Pages for {count} public modpacks.')
            msg_box.setInformativeText('The pages have been created in the /docs directory. Would you like to open the index page in your browser?')
            msg_box.setStandardButtons(QMessageBox.Yes | QMessageBox.No)
            msg_box.setDefaultButton(QMessageBox.Yes)
            
            if msg_box.exec_() == QMessageBox.Yes:
                # Open the index page in the default browser
                index_path = os.path.abspath(os.path.join('docs', 'index.html'))
                webbrowser.open(f'file:///{index_path}')
                
        except Exception as e:
            QMessageBox.critical(self, 'Error', f'Failed to generate GitHub Pages: {e}')
            import traceback
            traceback.print_exc()

class ChangelogHistoryDialog(QDialog):
    def __init__(self, version_entry, parent=None, editable=False):
        super().__init__(parent)
        self.version_entry = version_entry
        self.editable = editable
        self.parent_dialog = parent
        self.setWindowTitle(f"Changelog v{version_entry.get('version','')}")
        self.resize(800, 600)  # Larger dialog for better visibility
        self.mod_comment_edits = {}  # Store references to comment edits
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()
        layout.addWidget(QLabel(f"<b>Version:</b> {self.version_entry.get('version','')}")); 
        layout.addWidget(QLabel(f"<b>Timestamp:</b> {self.version_entry.get('timestamp','')}")); 
        
        # General changelog comment
        layout.addWidget(QLabel('<b>General Changelog Comment:</b>'))
        self.comment_edit = QTextEdit()
        self.comment_edit.setPlainText(self.version_entry.get('changelog_comment', ''))
        self.comment_edit.setReadOnly(not self.editable)
        layout.addWidget(self.comment_edit)
        
        # Auto-generated changelog (always read-only)
        layout.addWidget(QLabel('<b>Auto-generated Changelog:</b>'))
        changelog_edit = QTextEdit()
        changelog_edit.setPlainText(self.version_entry.get('changelog',''))
        changelog_edit.setReadOnly(True)  # Always read-only as it's auto-generated
        layout.addWidget(changelog_edit)
        
        # Get the mod changes directly from the version entry if available
        added_mods = self.version_entry.get('added_mods', [])
        removed_mods = self.version_entry.get('removed_mods', [])
        updated_mods = self.version_entry.get('updated_mods', [])
        
        # For older versions that don't have the mod lists stored, parse them from the changelog
        if not added_mods and not removed_mods and not updated_mods:
            # Extract mod changes from the changelog
            changelog_text = self.version_entry.get('changelog', '')
            
            # Parse the changelog to identify added/removed/updated mods
            current_section = None
            for line in changelog_text.split('\n'):
                line = line.strip()
                if line.startswith('Added '):
                    current_section = 'added'
                    continue
                elif line.startswith('Removed '):
                    current_section = 'removed'
                    continue
                elif line.startswith('Updated '):
                    current_section = 'updated'
                    continue
                
                if not line.startswith('  ') or not current_section:
                    continue
                    
                # Extract mod info from the line
                if current_section == 'added' and line.startswith('  + '):
                    mod_info = line[4:].strip()
                    # Create a mock mod object with the name
                    mod_name = mod_info.split(' (')[0] if ' (' in mod_info else mod_info
                    added_mods.append({
                        'name': mod_name,
                        'version': mod_info.split('(')[1].split(')')[0] if '(' in mod_info else '',
                        'filename': mod_info.split('[')[1].split(']')[0] if '[' in mod_info else ''
                    })
                elif current_section == 'removed' and line.startswith('  - '):
                    mod_info = line[4:].strip()
                    # Create a mock mod object with the name
                    mod_name = mod_info.split(' (')[0] if ' (' in mod_info else mod_info
                    removed_mods.append({
                        'name': mod_name,
                        'version': mod_info.split('(')[1].split(')')[0] if '(' in mod_info else '',
                        'filename': mod_info.split('[')[1].split(']')[0] if '[' in mod_info else ''
                    })
                elif current_section == 'updated' and line.startswith('  * '):
                    mod_info = line[4:].strip()
                    # Remove trailing colon if present
                    if mod_info.endswith(':'):
                        mod_info = mod_info[:-1].strip()
                        
                    # Create a mock mod object with the name
                    mod_name = mod_info.split(' (')[0] if ' (' in mod_info else mod_info
                    
                    # Try to extract version information
                    old_version = ''
                    new_version = ''
                    if ' -> ' in mod_info and '(' in mod_info and ')' in mod_info:
                        version_part = mod_info.split('(')[1].split(')')[0]
                        if ' -> ' in version_part:
                            old_version, new_version = version_part.split(' -> ')
                    elif '(' in mod_info and ')' in mod_info:
                        new_version = mod_info.split('(')[1].split(')')[0]
                        
                    updated_mods.append({
                        'name': mod_name,
                        'old_version': old_version,
                        'new_version': new_version,
                        'filename': mod_info.split('[')[1].split(']')[0] if '[' in mod_info else ''
                    })
        
        # Per-mod comments
        self.mod_comment_edits = {}  # Store references to comment edits
        mod_comments = self.version_entry.get('mod_comments', {})
        
        # Create container widget for all mod changes
        self.comments_widget = QWidget()
        self.comments_layout = QVBoxLayout(self.comments_widget)
        self.comments_layout.setSpacing(10)
        
        # Add section headers with different styling
        if added_mods:
            added_header = QLabel('<b style="color: green;">Added Mods:</b>')
            added_header.setStyleSheet("font-size: 14px;")
            self.comments_layout.addWidget(added_header)
            
            for mod in added_mods:
                mod_name = mod.get('name', '')
                mod_version = mod.get('version', '')
                mod_filename = mod.get('filename', '')
                mod_url = mod.get('url', '')
                
                display_text = f"{mod_name}"
                if mod_version:
                    display_text += f" ({mod_version})"
                if mod_filename and mod_filename != mod_name:
                    display_text += f" [{mod_filename}]"
                
                key = f"added:{mod_name}"
                
                row = QWidget()
                row_layout = QVBoxLayout(row)
                row_layout.setContentsMargins(5, 5, 5, 5)
                
                # Create header with mod info and URL button if available
                header_layout = QHBoxLayout()
                header_layout.addWidget(QLabel(f"<b>{display_text}</b>"))
                
                if mod_url:
                    url_btn = QPushButton("Open URL")
                    url_btn.setMaximumWidth(100)
                    url_btn.clicked.connect(lambda checked, url=mod_url: QDesktopServices.openUrl(QUrl(url)))
                    header_layout.addWidget(url_btn)
                
                header_layout.addStretch()
                row_layout.addLayout(header_layout)
                
                # Add comment edit
                edit = QTextEdit()
                edit.setPlainText(mod_comments.get(key, ''))
                edit.setReadOnly(not self.editable)
                edit.setMinimumHeight(60)
                row_layout.addWidget(edit)
                
                self.mod_comment_edits[key] = edit
                self.comments_layout.addWidget(row)
        
        if removed_mods:
            removed_header = QLabel('<b style="color: red;">Removed Mods:</b>')
            removed_header.setStyleSheet("font-size: 14px;")
            self.comments_layout.addWidget(removed_header)
            
            for mod in removed_mods:
                mod_name = mod.get('name', '')
                mod_version = mod.get('version', '')
                mod_filename = mod.get('filename', '')
                mod_url = mod.get('url', '')
                
                display_text = f"{mod_name}"
                if mod_version:
                    display_text += f" ({mod_version})"
                if mod_filename and mod_filename != mod_name:
                    display_text += f" [{mod_filename}]"
                
                key = f"removed:{mod_name}"
                
                row = QWidget()
                row_layout = QVBoxLayout(row)
                row_layout.setContentsMargins(5, 5, 5, 5)
                
                # Create header with mod info
                header_layout = QHBoxLayout()
                header_layout.addWidget(QLabel(f"<b>{display_text}</b>"))
                
                if mod_url:
                    url_btn = QPushButton("Open URL")
                    url_btn.setMaximumWidth(100)
                    url_btn.clicked.connect(lambda checked, url=mod_url: QDesktopServices.openUrl(QUrl(url)))
                    header_layout.addWidget(url_btn)
                
                header_layout.addStretch()
                row_layout.addLayout(header_layout)
                
                # Add comment edit
                edit = QTextEdit()
                edit.setPlainText(mod_comments.get(key, ''))
                edit.setReadOnly(not self.editable)
                edit.setMinimumHeight(60)
                row_layout.addWidget(edit)
                
                self.mod_comment_edits[key] = edit
                self.comments_layout.addWidget(row)
        
        if updated_mods:
            updated_header = QLabel('<b style="color: blue;">Updated Mods:</b>')
            updated_header.setStyleSheet("font-size: 14px;")
            self.comments_layout.addWidget(updated_header)
            
            for mod in updated_mods:
                mod_name = mod.get('name', '')
                mod_old_version = mod.get('old_version', '')
                mod_new_version = mod.get('new_version', '')
                mod_filename = mod.get('filename', '')
                mod_url = mod.get('url', '')
                
                display_text = f"{mod_name}"
                if mod_old_version and mod_new_version:
                    display_text += f" ({mod_old_version} → {mod_new_version})"
                elif mod_new_version:
                    display_text += f" ({mod_new_version})"
                if mod_filename and mod_filename != mod_name:
                    display_text += f" [{mod_filename}]"
                
                key = f"updated:{mod_name}"
                
                row = QWidget()
                row_layout = QVBoxLayout(row)
                row_layout.setContentsMargins(5, 5, 5, 5)
                
                # Create header with mod info
                header_layout = QHBoxLayout()
                header_layout.addWidget(QLabel(f"<b>{display_text}</b>"))
                
                if mod_url:
                    url_btn = QPushButton("Open URL")
                    url_btn.setMaximumWidth(100)
                    url_btn.clicked.connect(lambda checked, url=mod_url: QDesktopServices.openUrl(QUrl(url)))
                    header_layout.addWidget(url_btn)
                
                header_layout.addStretch()
                row_layout.addLayout(header_layout)
                
                # Add comment edit
                edit = QTextEdit()
                edit.setPlainText(mod_comments.get(key, ''))
                edit.setReadOnly(not self.editable)
                edit.setMinimumHeight(60)
                row_layout.addWidget(edit)
                
                self.mod_comment_edits[key] = edit
                self.comments_layout.addWidget(row)
        
        # Handle any other comments that might not be in the parsed changelog
        other_comments = [k for k in mod_comments.keys() 
                         if not any(k.startswith(prefix) for prefix in ['added:', 'removed:', 'updated:'])]
        
        if other_comments:
            other_header = QLabel('<b>Other Comments:</b>')
            other_header.setStyleSheet("font-size: 14px;")
            self.comments_layout.addWidget(other_header)
            
            for key in other_comments:
                row = QWidget()
                row_layout = QVBoxLayout(row)
                row_layout.setContentsMargins(5, 5, 5, 5)
                
                header_layout = QHBoxLayout()
                header_layout.addWidget(QLabel(f"<b>{key}</b>"))
                
                if editable:
                    delete_btn = QPushButton("Delete")
                    delete_btn.setMaximumWidth(80)
                    delete_btn.clicked.connect(lambda checked, k=key: self.delete_comment(k))
                    header_layout.addWidget(delete_btn)
                
                header_layout.addStretch()
                row_layout.addLayout(header_layout)
                
                edit = QTextEdit()
                edit.setPlainText(mod_comments.get(key, ''))
                edit.setReadOnly(not self.editable)
                edit.setMinimumHeight(60)
                row_layout.addWidget(edit)
                
                self.mod_comment_edits[key] = edit
                self.comments_layout.addWidget(row)
        
        # No add new comment section - only allow editing existing comments
        
        # Create scroll area and add the comments widget to it
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setWidget(self.comments_widget)
        scroll_area.setMinimumHeight(300)  # Taller scroll area
        layout.addWidget(scroll_area)
        
        # Button row
        btn_layout = QHBoxLayout()
        if self.editable:
            save_btn = QPushButton('Save Changes')
            save_btn.clicked.connect(self.save_changes)
            btn_layout.addWidget(save_btn)
        
        close_btn = QPushButton('Close')
        close_btn.clicked.connect(self.reject)
        btn_layout.addWidget(close_btn)
        layout.addLayout(btn_layout)
        
        self.setLayout(layout)
    
    def delete_comment(self, key):
        """Delete a mod comment"""
        reply = QMessageBox.question(self, 'Confirm', f'Delete comment for {key}?', 
                                    QMessageBox.Yes | QMessageBox.No)
        if reply == QMessageBox.Yes:
            # Remove from the UI
            edit = self.mod_comment_edits.pop(key, None)
            if edit:
                # Find and remove the parent widget (row)
                row = edit.parent()
                if row:
                    self.comments_layout.removeWidget(row)
                    row.deleteLater()
    
    def save_changes(self):
        # Update the version entry with the edited comment
        self.version_entry['changelog_comment'] = self.comment_edit.toPlainText()
        
        # Also update mod comments if they were edited
        if hasattr(self, 'mod_comment_edits'):
            for mod_name, edit in self.mod_comment_edits.items():
                if 'mod_comments' not in self.version_entry:
                    self.version_entry['mod_comments'] = {}
                self.version_entry['mod_comments'][mod_name] = edit.toPlainText()
        
        # Save the modpack data if we have a parent dialog
        if hasattr(self, 'parent_dialog') and self.parent_dialog:
            try:
                from modpack_utils import save_modpack
                modpack_name = self.parent_dialog.modpack_data.get('name', 'modpack')
                filename = f"{modpack_name}.json"
                save_modpack(self.parent_dialog.modpack_data, filename)
                QMessageBox.information(self, 'Saved', f'Changes to version v{self.version_entry.get("version", "")} saved.')
            except Exception as e:
                QMessageBox.critical(self, 'Error', f'Failed to save changes: {e}')
        else:
            QMessageBox.warning(self, 'Error', 'Could not save changes: parent modpack data not found.')
        
        # Accept the dialog to signal changes were made
        self.accept()

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Minecraft Modpack Manager')
        self.resize(400, 200)
        self.config = load_config()
        self.curseforge_api_key = self.config.get('curseforge_api_key', '')
        self.init_ui()
        self.check_api_key()

    def init_ui(self):
        # Menu bar for API key management
        menubar = QMenuBar(self)
        api_menu = menubar.addMenu('API')
        set_key_action = QAction('Set CurseForge API Key', self)
        set_key_action.triggered.connect(self.prompt_api_key)
        api_menu.addAction(set_key_action)
        self.setMenuBar(menubar)

        central = QWidget()
        layout = QVBoxLayout()
        title = QLabel('Minecraft Modpack Manager')
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet('font-size: 22px; font-weight: bold; margin: 10px;')
        layout.addWidget(title)
        create_btn = QPushButton('Create New Modpack')
        create_btn.clicked.connect(self.create_modpack)
        layout.addWidget(create_btn)
        manage_btn = QPushButton('Manage Modpacks')
        manage_btn.clicked.connect(self.manage_modpacks)
        layout.addWidget(manage_btn)
        
        # Add GitHub Pages generation button
        github_pages_btn = QPushButton('Generate GitHub Pages')
        github_pages_btn.clicked.connect(self.generate_github_pages)
        layout.addWidget(github_pages_btn)
        
        exit_btn = QPushButton('Exit')
        exit_btn.clicked.connect(self.close)
        layout.addWidget(exit_btn)
        central.setLayout(layout)
        self.setCentralWidget(central)

    def check_api_key(self):
        if not self.curseforge_api_key:
            self.prompt_api_key()

    def prompt_api_key(self):
        dialog = ApiKeyDialog(self.curseforge_api_key, self)
        if dialog.exec_() == QDialog.Accepted:
            self.curseforge_api_key = dialog.api_key
            self.config['curseforge_api_key'] = self.curseforge_api_key
            save_config(self.config)
        elif not self.curseforge_api_key:
            QMessageBox.critical(self, 'Error', 'A CurseForge API key is required for full functionality.')

    def manage_modpacks(self):
        dlg = QDialog(self)
        dlg.setWindowTitle('Manage Modpacks')
        dlg.resize(500, 400)
        layout = QVBoxLayout()
        
        # Add a label with clear styling
        label = QLabel('Saved Modpacks:')
        label.setStyleSheet('font-size: 14px; font-weight: bold; margin-bottom: 5px;')
        layout.addWidget(label)
        
        # Create and configure the modpack list
        modpack_list = QListWidget()
        modpack_list.setAlternatingRowColors(True)  # Improve visibility with alternating colors
        modpack_list.setStyleSheet('font-size: 12px;')
        
        # Get the list of modpacks and add them to the list widget
        try:
            modpacks = list_modpacks()
            if modpacks:
                modpack_list.addItems(modpacks)
                modpack_list.setCurrentRow(0)  # Select the first item by default
            else:
                # Add a placeholder item if no modpacks are found
                modpack_list.addItem("No modpacks found. Create a new modpack first.")
                modpack_list.item(0).setFlags(Qt.NoItemFlags)  # Make it non-selectable
        except Exception as e:
            print(f"Error loading modpacks: {e}")
            modpack_list.addItem(f"Error loading modpacks: {str(e)}")
            modpack_list.item(0).setFlags(Qt.NoItemFlags)  # Make it non-selectable
        
        # Set minimum size for the list to ensure it's visible
        modpack_list.setMinimumHeight(200)
        layout.addWidget(modpack_list)
        
        # Create button layout with improved styling
        btn_layout = QHBoxLayout()
        
        # Create and style buttons
        open_btn = QPushButton('Edit')
        open_btn.setMinimumWidth(80)
        view_btn = QPushButton('View')
        view_btn.setMinimumWidth(80)
        delete_btn = QPushButton('Delete')
        delete_btn.setMinimumWidth(80)
        close_btn = QPushButton('Close')
        close_btn.setMinimumWidth(80)
        
        # Add buttons to layout
        btn_layout.addWidget(open_btn)
        btn_layout.addWidget(view_btn)
        btn_layout.addWidget(delete_btn)
        btn_layout.addWidget(close_btn)
        layout.addLayout(btn_layout)
        
        # Set the dialog layout
        dlg.setLayout(layout)
        def open_modpack():
            selected = modpack_list.currentItem()
            if not selected:
                QMessageBox.warning(dlg, 'Select', 'Select a modpack to open/edit.')
                return
            try:
                fname = selected.text()
                modpack_data = load_modpack(fname)
                
                # Make sure we have a valid modpack_data structure
                if not isinstance(modpack_data, dict):
                    QMessageBox.warning(dlg, 'Error', f'Invalid modpack data format in {fname}')
                    return
                    
                # Ensure required fields exist
                if 'name' not in modpack_data:
                    modpack_data['name'] = os.path.splitext(fname)[0]
                if 'description' not in modpack_data:
                    modpack_data['description'] = ''
                if 'mods' not in modpack_data:
                    modpack_data['mods'] = []
                    
                # Create and show the editor dialog
                editor = ModsTableDialog(modpack_data, parent=self, editable=True, api_key=self.curseforge_api_key)
                editor.exec_()
            except Exception as e:
                QMessageBox.critical(dlg, 'Error', f'Failed to open modpack: {str(e)}')
                import traceback
                traceback.print_exc()
        def view_modpack():
            selected = modpack_list.currentItem()
            if not selected:
                QMessageBox.warning(dlg, 'Select', 'Select a modpack to view.')
                return
            
            # Check if the selected item is a valid modpack file
            fname = selected.text()
            if fname.startswith("No modpacks found") or fname.startswith("Error loading"):
                QMessageBox.warning(dlg, 'Invalid Selection', 'Please select a valid modpack file.')
                return
                
            try:
                # Load the modpack data
                modpack_data = load_modpack(fname)
                
                # Check if the modpack data is valid
                if not modpack_data:
                    QMessageBox.warning(dlg, 'Error', f'Failed to load modpack {fname}. Check console for details.')
                    return
                    
                # Create and show the viewer dialog
                viewer = ModsTableDialog(modpack_data, parent=self, editable=False, api_key=self.curseforge_api_key)
                viewer.exec_()
            except Exception as e:
                QMessageBox.critical(dlg, 'Error', f'An error occurred while viewing the modpack: {str(e)}')
                import traceback
                traceback.print_exc()
        def delete_modpack():
            selected = modpack_list.currentItem()
            if not selected:
                QMessageBox.warning(dlg, 'Select', 'Select a modpack to delete.')
                return
            fname = selected.text()
            reply = QMessageBox.question(dlg, 'Confirm Delete', f'Delete {fname}?', QMessageBox.Yes | QMessageBox.No)
            if reply == QMessageBox.Yes:
                os.remove(os.path.join('modpacks', fname))
                modpack_list.takeItem(modpack_list.currentRow())
        open_btn.clicked.connect(open_modpack)
        view_btn.clicked.connect(view_modpack)
        delete_btn.clicked.connect(delete_modpack)
        close_btn.clicked.connect(dlg.accept)
        dlg.exec_()

    def generate_github_pages(self):
        """Generate GitHub Pages for all public modpacks"""
        try:
            # Generate GitHub Pages
            count = generate_github_pages()
            
            # Show success message with link to open the pages
            msg_box = QMessageBox(self)
            msg_box.setWindowTitle('GitHub Pages Generated')
            msg_box.setText(f'Successfully generated GitHub Pages for {count} public modpacks.')
            msg_box.setInformativeText('The pages have been created in the /docs directory. Would you like to open the index page in your browser?')
            msg_box.setStandardButtons(QMessageBox.Yes | QMessageBox.No)
            msg_box.setDefaultButton(QMessageBox.Yes)
            
            if msg_box.exec_() == QMessageBox.Yes:
                # Open the index page in the default browser
                index_path = os.path.abspath(os.path.join('docs', 'index.html'))
                webbrowser.open(f'file:///{index_path}')
                
        except Exception as e:
            QMessageBox.critical(self, 'Error', f'Failed to generate GitHub Pages: {e}')
            import traceback
            traceback.print_exc()
    
    def create_modpack(self):
        dialog = CreateModpackDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            try:
                mods = parse_modlist(dialog.modlist_path)
            except Exception as e:
                QMessageBox.critical(self, 'Error', f'Failed to parse modlist: {e}')
                return
            # Enrich mods with descriptions (and icons if available)
            for mod in mods:
                desc = fetch_mod_details(mod, self.curseforge_api_key)
                mod['description'] = desc
            # Prompt for save filename
            fname, ok = QInputDialog.getText(self, 'Save Modpack', 'Enter filename (no extension):', text=dialog.modpack_name)
            if not ok or not fname.strip():
                QMessageBox.warning(self, 'Not Saved', 'Modpack was not saved. You can save it later from Manage Modpacks.')
                return
            modpack_data = {
                'name': dialog.modpack_name,
                'description': dialog.modpack_desc,
                'mods': mods,
                'public': dialog.is_public  # Add the public flag
            }
            save_modpack(modpack_data, fname.strip() + '.json')
            QMessageBox.information(self, 'Saved', f'Modpack saved as {fname.strip()}.json')

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())
