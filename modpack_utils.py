import os
import json
from datetime import datetime

MODPACKS_DIR = 'modpacks'

def ensure_modpacks_dir():
    if not os.path.exists(MODPACKS_DIR):
        os.makedirs(MODPACKS_DIR)

def save_modpack(modpack_data, filename=None):
    ensure_modpacks_dir()
    if not filename:
        name = modpack_data.get('name', 'modpack')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{name}_{timestamp}.json"
    path = os.path.join(MODPACKS_DIR, filename)
    
    # Ensure the public flag exists
    if 'public' not in modpack_data:
        modpack_data['public'] = False
        
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(modpack_data, f, indent=2, ensure_ascii=False)
    return path

# Versioning helpers
def get_next_version_number(modpack):
    versions = modpack.get('versions', [])
    if not versions:
        return 1
    latest = versions[-1]
    try:
        return int(latest.get('version', len(versions))) + 1
    except Exception:
        return len(versions) + 1

def compare_modlists(old_mods, new_mods):
    # Index by (name, url, filename) for robustness
    def mod_key(mod):
        return (mod.get('name',''), mod.get('url',''), mod.get('filename',''))
    old_map = {mod_key(m): m for m in old_mods}
    new_map = {mod_key(m): m for m in new_mods}
    added = [m for k, m in new_map.items() if k not in old_map]
    removed = [m for k, m in old_map.items() if k not in new_map]
    updated = []
    for k, newm in new_map.items():
        if k in old_map:
            oldm = old_map[k]
            # Compare major fields for update
            diffs = {}
            for field in ('version','filename','url'):
                if newm.get(field) != oldm.get(field):
                    diffs[field] = (oldm.get(field), newm.get(field))
            if diffs:
                updated.append({'old': oldm, 'new': newm, 'diffs': diffs})
    return added, removed, updated

def generate_changelog(old_mods, new_mods, added, removed, updated):
    lines = []
    if added:
        lines.append(f"Added {len(added)} mod(s):")
        for m in added:
            lines.append(f"  + {m.get('name','')} ({m.get('version','')}) [{m.get('filename','')}] {m.get('url','')}")
    if removed:
        lines.append(f"Removed {len(removed)} mod(s):")
        for m in removed:
            lines.append(f"  - {m.get('name','')} ({m.get('version','')}) [{m.get('filename','')}] {m.get('url','')}")
    if updated:
        lines.append(f"Updated {len(updated)} mod(s):")
        for u in updated:
            name = u['new'].get('name','')
            lines.append(f"  * {name}:")
            for field, (oldv, newv) in u['diffs'].items():
                lines.append(f"      {field}: {oldv} -> {newv}")
    if not lines:
        lines.append("No changes detected.")
    return '\n'.join(lines)

def list_modpacks():
    """List all modpack files in the modpacks directory"""
    try:
        ensure_modpacks_dir()
        # Get a list of all JSON files in the modpacks directory
        modpack_files = [f for f in os.listdir(MODPACKS_DIR) if f.endswith('.json')]
        print(f"Found {len(modpack_files)} modpack files in {os.path.abspath(MODPACKS_DIR)}")
        for file in modpack_files:
            print(f"  - {file}")
        return modpack_files
    except Exception as e:
        print(f"Error listing modpacks: {e}")
        # Return an empty list instead of raising an exception
        return []

def load_modpack(filename):
    """Load a modpack from a file"""
    try:
        path = os.path.join(MODPACKS_DIR, filename)
        print(f"Loading modpack from {os.path.abspath(path)}")
        
        # Check if the file exists
        if not os.path.exists(path):
            print(f"Error: Modpack file not found at {path}")
            return {}
            
        # Load and parse the JSON file
        with open(path, 'r', encoding='utf-8') as f:
            modpack_data = json.load(f)
            
        # Validate the modpack data structure
        if not isinstance(modpack_data, dict):
            print(f"Error: Invalid modpack data format in {filename}")
            return {}
            
        # Ensure required fields exist
        if 'name' not in modpack_data:
            modpack_data['name'] = os.path.splitext(filename)[0]
        if 'description' not in modpack_data:
            modpack_data['description'] = ''
        if 'mods' not in modpack_data:
            modpack_data['mods'] = []
            
        print(f"Successfully loaded modpack '{modpack_data.get('name')}' with {len(modpack_data.get('mods', []))} mods")
        return modpack_data
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON in {filename}: {e}")
        return {}
    except Exception as e:
        print(f"Error loading modpack {filename}: {e}")
        return {}
