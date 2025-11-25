#!/usr/bin/env python3
"""
Solidi Mobile App - API Documentation Generator
Scans the codebase and generates comprehensive API documentation
"""

import re
import json
from collections import defaultdict
from datetime import datetime

# File paths to scan
FILES_TO_SCAN = [
    'src/application/data/AppState.js',
    'src/application/SolidiMobileApp/components/MainPanel/components/PhoneVerification/PhoneVerification.js',
    'src/application/SolidiMobileApp/components/MainPanel/components/EmailVerification/EmailVerification.js',
]

def extract_api_calls(file_path):
    """Extract all API calls from a JavaScript file"""
    apis = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Pattern to match privateMethod and publicMethod calls
        private_pattern = r'(?:privateMethod|this\.state\.privateMethod|appState\.privateMethod|this\.privateMethod|apiClient\.privateMethod)\s*\(\s*\{[^}]*?apiRoute:\s*[\'"`]([^\'"`]+)[\'"`][^}]*?\}'
        public_pattern = r'(?:publicMethod|this\.state\.publicMethod|appState\.publicMethod|this\.publicMethod|apiClient\.publicMethod)\s*\(\s*\{[^}]*?apiRoute:\s*[\'"`]([^\'"`]+)[\'"`][^}]*?\}'
        
        # Find private API calls
        for match in re.finditer(private_pattern, content, re.DOTALL):
            route = match.group(1)
            # Get surrounding context
            start = max(0, match.start() - 500)
            end = min(len(content), match.end() + 200)
            context = content[start:end]
            
            # Extract params if present
            params_match = re.search(r'params:\s*\{([^}]+)\}', context)
            params = params_match.group(1).strip() if params_match else None
            
            apis.append({
                'route': route,
                'type': 'PRIVATE',
                'file': file_path,
                'params': params,
                'context': context
            })
        
        # Find public API calls
        for match in re.finditer(public_pattern, content, re.DOTALL):
            route = match.group(1)
            start = max(0, match.start() - 500)
            end = min(len(content), match.end() + 200)
            context = content[start:end]
            
            params_match = re.search(r'params:\s*\{([^}]+)\}', context)
            params = params_match.group(1).strip() if params_match else None
            
            apis.append({
                'route': route,
                'type': 'PUBLIC',
                'file': file_path,
                'params': params,
                'context': context
            })
            
    except FileNotFoundError:
        print(f"Warning: File not found: {file_path}")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
    
    return apis

def categorize_apis(apis):
    """Group APIs by category"""
    categories = {
        'Authentication & User': [],
        'Trading & Orders': [],
        'Wallet & Balance': [],
        'Market Data': [],
        'Deposits & Withdrawals': [],
        'Verification & KYC': [],
        'Account Management': [],
        'System': [],
        'Other': []
    }
    
    for api in apis:
        route = api['route']
        
        if any(x in route for x in ['login', 'register', 'credentials', 'password', 'email', 'mobile', 'phone', 'confirm_']):
            categories['Authentication & User'].append(api)
        elif any(x in route for x in ['buy', 'sell', 'order', 'trade']):
            categories['Trading & Orders'].append(api)
        elif any(x in route for x in ['balance', 'fee', 'ticker', 'price', 'wallet']):
            categories['Wallet & Balance'].append(api)
        elif any(x in route for x in ['market', 'asset', 'ticker', 'historic']):
            categories['Market Data'].append(api)
        elif any(x in route for x in ['deposit', 'withdraw', 'addressBook', 'default_account']):
            categories['Deposits & Withdrawals'].append(api)
        elif any(x in route for x in ['identity', 'verification', 'extra_information', 'document']):
            categories['Verification & KYC'].append(api)
        elif any(x in route for x in ['user', 'account', 'deletion']):
            categories['Account Management'].append(api)
        elif any(x in route for x in ['api_latest', 'app_latest', 'version']):
            categories['System'].append(api)
        else:
            categories['Other'].append(api)
    
    return categories

