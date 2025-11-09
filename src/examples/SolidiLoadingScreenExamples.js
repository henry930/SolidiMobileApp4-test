// Example Usage Demonstration for SolidiLoadingScreen
// This file shows all the different ways to use the SolidiLoadingScreen component
// Copy and adapt these examples to your components

import React, { useState } from 'react';
import { View, ScrollView, Button, Text } from 'react-native';
import { Portal } from 'react-native-paper';
import { SolidiLoadingScreen } from 'src/components/shared';

const SolidiLoadingScreenExamples = () => {
  const [showExample1, setShowExample1] = useState(false);
  const [showExample2, setShowExample2] = useState(false);
  const [showExample3, setShowExample3] = useState(false);
  const [showExample4, setShowExample4] = useState(false);

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        SolidiLoadingScreen Examples
      </Text>

      {/* Example 1: Full-Page Loading */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Example 1: Full-Page Loading (Medium)
        </Text>
        <Text style={{ marginBottom: 10 }}>
          Use for initial page loads. Takes up entire screen.
        </Text>
        <Button 
          title={showExample1 ? "Hide" : "Show Example 1"}
          onPress={() => setShowExample1(!showExample1)}
        />
        {showExample1 && (
          <View style={{ height: 300, marginTop: 10, borderWidth: 1, borderColor: '#ddd' }}>
            <SolidiLoadingScreen 
              message="Loading page data..."
              size="medium"
            />
          </View>
        )}
        <Text style={{ marginTop: 10, fontStyle: 'italic', color: '#666' }}>
          Code:{'\n'}
          &lt;SolidiLoadingScreen message="Loading page data..." size="medium" /&gt;
        </Text>
      </View>

      {/* Example 2: Small Inline Loading */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Example 2: Inline Loading (Small)
        </Text>
        <Text style={{ marginBottom: 10 }}>
          Use for loading specific sections without blocking the entire page.
        </Text>
        <Button 
          title={showExample2 ? "Hide" : "Show Example 2"}
          onPress={() => setShowExample2(!showExample2)}
        />
        {showExample2 && (
          <View style={{ height: 200, marginTop: 10, borderWidth: 1, borderColor: '#ddd', padding: 10 }}>
            <SolidiLoadingScreen 
              fullScreen={false}
              size="small"
              message="Loading section..."
            />
          </View>
        )}
        <Text style={{ marginTop: 10, fontStyle: 'italic', color: '#666' }}>
          Code:{'\n'}
          &lt;SolidiLoadingScreen{'\n'}
          {'  '}fullScreen={'{false}'}{'\n'}
          {'  '}size="small"{'\n'}
          {'  '}message="Loading section..."{'\n'}
          /&gt;
        </Text>
      </View>

      {/* Example 3: Large Overlay */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Example 3: Overlay Loading (Large)
        </Text>
        <Text style={{ marginBottom: 10 }}>
          Use for important operations like authentication or processing.
        </Text>
        <Button 
          title={showExample3 ? "Hide" : "Show Example 3"}
          onPress={() => setShowExample3(!showExample3)}
        />
        {showExample3 && (
          <Portal>
            <View style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}>
              <SolidiLoadingScreen 
                fullScreen={false}
                message="Processing transaction..."
                size="large"
                backgroundColor="transparent"
              />
            </View>
          </Portal>
        )}
        <Text style={{ marginTop: 10, fontStyle: 'italic', color: '#666' }}>
          Code:{'\n'}
          &lt;Portal&gt;{'\n'}
          {'  '}&lt;View style={'{overlayStyle}'}&gt;{'\n'}
          {'    '}&lt;SolidiLoadingScreen{'\n'}
          {'      '}fullScreen={'{false}'}{'\n'}
          {'      '}message="Processing transaction..."{'\n'}
          {'      '}size="large"{'\n'}
          {'      '}backgroundColor="transparent"{'\n'}
          {'    '}/&gt;{'\n'}
          {'  '}&lt;/View&gt;{'\n'}
          &lt;/Portal&gt;
        </Text>
      </View>

      {/* Example 4: Conditional Page Loading */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Example 4: Conditional Page Loading
        </Text>
        <Text style={{ marginBottom: 10 }}>
          Common pattern: Show loading while data fetches, then show content.
        </Text>
        <Button 
          title={showExample4 ? "Show Content" : "Show Loading"}
          onPress={() => setShowExample4(!showExample4)}
        />
        <View style={{ height: 250, marginTop: 10, borderWidth: 1, borderColor: '#ddd' }}>
          {!showExample4 ? (
            <SolidiLoadingScreen 
              message="Loading wallet..."
              size="medium"
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                ✅ Content Loaded!
              </Text>
              <Text style={{ marginTop: 10 }}>
                Your wallet balance: $1,234.56
              </Text>
            </View>
          )}
        </View>
        <Text style={{ marginTop: 10, fontStyle: 'italic', color: '#666' }}>
          Code:{'\n'}
          if (isLoading) {'{'}{'\n'}
          {'  '}return &lt;SolidiLoadingScreen message="Loading wallet..." /&gt;;{'\n'}
          {'}'}{'\n'}
          return &lt;View&gt;{'{/* Content */}'}&lt;/View&gt;;
        </Text>
      </View>

      {/* Size Comparison */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Size Comparison
        </Text>
        
        <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Small (60px):</Text>
        <View style={{ height: 150, borderWidth: 1, borderColor: '#ddd', marginVertical: 5 }}>
          <SolidiLoadingScreen 
            fullScreen={false}
            size="small"
            message="Small size"
          />
        </View>

        <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Medium (100px) - Recommended:</Text>
        <View style={{ height: 200, borderWidth: 1, borderColor: '#ddd', marginVertical: 5 }}>
          <SolidiLoadingScreen 
            fullScreen={false}
            size="medium"
            message="Medium size"
          />
        </View>

        <Text style={{ fontWeight: 'bold', marginTop: 10 }}>Large (150px):</Text>
        <View style={{ height: 280, borderWidth: 1, borderColor: '#ddd', marginVertical: 5 }}>
          <SolidiLoadingScreen 
            fullScreen={false}
            size="large"
            message="Large size"
          />
        </View>
      </View>

      {/* Best Practices */}
      <View style={{ marginBottom: 50 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Best Practices
        </Text>
        <Text style={{ marginBottom: 5 }}>
          ✅ Use <Text style={{ fontWeight: 'bold' }}>medium</Text> for full-page loads
        </Text>
        <Text style={{ marginBottom: 5 }}>
          ✅ Use <Text style={{ fontWeight: 'bold' }}>small</Text> for inline/section loads
        </Text>
        <Text style={{ marginBottom: 5 }}>
          ✅ Use <Text style={{ fontWeight: 'bold' }}>large</Text> for important overlays
        </Text>
        <Text style={{ marginBottom: 5 }}>
          ✅ Provide descriptive messages: "Loading wallet...", "Processing payment..."
        </Text>
        <Text style={{ marginBottom: 5 }}>
          ✅ Use <Text style={{ fontWeight: 'bold' }}>transparent</Text> background for overlays
        </Text>
        <Text style={{ marginBottom: 5 }}>
          ✅ Set <Text style={{ fontWeight: 'bold' }}>fullScreen={'{false}'}</Text> for inline sections
        </Text>
      </View>
    </ScrollView>
  );
};

export default SolidiLoadingScreenExamples;

/* 
 * QUICK REFERENCE
 * 
 * Import:
 * import { SolidiLoadingScreen } from 'src/components/shared';
 * 
 * Props:
 * - fullScreen: boolean (default: true)
 * - message: string (default: 'Loading...')
 * - size: 'small' | 'medium' | 'large' (default: 'medium')
 * - backgroundColor: string (default: 'white')
 * 
 * Common Patterns:
 * 
 * 1. Full-page:
 *    <SolidiLoadingScreen message="Loading..." />
 * 
 * 2. Inline:
 *    <SolidiLoadingScreen fullScreen={false} size="small" />
 * 
 * 3. Overlay:
 *    <Portal>
 *      <View style={overlayStyle}>
 *        <SolidiLoadingScreen 
 *          fullScreen={false} 
 *          size="large" 
 *          backgroundColor="transparent" 
 *        />
 *      </View>
 *    </Portal>
 * 
 * 4. Conditional:
 *    if (isLoading) {
 *      return <SolidiLoadingScreen message="Loading data..." />;
 *    }
 */
