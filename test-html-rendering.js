// Test HTML rendering with react-native-render-html
import React from 'react';
import { View, Text } from 'react-native';
import RenderHtml from 'react-native-render-html';

const TestHtmlRendering = () => {
  const htmlContent = '<h2>Which type of investor are you?</h2>';
  const htmlContent2 = '<h5>The UK Financial Conduct Authority (FCA) requires that we ask you some additional questions to better understand your financial circumstances and serve you.<br><br>The FCA prescribes three investor categories.</h5>';
  
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
    <View style={{ padding: 20 }}>
      <Text>Testing HTML rendering:</Text>
      
      <RenderHtml
        contentWidth={350}
        source={{ html: htmlContent }}
        tagsStyles={tagsStyles}
      />
      
      <RenderHtml
        contentWidth={350}
        source={{ html: htmlContent2 }}
        tagsStyles={tagsStyles}
      />
    </View>
  );
};

export default TestHtmlRendering;