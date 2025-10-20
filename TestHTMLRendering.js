// Minimal test for react-native-render-html
// Save this as TestHTMLRendering.js and import it in your app to test

import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import RenderHTML from 'react-native-render-html';

const TestHTMLRendering = () => {
  // Test HTML samples from your actual form data
  const htmlSamples = [
    '<h2>Which type of investor are you?</h2>',
    '<h5>The UK Financial Conduct Authority (FCA) requires that we ask you some additional questions to better understand your financial circumstances and serve you.<br><br>The FCA prescribes three investor categories.</h5>',
    '<b>Restricted investor</b><br>You\'ve invested less than 10% of your net worth in high risk assets (such as Crypto) over the last 12 months, <b>and</b> you intend to limit such investments to less than 10% in the year ahead.<br>&nbsp;'
  ];

  const tagsStyles = {
    h2: { 
      fontSize: 20, 
      fontWeight: 'bold', 
      marginVertical: 6, 
      color: '#000' 
    },
    h5: { 
      fontSize: 16, 
      fontWeight: 'bold', 
      marginVertical: 4, 
      color: '#000' 
    },
    b: { fontWeight: 'bold' },
    p: { fontSize: 14, color: '#000', marginVertical: 2 }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#fff' }}>
      <Text variant="headlineMedium" style={{ marginBottom: 20 }}>
        HTML Rendering Test
      </Text>
      
      {htmlSamples.map((html, index) => (
        <View key={index} style={{ marginBottom: 30 }}>
          <Text variant="bodyMedium" style={{ marginBottom: 10, color: '#666' }}>
            Test {index + 1} - Raw HTML:
          </Text>
          <Text style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 10, color: '#999' }}>
            {html}
          </Text>
          
          <Text variant="bodyMedium" style={{ marginBottom: 10, color: '#666' }}>
            Rendered output:
          </Text>
          
          <View style={{ borderWidth: 1, borderColor: '#eee', padding: 10, backgroundColor: '#f9f9f9' }}>
            <RenderHTML
              contentWidth={300}
              source={{ html }}
              tagsStyles={tagsStyles}
            />
          </View>
        </View>
      ))}
      
      <Text style={{ marginTop: 20, color: '#666', fontStyle: 'italic' }}>
        If you see properly formatted text above (headings should be bold and larger, 
        line breaks should work), then react-native-render-html is working correctly.
      </Text>
    </ScrollView>
  );
};

export default TestHTMLRendering;

// To use this test component, import and render it in your app:
// import TestHTMLRendering from './TestHTMLRendering';
// Then replace your main component with <TestHTMLRendering /> temporarily