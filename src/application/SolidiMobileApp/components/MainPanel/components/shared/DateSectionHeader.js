import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

/**
 * Date Section Header Component
 * Displays a date header for grouped transactions/orders
 */
const DateSectionHeader = ({ date }) => {
  return (
    <View style={{ 
      paddingVertical: 12,
      paddingHorizontal: 4,
      marginTop: 8,
      marginBottom: 4
    }}>
      <Text style={{ 
        fontSize: 16, 
        fontWeight: '700', 
        color: '#1f2937',
        letterSpacing: 0.3
      }}>
        {date}
      </Text>
    </View>
  );
};

export default DateSectionHeader;
