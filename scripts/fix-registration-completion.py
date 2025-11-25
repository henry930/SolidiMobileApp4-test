#!/usr/bin/env python3
# Fix RegistrationCompletion.js - Move credentials check BEFORE email/phone verification

import re

file_path = 'src/application/SolidiMobileApp/components/MainPanel/components/RegistrationCompletion/RegistrationCompletion.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the section starting from line 118 and replace it
old_pattern = r"""      // For returning users, check verification status FIRST \(before checking credentials\)
      const emailVerified = appState\.emailVerified \|\| appState\.user\?\.emailVerified \|\| false;
      const phoneVerified = appState\.phoneVerified \|\| appState\.user\?\.phoneVerified \|\| false;
      
      console\.log\('[^']*' Email verified:', emailVerified\);
      console\.log\('[^']*' Phone verified:', phoneVerified\);
      
      // If email not verified, start from step 1 \(Email Verification\)
      if \(!emailVerified\) \{
        console\.log\('[^']*' Email not verified - starting from step 1 \(Email Verification\)'\);
        setCurrentStep\(0\);
        setCompletedSteps\(new Set\(\)\);
        return 0;
      \}
      
      // If email verified but phone not verified, go to step 2 \(Phone Verification\)
      if \(emailVerified && !phoneVerified\) \{
        console\.log\('[^']*' Phone not verified - starting from step 2 \(Phone Verification\)'\);
        setCurrentStep\(1\);
        setCompletedSteps\(new Set\(\['email'\]\)\);
        return 1;
      \}
      
      // Both email and phone verified - now check if user has credentials
      const userUuid = appState\.user\?\.uuid \|\| appState\.user\?\.info\?\.user\?\.uuid;
      const isAuthenticated = appState\.user\?\.isAuthenticated;
      const hasCredentials = userUuid && isAuthenticated;
      
      console\.log\('[^']*' User UUID:', userUuid\);
      console\.log\('🔐 Is authenticated:', isAuthenticated\);
      console\.log\('[^']*' Has credentials:', hasCredentials\);
      console\.log\('🔐 Full user object keys:', appState\.user \? Object\.keys\(appState\.user\) : 'No user object'\);"""

new_text = """      // CRITICAL FIX: Check credentials FIRST before checking email/phone verification
      const userUuid = appState.user?.uuid || appState.user?.info?.user?.uuid;
      const isAuthenticated = appState.user?.isAuthenticated;
      const hasCredentials = userUuid && isAuthenticated;
      
      console.log('🔐 User UUID:', userUuid);
      console.log('🔐 Is authenticated:', isAuthenticated);
      console.log('🔐 Has credentials:', hasCredentials);
      console.log('🔐 Full user object keys:', appState.user ? Object.keys(appState.user) : 'No user object');
      
      // For authenticated users, skip email/phone verification checks
      if (!hasCredentials) {
        // Only check verification status for non-authenticated users
        const emailVerified = appState.emailVerified || appState.user?.emailVerified || false;
        const phoneVerified = appState.phoneVerified || appState.user?.phoneVerified || false;
        
        console.log('📧 Email verified:', emailVerified);
        console.log('📱 Phone verified:', phoneVerified);
        
        // If email not verified, start from step 1 (Email Verification)
        if (!emailVerified) {
          console.log('❌ Email not verified - starting from step 1 (Email Verification)');
          setCurrentStep(0);
          setCompletedSteps(new Set());
          return 0;
        }
        
        // If email verified but phone not verified, go to step 2 (Phone Verification)
        if (emailVerified && !phoneVerified) {
          console.log('❌ Phone not verified - starting from step 2 (Phone Verification)');
          setCurrentStep(1);
          setCompletedSteps(new Set(['email']));
          return 1;
        }
      }"""

# Try regex replacement
content_new = re.sub(old_pattern, new_text, content, flags=re.MULTILINE)

if content_new == content:
    print("❌ Pattern not found - trying simpler approach...")
    
    # Simpler approach: find line numbers and replace
    lines = content.split('\n')
    
    # Find the line with "For returning users, check verification status"
    start_idx = None
    for i, line in enumerate(lines):
        if 'For returning users, check verification status FIRST' in line:
            start_idx = i
            break
    
    if start_idx is None:
        print("❌ Could not find starting line")
        exit(1)
    
    # Find the end (line with "Full user object keys")
    end_idx = None
    for i in range(start_idx, min(start_idx + 40, len(lines))):
        if 'Full user object keys' in lines[i]:
            end_idx = i
            break
    
    if end_idx is None:
        print("❌ Could not find ending line")
        exit(1)
    
    print(f"✅ Found section from line {start_idx+1} to {end_idx+1}")
    
    # Replace the section
    new_lines = new_text.split('\n')
    lines = lines[:start_idx] + new_lines + lines[end_idx+1:]
    content_new = '\n'.join(lines)

# Write the file
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content_new)

print("✅ Successfully updated RegistrationCompletion.js")
print("📝 Changes made:")
print("   - Moved credentials check BEFORE email/phone verification")
print("   - Wrapped email/phone checks in 'if (!hasCredentials)' block")
print("   - Authenticated users now skip email/phone verification checks")
