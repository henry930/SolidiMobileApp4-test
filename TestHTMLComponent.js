// Simple test component to verify HTML rendering
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import RenderHTML from 'react-native-render-html';

const TestHTMLComponent = () => {
  const htmlSample1 = '<h2>Which type of investor are you?</h2>';
  const htmlSample2 = '<h5>The UK Financial Conduct Authority (FCA) requires that we ask you some additional questions to better understand your financial circumstances and serve you.<br><br>The FCA prescribes three investor categories.</h5>';
  
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
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        HTML Rendering Test
      </Text>
      
      <Text style={{ marginBottom: 10 }}>Sample 1 (H2 tag):</Text>
      <RenderHTML
        contentWidth={350}
        source={{ html: htmlSample1 }}
        tagsStyles={tagsStyles}
      />
      
      <Text style={{ marginBottom: 10, marginTop: 20 }}>Sample 2 (H5 tag with BR):</Text>
      <RenderHTML
        contentWidth={350}
        source={{ html: htmlSample2 }}
        tagsStyles={tagsStyles}
      />
      
      <Text style={{ marginTop: 20 }}>If you see the HTML content rendered with proper styling above, the library is working!</Text>
    </ScrollView>
  );
};

export default TestHTMLComponent;