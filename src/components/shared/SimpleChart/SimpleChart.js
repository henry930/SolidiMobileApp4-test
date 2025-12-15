import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, Text } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Text as SvgText, Rect } from 'react-native-svg';

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
  backgroundColor = 'transparent',
  onPointSelected = null  // Callback when user touches the graph
}) => {

  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    console.log('[CHART] 🟢 SimpleChart MOUNTED');
    return () => console.log('[CHART] 🔴 SimpleChart UNMOUNTED');
  }, []);

  // Log what data we receive (only once when data changes)
  useMemo(() => {
    console.log('[CHART] 📊 Data received:', data.length, 'points');
    if (data.length > 0) {
      console.log('[CHART] 📊 First value:', data[0]?.value);
      console.log('[CHART] 📊 Last value:', data[data.length - 1]?.value);
    }
  }, [data]);

  // Memoize calculations so graph doesn't recalculate when selectedIndex changes
  const chartCalculations = useMemo(() => {
    console.log('[CHART] 🔄 Recalculating chart (this should ONLY happen when data changes)');

    // Use the actual data passed in - no mock data
    const chartData = data;

    // If no data, return empty chart
    if (data.length === 0) {
      return {
        chartData: [],
        padding: 5,
        chartWidth: width - 10,
        chartHeight: height - 10,
        values: [],
        minValue: 0,
        maxValue: 0,
        valueRange: 0,
        chartPoints: []
      };
    }

    // Calculate chart dimensions
    const padding = 5;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    // Find min and max values for scaling
    const values = chartData.map(item => item.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;

    // Generate points for the line
    const chartPoints = chartData.map((item, index) => {
      const x = padding + (index / (chartData.length - 1)) * chartWidth;
      let y;

      if (valueRange === 0) {
        // All values are the same - draw line in the middle
        y = padding + chartHeight / 2;
      } else {
        y = padding + chartHeight - ((item.value - minValue) / valueRange) * chartHeight;
      }

      return { x, y };
    });

    // Find indices of highest and lowest values
    const maxIndex = values.indexOf(maxValue);
    const minIndex = values.indexOf(minValue);

    return {
      chartData,
      padding,
      chartWidth,
      chartHeight,
      values,
      minValue,
      maxValue,
      valueRange,
      chartPoints,
      maxIndex,
      minIndex
    };
  }, [data, width, height]); // Only recalculate when data, width, or height changes

  const { chartData, padding, chartWidth, chartHeight, values, minValue, maxValue, valueRange, chartPoints, maxIndex, minIndex } = chartCalculations;

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

  // Create smooth path (memoized to avoid recalculation on touch)
  const smoothLinePath = useMemo(() => createSmoothPath(chartPoints), [chartPoints]);

  // Generate points for the area fill
  const areaPath = smoothLinePath + ` L ${padding + chartWidth} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`;

  // Calculate current value and change
  const currentValue = values[values.length - 1];
  const previousValue = values[0];
  const change = currentValue - previousValue;
  const isPositive = change >= 0;

  // Create PanResponder for touch handling
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      handleTouch(evt.nativeEvent.locationX);
    },
    onPanResponderMove: (evt) => {
      handleTouch(evt.nativeEvent.locationX);
    },
    onPanResponderRelease: () => {
      // Reset to current day when touch ends
      setSelectedIndex(null);
      if (onPointSelected) {
        onPointSelected(null); // Reset to current values
      }
    }
  });

  // Handle touch to find nearest data point
  const handleTouch = (touchX) => {
    if (chartData.length === 0) return;

    // Find the nearest data point index based on touch X position
    const relativeX = touchX - padding;
    const normalizedX = Math.max(0, Math.min(1, relativeX / chartWidth));
    const index = Math.round(normalizedX * (chartData.length - 1));

    setSelectedIndex(index);

    // Notify parent component with selected data point
    if (onPointSelected && chartData[index]) {
      onPointSelected({
        index: index,
        value: chartData[index].value,
        timestamp: chartData[index].timestamp,
        daysAgo: chartData.length - 1 - index
      });
    }
  };

  return (
    <View
      style={[styles.container, { width, height, backgroundColor }]}
      {...panResponder.panHandlers}
    >
      {/* Highest value label - positioned to the right of the point */}
      {chartData.length > 0 && maxIndex >= 0 && chartPoints[maxIndex] && valueRange > 0 && (
        <View style={{
          position: 'absolute',
          left: Math.min(chartPoints[maxIndex].x + 10, width - 70),
          top: Math.max(chartPoints[maxIndex].y - 10, 5),
          backgroundColor: 'rgba(76, 175, 80, 0.95)',
          paddingHorizontal: 5,
          paddingVertical: 2,
          borderRadius: 3,
          zIndex: 10
        }}>
          <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>
            H: £{maxValue.toFixed(0)}
          </Text>
        </View>
      )}

      {/* Lowest value label - positioned to the right of the point */}
      {chartData.length > 0 && minIndex >= 0 && chartPoints[minIndex] && valueRange > 0 && maxIndex !== minIndex && (
        <View style={{
          position: 'absolute',
          left: Math.min(chartPoints[minIndex].x + 10, width - 70),
          top: Math.min(chartPoints[minIndex].y - 10, height - 25),
          backgroundColor: 'rgba(244, 67, 54, 0.95)',
          paddingHorizontal: 5,
          paddingVertical: 2,
          borderRadius: 3,
          zIndex: 10
        }}>
          <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>
            L: £{minValue.toFixed(0)}
          </Text>
        </View>
      )}

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

        {/* Highest value marker */}
        {chartData.length > 0 && maxIndex >= 0 && chartPoints[maxIndex] && valueRange > 0 && (
          <Circle
            cx={chartPoints[maxIndex].x}
            cy={chartPoints[maxIndex].y}
            r="5"
            fill="#4CAF50"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        )}

        {/* Lowest value marker */}
        {chartData.length > 0 && minIndex >= 0 && chartPoints[minIndex] && valueRange > 0 && maxIndex !== minIndex && (
          <Circle
            cx={chartPoints[minIndex].x}
            cy={chartPoints[minIndex].y}
            r="5"
            fill="#F44336"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        )}

        {/* Selected point indicator (when touching) */}
        {selectedIndex !== null && chartPoints[selectedIndex] && (
          <Circle
            cx={chartPoints[selectedIndex].x}
            cy={chartPoints[selectedIndex].y}
            r="6"
            fill={strokeColor}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        )}

        {/* End point indicator (default) */}
        {chartData.length > 0 && selectedIndex === null && (
          <Circle
            cx={padding + chartWidth}
            cy={valueRange === 0
              ? padding + chartHeight / 2
              : padding + chartHeight - ((values[values.length - 1] - minValue) / valueRange) * chartHeight
            }
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

// Wrap with React.memo to prevent unnecessary re-renders when parent updates
export default React.memo(SimpleChart, (prevProps, nextProps) => {
  // Only re-render if data, width, height, or colors change
  // Don't re-render if only onPointSelected changes
  return (
    prevProps.data === nextProps.data &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.strokeColor === nextProps.strokeColor &&
    prevProps.fillColor === nextProps.fillColor &&
    prevProps.strokeWidth === nextProps.strokeWidth &&
    prevProps.backgroundColor === nextProps.backgroundColor
  );
});