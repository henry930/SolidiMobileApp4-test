// Simple test to verify HTML rendering works
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

// Copy of the renderHtmlText function for direct testing
const renderHtmlText = (htmlString, baseStyle = {}, width = 350) => {
  if (!htmlString) return null;
  
  console.log('🎨 Rendering HTML:', htmlString.substring(0, 100) + (htmlString.length > 100 ? '...' : ''));
  
  // If no HTML tags, return simple text
  if (!htmlString.includes('<')) {
    console.log('⚪ No HTML tags found, returning plain text');
    return <Text style={baseStyle}>{htmlString}</Text>;
  }

  console.log('🔍 HTML tags detected, parsing...');

  // Parse simple HTML tags and render them properly
  const parseAndRenderHtml = (html) => {
    // Handle line breaks first
    const parts = html.split(/<br\s*\/?>/i);
    console.log('📝 Split by BR tags, parts:', parts.length);
    const elements = [];
    
    parts.forEach((part, partIndex) => {
      console.log(`🔍 Processing part ${partIndex}:`, part.substring(0, 50) + '...');
      
      if (part.trim()) {
        // Check for heading tags
        if (part.match(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/i)) {
          const match = part.match(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/i);
          const level = parseInt(match[1]);
          const content = match[2].replace(/<[^>]*>/g, ''); // Remove any other tags
          
          console.log(`🏷️ Found H${level} heading:`, content);
          
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
          console.log('📄 Processing regular text with formatting...');
          // Handle other formatting tags
          let processedText = part;
          const textElements = [];
          
          // Split by bold tags
          const boldParts = processedText.split(/(<b[^>]*>.*?<\/b>|<strong[^>]*>.*?<\/strong>)/i);
          console.log('💪 Bold parts:', boldParts.length);
          
          boldParts.forEach((boldPart, boldIndex) => {
            if (boldPart.match(/<(b|strong)[^>]*>(.*?)<\/(b|strong)>/i)) {
              const boldMatch = boldPart.match(/<(b|strong)[^>]*>(.*?)<\/(b|strong)>/i);
              const boldContent = boldMatch[2];
              console.log('💪 Found bold text:', boldContent);
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
                console.log('📝 Found regular text:', cleanText.substring(0, 30) + '...');
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
        console.log('🔄 Adding line break');
        elements.push(
          <Text key={`br-${partIndex}`} style={baseStyle}>
            {'\n'}
          </Text>
        );
      }
    });
    
    console.log('✅ Parsing complete, total elements:', elements.length);
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
    
    console.log('🔄 Falling back to clean text:', cleanText.substring(0, 50) + '...');
    return <Text style={baseStyle}>{cleanText}</Text>;
  }
};

const DirectHTMLTest = () => {
  // Test the exact HTML from your form data
  const testHTML1 = '<h2>Which type of investor are you?</h2>';
  const testHTML2 = '<h5>The UK Financial Conduct Authority (FCA) requires that we ask you some additional questions to better understand your financial circumstances and serve you.<br><br>The FCA prescribes three investor categories.</h5>';
  
  useEffect(() => {
    console.log('🚀 DirectHTMLTest component mounted');
    console.log('🧪 Testing HTML rendering...');
  }, []);

  return (
    <View style={{ padding: 20, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Direct HTML Test
      </Text>
      
      <Text style={{ marginBottom: 10 }}>Test 1 - H2 Tag:</Text>
      {renderHtmlText(testHTML1, { fontSize: 14, color: '#333' })}
      
      <Text style={{ marginTop: 20, marginBottom: 10 }}>Test 2 - H5 with BR:</Text>
      {renderHtmlText(testHTML2, { fontSize: 14, color: '#333' })}
      
      <Text style={{ marginTop: 20, fontSize: 12, color: '#666' }}>
        Check the console for detailed logging output.
      </Text>
    </View>
  );
};

export default DirectHTMLTest;