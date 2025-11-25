#!/usr/bin/env python3
"""
Find unused JavaScript files in the Solidi Mobile App project.
Analyzes imports and identifies files that are never referenced.
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict

# Project root
PROJECT_ROOT = '/Users/henry/Solidi/SolidiMobileApp4'
SRC_DIR = os.path.join(PROJECT_ROOT, 'src')

# Entry points that are always considered "used"
ENTRY_POINTS = [
    'index.js',  # Root entry
    'App.js',
    'app.json',
    'package.json',
    'src/application/index.js',  # Main application entry
    'src/application/SolidiMobileApp/SolidiMobileApp.js',  # Main app component
]

# Directories to scan
SCAN_DIRS = ['src', '.']

# Directories to ignore
IGNORE_DIRS = {
    'node_modules',
    'android',
    'ios',
    'build',
    '__tests__',
    '.git',
    'backup'
}

def find_all_js_files():
    """Find all JavaScript files in the project"""
    js_files = []
    
    for scan_dir in SCAN_DIRS:
        full_path = os.path.join(PROJECT_ROOT, scan_dir)
        if not os.path.exists(full_path):
            continue
            
        for root, dirs, files in os.walk(full_path):
            # Remove ignored directories from search
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file.endswith('.js') or file.endswith('.jsx'):
                    file_path = os.path.join(root, file)
                    # Make path relative to project root
                    rel_path = os.path.relpath(file_path, PROJECT_ROOT)
                    js_files.append(rel_path)
    
    return js_files

def extract_imports_from_file(file_path):
    """Extract all imports and requires from a JavaScript file"""
    imports = set()
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Patterns to match various import styles
        patterns = [
            # import ... from '...'
            r"import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]",
            # import '...'
            r"import\s+['\"]([^'\"]+)['\"]",
            # require('...')
            r"require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)",
            # require.resolve('...')
            r"require\.resolve\s*\(\s*['\"]([^'\"]+)['\"]\s*\)",
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, content, re.MULTILINE)
            for match in matches:
                import_path = match.group(1)
                imports.add(import_path)
    
    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}")
    
    return imports

def resolve_import_path(import_path, from_file):
    """Resolve an import path to an actual file path"""
    # Skip external packages (don't start with ./ or ../)
    if not import_path.startswith('.'):
        # But check if it might be a relative src/ import
        if not import_path.startswith('/') and not import_path.startswith('src/'):
            return None
    
    # Get directory of the importing file
    from_dir = os.path.dirname(os.path.join(PROJECT_ROOT, from_file))
    
    # Resolve the import path
    if import_path.startswith('.'):
        resolved = os.path.normpath(os.path.join(from_dir, import_path))
    elif import_path.startswith('/'):
        resolved = os.path.normpath(import_path)
    else:
        # Try resolving from project root
        resolved = os.path.normpath(os.path.join(PROJECT_ROOT, import_path))
    
    # Try various extensions and index files
    candidates = [
        resolved,
        resolved + '.js',
        resolved + '.jsx',
        os.path.join(resolved, 'index.js'),
        os.path.join(resolved, 'index.jsx'),
        # Also try with /SolidiMobileApp.js pattern
        resolved + '/' + os.path.basename(resolved) + '.js',
    ]
    
    for candidate in candidates:
        if os.path.isfile(candidate):
            rel_path = os.path.relpath(candidate, PROJECT_ROOT)
            return rel_path
    
    return None

def build_dependency_graph():
    """Build a graph of which files import which"""
    print("🔍 Scanning all JavaScript files...")
    all_files = find_all_js_files()
    print(f"   Found {len(all_files)} JavaScript files")
    
    print("\n🔗 Building dependency graph...")
    dependency_graph = defaultdict(set)
    reverse_graph = defaultdict(set)  # Which files import this file
    
    for file in all_files:
        file_path = os.path.join(PROJECT_ROOT, file)
        imports = extract_imports_from_file(file_path)
        
        for import_path in imports:
            resolved = resolve_import_path(import_path, file)
            if resolved and resolved in all_files:
                dependency_graph[file].add(resolved)
                reverse_graph[resolved].add(file)
    
    print(f"   Built dependency graph with {len(dependency_graph)} files that import others")
    
    return all_files, dependency_graph, reverse_graph

def find_entry_points(all_files):
    """Find all entry point files"""
    entry_files = set()
    
    # Add explicit entry points
    for entry in ENTRY_POINTS:
        if entry in all_files:
            entry_files.add(entry)
        # Also check in src/
        src_entry = os.path.join('src', entry)
        if src_entry in all_files:
            entry_files.add(src_entry)
    
    print(f"\n📍 Found {len(entry_files)} entry points:")
    for entry in sorted(entry_files):
        print(f"   - {entry}")
    
    return entry_files

def find_used_files(entry_files, dependency_graph):
    """Find all files that are reachable from entry points"""
    used = set()
    to_visit = list(entry_files)
    
    while to_visit:
        current = to_visit.pop()
        if current in used:
            continue
        
        used.add(current)
        
        # Add all files that this file imports
        if current in dependency_graph:
            for imported in dependency_graph[current]:
                if imported not in used:
                    to_visit.append(imported)
    
    return used

def categorize_file(file_path):
    """Categorize a file by its path"""
    if 'example' in file_path.lower():
        return 'examples'
    elif 'test' in file_path.lower():
        return 'tests'
    elif 'backup' in file_path.lower():
        return 'backups'
    elif 'fix' in file_path.lower():
        return 'fixes'
    elif 'util' in file_path.lower() or 'helper' in file_path.lower():
        return 'utilities'
    elif 'component' in file_path.lower():
        return 'components'
    elif 'style' in file_path.lower():
        return 'styles'
    elif 'api' in file_path.lower():
        return 'api'
    elif 'constant' in file_path.lower():
        return 'constants'
    else:
        return 'other'

def main():
    print("=" * 80)
    print("UNUSED FILE FINDER FOR SOLIDI MOBILE APP")
    print("=" * 80)
    
    # Build dependency graph
    all_files, dependency_graph, reverse_graph = build_dependency_graph()
    
    # Find entry points
    entry_files = find_entry_points(all_files)
    
    if not entry_files:
        print("\n❌ No entry points found! Cannot determine used files.")
        return
    
    # Find all used files
    print("\n🔍 Tracing file usage from entry points...")
    used_files = find_used_files(entry_files, dependency_graph)
    print(f"   Found {len(used_files)} files that are used")
    
    # Find unused files
    unused_files = set(all_files) - used_files
    print(f"\n📊 Found {len(unused_files)} potentially unused files")
    
    # Categorize unused files
    categorized = defaultdict(list)
    for file in unused_files:
        category = categorize_file(file)
        categorized[category].append(file)
    
    # Display results
    print("\n" + "=" * 80)
    print("UNUSED FILES BY CATEGORY")
    print("=" * 80)
    
    total = 0
    for category in sorted(categorized.keys()):
        files = sorted(categorized[category])
        print(f"\n{category.upper()} ({len(files)} files):")
        for file in files[:10]:  # Show first 10
            print(f"   - {file}")
        if len(files) > 10:
            print(f"   ... and {len(files) - 10} more")
        total += len(files)
    
    # Save detailed results to JSON
    output_file = os.path.join(PROJECT_ROOT, 'unused_files_report.json')
    report = {
        'total_files': len(all_files),
        'used_files': len(used_files),
        'unused_files': len(unused_files),
        'unused_by_category': {cat: sorted(files) for cat, files in categorized.items()},
        'all_unused': sorted(unused_files)
    }
    
    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Detailed report saved to: unused_files_report.json")
    
    print("\n" + "=" * 80)
    print(f"SUMMARY: {len(unused_files)} unused files out of {len(all_files)} total")
    print("=" * 80)

if __name__ == '__main__':
    main()
