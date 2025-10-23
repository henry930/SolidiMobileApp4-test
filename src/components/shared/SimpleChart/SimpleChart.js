import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

/**
 * SimpleChart - A basic line chart component for showing asset value changes
 * Shows the difference in asset values over time (monthly data)
 */
const SimpleChart = ({ 
  data = [], 
  width = screenWidth - 40, 
  height = 120,
  strokeColor = '#4CAF50',
  fillColor = 'rgba(76, 175, 80, 0.1)',
  strokeWidth = 2,
  backgroundColor = 'transparent'
}) => {
  
  // Helper function to create smooth curve path
  const createSmoothPath = (points) => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const previous = points[i - 1];
      
      if (i === 1) {
        // First curve
        const next = points[i + 1] || current;
        const cpx1 = previous.x + (current.x - previous.x) * 0.3;
        const cpy1 = previous.y;
        const cpx2 = current.x - (next.x - previous.x) * 0.2;
        const cpy2 = current.y;
        path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${current.x} ${current.y}`;
      } else if (i === points.length - 1) {
        // Last curve
        const cpx1 = previous.x + (current.x - previous.x) * 0.7;
        const cpy1 = previous.y;
        const cpx2 = current.x;
        const cpy2 = current.y;
        path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${current.x} ${current.y}`;
      } else {
        // Middle curves
        const next = points[i + 1];
        const prev = points[i - 2] || previous;
        
        const cpx1 = previous.x + (current.x - prev.x) * 0.2;
        const cpy1 = previous.y + (current.y - prev.y) * 0.2;
        const cpx2 = current.x - (next.x - previous.x) * 0.2;
        const cpy2 = current.y - (next.y - previous.y) * 0.2;
        
        path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${current.x} ${current.y}`;
      }
    }
    
    return path;
  };
  
  if (data.length === 0) {
    // Generate mock data for demonstration
    const mockData = [
      { value: 10000, date: '2025-09-01' },
      { value: 10200, date: '2025-09-08' },
      { value: 9800, date: '2025-09-15' },
      { value: 11000, date: '2025-09-22' },
      { value: 11500, date: '2025-09-29' },
      { value: 12000, date: '2025-10-06' },
      { value: 11800, date: '2025-10-13' },
      { value: 12345, date: '2025-10-20' }
    ];
    data = mockData;
  }

  // Calculate chart dimensions
  const padding = 10; // Add padding to prevent cutoff
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  // Find min and max values for scaling
  const values = data.map(item => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;

  // Generate points for the line
  const chartPoints = data.map((item, index) => ({
    x: padding + (index / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - ((item.value - minValue) / valueRange) * chartHeight
  }));

  // Create smooth path
  const smoothLinePath = createSmoothPath(chartPoints);

  // Generate points for the area fill
  const areaPath = smoothLinePath + ` L ${padding + chartWidth} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`;

  // Calculate current value and change
  const currentValue = values[values.length - 1];
  const previousValue = values[0];
  const change = currentValue - previousValue;
  const isPositive = change >= 0;

  return (
    <View style={[styles.container, { width, height, backgroundColor }]}>
      <Svg width={width} height={height}>
        <Defs>
          {/* Gradient temporarily disabled */}
          {/*
          <LinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%" gradientUnits="objectBoundingBox">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
            <Stop offset="50%" stopColor={strokeColor} stopOpacity="0.2" />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </LinearGradient>
          */}
        </Defs>
        
        {/* Area fill under the line - conditional rendering */}
        {fillColor && fillColor !== 'transparent' && (
          <Path
            d={areaPath}
            fill={fillColor}
            stroke="none"
          />
        )}
        
        {/* Main smooth line */}
        <Path
          d={smoothLinePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* End point indicator */}
        {data.length > 0 && (
          <Circle
            cx={padding + chartWidth}
            cy={padding + chartHeight - ((values[values.length - 1] - minValue) / valueRange) * chartHeight}
            r="4"
            fill={strokeColor}
            stroke="none"
            strokeWidth="0"
          />
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderRadius: 12,
    overflow: 'hidden',
  }
});

export default SimpleChart;