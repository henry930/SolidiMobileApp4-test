// Test the custom HTML renderer
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

// Copy the renderHtmlText function here for testing
const renderHtmlText = (htmlString, baseStyle = {}, width = 350) => {
  if (!htmlString) return null;
  
  console.log('🎨 Rendering HTML:', htmlString.substring(0, 100) + (htmlString.length > 100 ? '...' : ''));
  
  // If no HTML tags, return simple text
  if (!htmlString.includes('<')) {
    return <Text style={baseStyle}>{htmlString}</Text>;
  }

  // Parse simple HTML tags and render them properly
  const parseAndRenderHtml = (html) => {
    // Handle line breaks first
    const parts = html.split(/<br\s*\/?>/i);
    const elements = [];
    
    parts.forEach((part, partIndex) => {
      if (part.trim()) {
        // Check for heading tags
        if (part.match(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/i)) {
          const match = part.match(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/i);
          const level = parseInt(match[1]);
          const content = match[2].replace(/<[^>]*>/g, ''); // Remove any other tags
          
          let headingStyle = { ...baseStyle };
          switch (level) {
            case 1:
              headingStyle = { ...baseStyle, fontSize: 24, fontWeight: 'bold', marginVertical: 8 };
              break;
            case 2:
              headingStyle = { ...baseStyle, fontSize: 20, fontWeight: 'bold', marginVertical: 6 };
              break;
            case 3:
              headingStyle = { ...baseStyle, fontSize: 18, fontWeight: 'bold', marginVertical: 5 };
              break;
            case 4:
              headingStyle = { ...baseStyle, fontSize: 16, fontWeight: 'bold', marginVertical: 4 };
              break;
            case 5:
              headingStyle = { ...baseStyle, fontSize: 16, fontWeight: 'bold', marginVertical: 4 };
              break;
            case 6:
              headingStyle = { ...baseStyle, fontSize: 14, fontWeight: 'bold', marginVertical: 3 };
              break;
          }
          
          elements.push(
            <Text key={`heading-${partIndex}`} style={headingStyle}>
              {content}
            </Text>
          );
        } else {
          // Handle other formatting tags
          let processedText = part;
          const textElements = [];
          
          // Split by bold tags
          const boldParts = processedText.split(/(<b[^>]*>.*?<\/b>|<strong[^>]*>.*?<\/strong>)/i);
          
          boldParts.forEach((boldPart, boldIndex) => {
            if (boldPart.match(/<(b|strong)[^>]*>(.*?)<\/(b|strong)>/i)) {
              const boldMatch = boldPart.match(/<(b|strong)[^>]*>(.*?)<\/(b|strong)>/i);
              const boldContent = boldMatch[2];
              textElements.push(
                <Text key={`bold-${partIndex}-${boldIndex}`} style={{ ...baseStyle, fontWeight: 'bold' }}>
                  {boldContent}
                </Text>
              );
            } else if (boldPart.trim()) {
              // Clean up any remaining HTML tags and entities
              const cleanText = boldPart
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
                .replace(/&amp;/g, '&') // Replace &amp; with &
                .replace(/&lt;/g, '<') // Replace &lt; with <
                .replace(/&gt;/g, '>'); // Replace &gt; with >
              
              if (cleanText.trim()) {
                textElements.push(
                  <Text key={`text-${partIndex}-${boldIndex}`} style={baseStyle}>
                    {cleanText}
                  </Text>
                );
              }
            }
          });
          
          if (textElements.length > 0) {
            elements.push(
              <Text key={`paragraph-${partIndex}`} style={baseStyle}>
                {textElements}
              </Text>
            );
          }
        }
      }
      
      // Add line break if not the last part
      if (partIndex < parts.length - 1) {
        elements.push(
          <Text key={`br-${partIndex}`} style={baseStyle}>
            {'\n'}
          </Text>
        );
      }
    });
    
    return elements;
  };

  try {
    const renderedElements = parseAndRenderHtml(htmlString);
    console.log('✅ HTML parsed successfully, elements:', renderedElements.length);
    
    return (
      <View>
        {renderedElements}
      </View>
    );
  } catch (error) {
    console.error('❌ HTML parsing error:', error);
    // Fallback to simple text without HTML tags
    const cleanText = htmlString
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    return <Text style={baseStyle}>{cleanText}</Text>;
  }
};

const TestCustomHTML = () => {
  // Test HTML samples from your form data
  const testSamples = [
    '<h2>Which type of investor are you?</h2>',
    '<h5>The UK Financial Conduct Authority (FCA) requires that we ask you some additional questions to better understand your financial circumstances and serve you.<br><br>The FCA prescribes three investor categories.</h5>',
    '<b>Restricted investor</b><br>You\'ve invested less than 10% of your net worth in high risk assets (such as Crypto) over the last 12 months, <b>and</b> you intend to limit such investments to less than 10% in the year ahead.<br>&nbsp;'
  ];

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#fff' }}>
      <Text variant="headlineMedium" style={{ marginBottom: 20 }}>
        Custom HTML Renderer Test
      </Text>
      
      {testSamples.map((html, index) => (
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
            {renderHtmlText(html, { fontSize: 14, color: '#333' })}
          </View>
        </View>
      ))}
      
      <Text style={{ marginTop: 20, color: '#666', fontStyle: 'italic' }}>
        If you see properly formatted text above (H2 should be large and bold, H5 should be medium and bold, 
        BR should create line breaks, B should make text bold), then the custom HTML renderer is working!
      </Text>
    </ScrollView>
  );
};

export default TestCustomHTML;