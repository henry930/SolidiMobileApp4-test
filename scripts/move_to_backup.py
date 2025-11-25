#!/usr/bin/env python3
"""
Move obviously unused files to backup directory
"""

import os
import json
import shutil
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = '/Users/henry/Solidi/SolidiMobileApp4'
BACKUP_DIR = os.path.join(PROJECT_ROOT, 'backup')

def create_backup_structure():
    """Create backup directory with timestamp"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_root = os.path.join(BACKUP_DIR, f'unused_files_{timestamp}')
    
    os.makedirs(backup_root, exist_ok=True)
    
    return backup_root

def move_file_to_backup(file_path, backup_root):
    """Move a file to backup maintaining directory structure"""
    # Get relative path from project root
    rel_path = os.path.relpath(file_path, PROJECT_ROOT)
    
    # Create destination path in backup
    dest_path = os.path.join(backup_root, rel_path)
    dest_dir = os.path.dirname(dest_path)
    
    # Create destination directory
    os.makedirs(dest_dir, exist_ok=True)
    
    # Move file
    shutil.move(file_path, dest_path)
    
    return rel_path

def main():
    print("=" * 80)
    print("MOVING UNUSED FILES TO BACKUP")
    print("=" * 80)
    
    # Load the list of files to move
    report_file = os.path.join(PROJECT_ROOT, 'conservative_unused_files.json')
    if not os.path.exists(report_file):
        print("❌ Error: conservative_unused_files.json not found!")
        print("   Run find_obviously_unused.py first")
        return
    
    with open(report_file) as f:
        data = json.load(f)
    
    files_to_move = data['all_files']
    
    print(f"\n📦 Preparing to move {len(files_to_move)} files to backup...")
    
    # Create backup directory
    backup_root = create_backup_structure()
    print(f"📁 Backup directory: {os.path.relpath(backup_root, PROJECT_ROOT)}")
    
    # Move files
    moved_files = []
    failed_files = []
    
    for file_rel in files_to_move:
        file_path = os.path.join(PROJECT_ROOT, file_rel)
        
        if not os.path.exists(file_path):
            print(f"⚠️  File not found: {file_rel}")
            failed_files.append(file_rel)
            continue
        
        try:
            moved_rel = move_file_to_backup(file_path, backup_root)
            moved_files.append(moved_rel)
            print(f"✅ Moved: {moved_rel}")
        except Exception as e:
            print(f"❌ Failed to move {file_rel}: {e}")
            failed_files.append(file_rel)
    
    # Create summary report
    summary = {
        'timestamp': datetime.now().isoformat(),
        'backup_location': os.path.relpath(backup_root, PROJECT_ROOT),
        'total_files': len(files_to_move),
        'moved': len(moved_files),
        'failed': len(failed_files),
        'moved_files': moved_files,
        'failed_files': failed_files,
        'categories': data['by_category']
    }
    
    summary_file = os.path.join(backup_root, 'BACKUP_SUMMARY.json')
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    
    # Also create a README
    readme_content = f"""# Backup of Unused Files

**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Moved:** {len(moved_files)} files
**Failed:** {len(failed_files)} files

## Categories

"""
    
    for category, files in data['by_category'].items():
        if files:
            readme_content += f"\n### {category.title()} ({len(files)} files)\n\n"
            for file in files[:10]:
                readme_content += f"- {file}\n"
            if len(files) > 10:
                readme_content += f"- ... and {len(files) - 10} more\n"
    
    readme_content += f"""

## Restoration

To restore these files, simply move them back to their original locations in the project.

The directory structure is preserved, so you can copy entire folders back if needed.

## Details

See `BACKUP_SUMMARY.json` for complete file list and metadata.
"""
    
    readme_file = os.path.join(backup_root, 'README.md')
    with open(readme_file, 'w') as f:
        f.write(readme_content)
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"✅ Successfully moved: {len(moved_files)} files")
    if failed_files:
        print(f"❌ Failed to move: {len(failed_files)} files")
    print(f"📁 Backup location: {os.path.relpath(backup_root, PROJECT_ROOT)}")
    print(f"📄 Summary: {os.path.relpath(summary_file, PROJECT_ROOT)}")
    print(f"📖 README: {os.path.relpath(readme_file, PROJECT_ROOT)}")
    print("=" * 80)

if __name__ == '__main__':
    main()
