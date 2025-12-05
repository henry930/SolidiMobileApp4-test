#!/usr/bin/env python3
"""
Fix duplicate font file references in Xcode project.
This script removes font files from the Copy Bundle Resources build phase
since they're already being copied by CocoaPods.
"""

import re
import sys

project_file = '/Users/henry/Solidi/SolidiMobileApp4/ios/SolidiMobileApp4.xcodeproj/project.pbxproj'

# Font files that are duplicated
font_files = [
    'AntDesign.ttf',
    'Entypo.ttf',
    'EvilIcons.ttf',
    'Feather.ttf',
    'FontAwesome6_Brands.ttf',
    'FontAwesome6_Regular.ttf',
    'FontAwesome6_Solid.ttf',
    'Fontisto.ttf',
    'Foundation.ttf',
    'Ionicons.ttf',
    'Octicons.ttf',
    'SimpleLineIcons.ttf',
    'Zocial.ttf'
]

print(f"Reading {project_file}...")
with open(project_file, 'r') as f:
    content = f.read()

# Find and remove the PBXBuildFile entries for fonts
for font in font_files:
    # Remove lines like: 4A58A6D1F0494012B7867F90 /* AntDesign.ttf in Resources */ = {isa = PBXBuildFile; fileRef = CB3F95F8BAA046E8A5D1503C /* AntDesign.ttf */; };
    pattern = rf'\t\t[A-F0-9]+ /\* {re.escape(font)} in Resources \*/ = {{isa = PBXBuildFile; fileRef = [A-F0-9]+ /\* {re.escape(font)} \*/; }};\n'
    content = re.sub(pattern, '', content)
    print(f"Removed PBXBuildFile for {font}")

# Find and remove font references from Resources build phase
for font in font_files:
    # Remove lines like: 4A58A6D1F0494012B7867F90 /* AntDesign.ttf in Resources */,
    pattern = rf'\t\t\t\t[A-F0-9]+ /\* {re.escape(font)} in Resources \*/,\n'
    content = re.sub(pattern, '', content)
    print(f"Removed from Resources phase: {font}")

print(f"\nWriting updated project file...")
with open(project_file, 'w') as f:
    f.write(content)

print("✅ Done! Font file duplicates removed.")
print("Now try building again in Xcode.")