def generate_markdown(categories):
    """Generate markdown documentation"""
    doc = []
    
    doc.append("# Solidi Mobile App - Complete API Documentation")
    doc.append("")
    doc.append(f"**Generated:** {datetime.now().strftime('%B %d, %Y at %H:%M')}")
    doc.append("")
    doc.append("## Base Configuration")
    doc.append("")
    doc.append("- **Base URL**: `https://DOMAIN/api2/v1/`")
    doc.append("- **Test Domain**: `t2.solidi.co`")
    doc.append("- **Production Domain**: `www.solidi.co`")
    doc.append("- **User Agent**: `SolidiMobileApp4/1.2.0 (Build 33)`")
    doc.append("")
    doc.append("## Authentication")
    doc.append("")
    doc.append("### Public Endpoints")
    doc.append("- **Method**: GET or POST")
    doc.append("- **Headers**:")
    doc.append("  ```")
    doc.append("  Content-Type: application/json")
    doc.append("  Accept: application/json")
    doc.append("  User-Agent: SolidiMobileApp4/1.2.0 (Build 33)")
    doc.append("  ```")
    doc.append("")
    doc.append("### Private Endpoints")
    doc.append("- **Method**: POST (required for HMAC)")
    doc.append("- **Authentication**: HMAC SHA256 signature")
    doc.append("- **Headers**:")
    doc.append("  ```")
    doc.append("  Content-Type: application/json")
    doc.append("  Accept: application/json")
    doc.append("  User-Agent: SolidiMobileApp4/1.2.0 (Build 33)")
    doc.append("  API-Key: <user_api_key>")
    doc.append("  API-Sign: <hmac_sha256_signature>")
    doc.append("  ```")
    doc.append("- **Body**: Must include `nonce` (timestamp in microseconds)")
    doc.append("")
    doc.append("### HMAC Signature Generation")
    doc.append("```javascript")
    doc.append("// Path: /api2/v1/{endpoint}")
    doc.append("// Post data: JSON.stringify({...params, nonce})")
    doc.append("// Message: path + SHA256(nonce + postData)")
    doc.append("// Signature: HMAC-SHA256(message, base64-decoded-apiSecret)")
    doc.append("// Result: base64(signature)")
    doc.append("```")
    doc.append("")
    doc.append("---")
    doc.append("")
    
    # Generate documentation for each category
    for category, apis in categories.items():
        if not apis:
            continue
            
        doc.append(f"## {category}")
        doc.append("")
        
        # Group by unique route
        unique_apis = {}
        for api in apis:
            if api['route'] not in unique_apis:
                unique_apis[api['route']] = api
        
        for route, api in sorted(unique_apis.items()):
            doc.append(f"### `{route}`")
            doc.append("")
            doc.append(f"- **Type**: {api['type']}")
            doc.append(f"- **Method**: POST" if api['type'] == 'PRIVATE' else f"- **Method**: GET or POST")
            doc.append(f"- **Endpoint**: `/api2/v1/{route}`")
            
            if api['params']:
                doc.append(f"- **Parameters**:")
                doc.append(f"  ```javascript")
                doc.append(f"  {api['params']}")
                doc.append(f"  ```")
            
            doc.append("")
    
    return "\n".join(doc)

def main():
    """Main execution"""
    print("🔍 Scanning Solidi Mobile App for API endpoints...")
    
    all_apis = []
    for file_path in FILES_TO_SCAN:
        print(f"  📄 Scanning {file_path}...")
        apis = extract_api_calls(file_path)
        all_apis.extend(apis)
        print(f"     Found {len(apis)} API calls")
    
    print(f"\n✅ Total API calls found: {len(all_apis)}")
    
    # Categorize
    print("\n📊 Categorizing APIs...")
    categories = categorize_apis(all_apis)
    
    for cat, apis in categories.items():
        if apis:
            unique_routes = len(set(api['route'] for api in apis))
            print(f"  {cat}: {unique_routes} unique endpoints")
    
    # Generate documentation
    print("\n📝 Generating documentation...")
    markdown = generate_markdown(categories)
    
    # Write to file
    output_file = 'API_DOCUMENTATION_NEW.md'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(markdown)
    
    print(f"\n✅ Documentation written to {output_file}")
    print(f"📏 Total lines: {len(markdown.splitlines())}")

if __name__ == '__main__':
    main()
