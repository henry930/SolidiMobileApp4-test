#!/usr/bin/env python3
"""
Conservative unused file identifier - only moves files that are CLEARLY unused:
- Example files (contains 'example' or 'Example' in name/path)
- Test files (contains 'test' or 'Test' in name/path, or in __tests__ dirs)
- Backup files (contains 'backup' or '_backup' in name/path)
- Explicitly marked unused files
"""

import os
import json
from pathlib import Path

PROJECT_ROOT = '/Users/henry/Solidi/SolidiMobileApp4'

def find_obviously_unused_files():
    """Find files that are obviously unused based on naming patterns"""
    
    unused_files = {
        'examples': [],
        'tests': [],
        'backups': [],
        'debug': [],
    }
    
    # Walk through src directory
    src_dir = os.path.join(PROJECT_ROOT, 'src')
    
    for root, dirs, files in os.walk(src_dir):
        # Skip node_modules and actual backup dirs
        dirs[:] = [d for d in dirs if d not in {'node_modules', 'backup', '__pycache__'}]
        
        for file in files:
            if not (file.endswith('.js') or file.endswith('.jsx')):
                continue
            
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, PROJECT_ROOT)
            
            # Check for example files
            if 'example' in file.lower() or 'example' in rel_path.lower():
                unused_files['examples'].append(rel_path)
            
            # Check for test files
            elif 'test' in file.lower() or 'test' in rel_path.lower() or '__tests__' in rel_path:
                unused_files['tests'].append(rel_path)
            
            # Check for backup files
            elif 'backup' in file.lower() or 'backup' in rel_path.lower() or '_backup' in rel_path.lower():
                unused_files['backups'].append(rel_path)
            
            # Check for debug files
            elif 'debug' in file.lower() and 'debug' not in file.lower().replace('debug', ''):
                unused_files['debug'].append(rel_path)
    
    # Also check test directory at root
    test_dir = os.path.join(PROJECT_ROOT, 'test')
    if os.path.exists(test_dir):
        for root, dirs, files in os.walk(test_dir):
            for file in files:
                if file.endswith('.js') or file.endswith('.jsx'):
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, PROJECT_ROOT)
                    unused_files['tests'].append(rel_path)
    
    return unused_files

def main():
    print("=" * 80)
    print("CONSERVATIVE UNUSED FILE FINDER")
    print("Only identifies files that are CLEARLY unused")
    print("=" * 80)
    
    unused = find_obviously_unused_files()
    
    total = sum(len(files) for files in unused.values())
    
    print(f"\n📊 Found {total} obviously unused files:\n")
    
    for category, files in unused.items():
        if files:
            print(f"{category.upper()} ({len(files)} files):")
            for file in sorted(files)[:15]:
                print(f"  - {file}")
            if len(files) > 15:
                print(f"  ... and {len(files) - 15} more")
            print()
    
    # Save to JSON
    output = {
        'total': total,
        'by_category': {cat: sorted(files) for cat, files in unused.items()},
        'all_files': sorted([f for files in unused.values() for f in files])
    }
    
    with open(os.path.join(PROJECT_ROOT, 'conservative_unused_files.json'), 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"📄 Report saved to: conservative_unused_files.json")
    print(f"\n✅ Total: {total} files identified as clearly unused")

if __name__ == '__main__':
    main()
