// Test if react-native-render-html works in our project
import React from 'react';
import { View, Text as RNText } from 'react-native';
import { Text } from 'react-native-paper';

// Import the HTML renderer
import RenderHTML from 'react-native-render-html';

const HTMLTest = () => {
  const simpleHtml = '<h2>Hello World</h2>';
  const complexHtml = '<h5>The UK Financial Conduct Authority (FCA) requires that we ask you some additional questions to better understand your financial circumstances and serve you.<br><br>The FCA prescribes three investor categories.</h5>';
  
  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>HTML Rendering Test</Text>
      
      <RNText style={{ fontSize: 16, marginBottom: 10 }}>Test 1 - Simple H2:</RNText>
      <RenderHTML
        contentWidth={300}
        source={{ html: simpleHtml }}
      />
      
      <RNText style={{ fontSize: 16, marginBottom: 10, marginTop: 20 }}>Test 2 - Complex H5 with BR:</RNText>
      <RenderHTML
        contentWidth={300}
        source={{ html: complexHtml }}
      />
      
      <RNText style={{ marginTop: 20 }}>If you see properly formatted HTML above, the library is working!</RNText>
    </View>
  );
};

export default HTMLTest;