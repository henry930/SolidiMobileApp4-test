#!/usr/bin/env python3
"""
Comprehensive API endpoint extractor for Solidi Mobile App
Extracts all API routes with their context and parameters
"""

import re
import os

def extract_apis_with_context(file_path):
    """Extract all API endpoints with their surrounding context"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    apis = []
    
    # Pattern to match privateMethod/publicMethod calls
    patterns = [
        r'(this\.\w+\s*=\s*async\s*\([^)]*\)\s*=>\s*{[^}]*?(?:privateMethod|publicMethod)\s*\(\s*{[^}]*?apiRoute:\s*[\'"`]([^\'"`]+)[\'"`][^}]*?\})',
        r'await\s+this\.state\.(privateMethod|publicMethod)\s*\(\s*{([^}]+?)}\s*\)',
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, content, re.DOTALL)
        for match in matches:
            full_context = match.group(0)
            
            # Extract function name
            func_match = re.search(r'this\.(\w+)\s*=\s*async', full_context)
            func_name = func_match.group(1) if func_match else 'Unknown'
            
            # Extract API route
            route_match = re.search(r'apiRoute:\s*[\'"`]([^\'"`]+)[\'"`]', full_context)
            if route_match:
                api_route = route_match.group(1)
            else:
                # Try template literal
                route_match = re.search(r'apiRoute:\s*`([^`]+)`', full_context)
                if route_match:
                    api_route = route_match.group(1)
                else:
                    continue
            
            # Extract HTTP method
            method_match = re.search(r'httpMethod:\s*[\'"]([^\'"]+)[\'"]', full_context)
            http_method = method_match.group(1) if method_match else 'POST'
            
            # Extract method type (private/public)
            method_type = 'Private' if 'privateMethod' in full_context else 'Public'
            
            # Extract params
            params_match = re.search(r'params:\s*{([^}]+)}', full_context)
            params = params_match.group(1).strip() if params_match else '{}'
            
            apis.append({
                'function': func_name,
                'route': api_route,
                'method': http_method,
                'type': method_type,
                'params': params,
                'context': full_context[:300]
            })
    
    return apis

def main():
    app_state_path = 'src/application/data/AppState.js'
    
    if not os.path.exists(app_state_path):
        print(f"❌ File not found: {app_state_path}")
        return
    
    print("🔍 Extracting all API endpoints from AppState.js...")
    print()
    
    apis = extract_apis_with_context(app_state_path)
    
    # Group by type
    private_apis = [api for api in apis if api['type'] == 'Private']
    public_apis = [api for api in apis if api['type'] == 'Public']
    
    print(f"📊 Found {len(apis)} total API endpoints")
    print(f"   🔐 Private: {len(private_apis)}")
    print(f"   🔓 Public: {len(public_apis)}")
    print()
    
    print("=" * 80)
    print("PRIVATE ENDPOINTS")
    print("=" * 80)
    for api in sorted(private_apis, key=lambda x: x['route']):
        print(f"\n✅ {api['function']}")
        print(f"   Route: {api['route']}")
        print(f"   Method: {api['method']}")
        if api['params'] != '{}':
            print(f"   Params: {api['params'][:100]}...")
    
    print("\n" + "=" * 80)
    print("PUBLIC ENDPOINTS")
    print("=" * 80)
    for api in sorted(public_apis, key=lambda x: x['route']):
        print(f"\n✅ {api['function']}")
        print(f"   Route: {api['route']}")
        print(f"   Method: {api['method']}")
        if api['params'] != '{}':
            print(f"   Params: {api['params'][:100]}...")
    
    # Extract all unique routes (including template literals)
    print("\n" + "=" * 80)
    print("ALL UNIQUE API ROUTES")
    print("=" * 80)
    
    routes = set()
    for api in apis:
        routes.add(api['route'])
    
    for route in sorted(routes):
        print(f"   /api2/v1/{route}")

if __name__ == '__main__':
    main()
