// Simple Chart Component for debugging
import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const SimpleChart = ({ data, title, asset, period, showTitle = false, showSubtitle = false, transparent = false, cardBackgroundColor = '#ffffff' }) => {
  const screenWidth = Dimensions.get('window').width;
  const [hoverData, setHoverData] = useState(null);
  
  console.log('📊 SimpleChart Debug:', {
    title,
    asset,
    period,
    dataType: typeof data,
    isArray: Array.isArray(data),
    dataLength: data ? data.length : 0,
    sampleData: data ? data.slice(0, 5) : [],
    allData: data
  });

  // Ensure we have valid data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title || 'Price Chart'}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No chart data available</Text>
          <Text style={styles.debugText}>
            Data: {data ? `Array with ${data.length} items` : 'null/undefined'}
          </Text>
        </View>
      </View>
    );
  }

  // Filter out invalid values and ensure we have numbers
  const validData = data
    .map(item => {
      if (typeof item === 'number') return item;
      if (typeof item === 'string') {
        const parsed = parseFloat(item);
        return isNaN(parsed) ? null : parsed;
      }
      if (typeof item === 'object' && item !== null) {
        return parseFloat(item.price || item.value || item.close) || null;
      }
      return null;
    })
    .filter(item => item !== null && item > 0);

  console.log('📊 SimpleChart Processed Data:', {
    originalLength: data.length,
    validLength: validData.length,
    minValue: Math.min(...validData),
    maxValue: Math.max(...validData),
    validSample: validData.slice(0, 5)
  });

  // If still no valid data, show error
  if (validData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title || 'Price Chart'}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No valid price data found</Text>
          <Text style={styles.debugText}>
            Original data contained no valid numbers
          </Text>
        </View>
      </View>
    );
  }

  // Generate time-based labels
  const generateTimeLabels = (dataLength, period) => {
    const labels = [];
    const now = new Date();
    
    for (let i = 0; i < dataLength; i++) {
      let timeLabel = '';
      
      if (period === '1H') {
        // Show every 10-15 minutes for 1 hour
        const minutesAgo = Math.floor((dataLength - 1 - i) * (60 / dataLength));
        timeLabel = i % Math.max(1, Math.floor(dataLength / 4)) === 0 ? 
          `${Math.max(0, 60 - minutesAgo)}m` : '';
      } else if (period === '2H') {
        // Show every 30 minutes for 2 hours
        const minutesAgo = Math.floor((dataLength - 1 - i) * (120 / dataLength));
        timeLabel = i % Math.max(1, Math.floor(dataLength / 4)) === 0 ? 
          `${Math.max(0, 120 - minutesAgo)}m` : '';
      } else if (period === '1D') {
        // Show every 6 hours for 1 day
        const hoursAgo = Math.floor((dataLength - 1 - i) * (24 / dataLength));
        timeLabel = i % Math.max(1, Math.floor(dataLength / 4)) === 0 ? 
          `${Math.max(0, 24 - hoursAgo)}h` : '';
      } else if (period === '1W') {
        // Show days for 1 week
        const daysAgo = Math.floor((dataLength - 1 - i) * (7 / dataLength));
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const targetDay = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        timeLabel = i % Math.max(1, Math.floor(dataLength / 7)) === 0 ? 
          dayNames[targetDay.getDay()] : '';
      } else if (period === '1M') {
        // Show weeks for 1 month
        const weeksAgo = Math.floor((dataLength - 1 - i) * (4 / dataLength));
        timeLabel = i % Math.max(1, Math.floor(dataLength / 4)) === 0 ? 
          `W${Math.max(1, 4 - weeksAgo)}` : '';
      } else {
        // Default: show every few points
        timeLabel = i % Math.max(1, Math.floor(dataLength / 4)) === 0 ? i.toString() : '';
      }
      
      labels.push(timeLabel);
    }
    
    return labels;
  };

  const labels = generateTimeLabels(validData.length, period);

  // Ensure we have at least 2 data points for the chart
  const chartData = validData.length < 2 ? [validData[0] || 100, validData[0] || 100] : validData;
  const chartLabels = chartData.length < 2 ? ['Start', 'End'] : labels;
  
  // If we still don't have valid data, create dummy data
  if (chartData.length === 0 || chartData.every(val => val === null || val === undefined)) {
    return (
      <View style={styles.container}>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No chart data available</Text>
          <Text style={styles.debugText}>
            Unable to render chart - no valid price data
          </Text>
        </View>
      </View>
    );
  }
  
  // Calculate min and max for y-axis
  const minValue = Math.min(...chartData);
  const maxValue = Math.max(...chartData);
  const yAxisMin = minValue * 0.99; // Add small padding
  const yAxisMax = maxValue * 1.01;

  const lineChartData = {
    labels: chartLabels,
    datasets: [
      {
        data: chartData,
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
      }
    ]
  };

  // Custom Y-axis configuration for min/max only
  const formatYLabel = (value) => {
    if (Math.abs(value - minValue) < Math.abs(value - maxValue)) {
      return `£${minValue.toFixed(0)}`;
    } else {
      return `£${maxValue.toFixed(0)}`;
    }
  };

  const backgroundColor = transparent ? cardBackgroundColor : '#ffffff';

  return (
    <View style={[styles.container, transparent ? { backgroundColor: 'transparent' } : { backgroundColor }]}>
      {showTitle && (
        <Text style={styles.title}>{title || `${asset} Price Chart (${period})`}</Text>
      )}
      {showSubtitle && (
        <Text style={styles.subtitle}>
          {validData.length} data points • Range: £{Math.min(...validData).toFixed(2)} - £{Math.max(...validData).toFixed(2)}
        </Text>
      )}
      
      {/* Hover data display */}
      {hoverData && (
        <View style={styles.hoverContainer}>
          <Text style={styles.hoverText}>
            Price: £{hoverData.value?.toFixed(2)} • Time: {hoverData.label}
          </Text>
        </View>
      )}
      
      <LineChart
        data={lineChartData}
        width={screenWidth - 64}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        yAxisInterval={1}
        segments={1}
        formatYLabel={formatYLabel}
        chartConfig={{
          backgroundColor: backgroundColor,
          backgroundGradientFrom: backgroundColor,
          backgroundGradientTo: backgroundColor,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(97, 97, 97, ${opacity})`,
          style: {
            borderRadius: 0
          },
          propsForDots: {
            r: "0",
            strokeWidth: "0",
            stroke: "transparent"
          }
        }}
        bezier
        style={[styles.chart, { backgroundColor: backgroundColor }]}
        withInnerLines={false}
        withOuterLines={false}
        withHorizontalLines={true}
        withVerticalLines={false}
        fromZero={false}
        withDots={false}
        onDataPointClick={(data) => {
          setHoverData({
            value: data.value,
            label: chartLabels[data.index] || 'N/A',
            index: data.index
          });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  hoverContainer: {
    position: 'absolute',
    top: 8,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1000,
  },
  hoverText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  chart: {
    marginVertical: 0,
    borderRadius: 0,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 0,
    marginHorizontal: 16,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SimpleChart;