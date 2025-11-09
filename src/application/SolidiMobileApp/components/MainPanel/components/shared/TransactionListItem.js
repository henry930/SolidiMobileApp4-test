import React from 'react';
import { View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Shared Transaction/Order List Item Component
 * Used by Home and History to display transactions and orders consistently
 */
const TransactionListItem = ({ 
  transaction, 
  index,
  onPress,
  compact = false, // Home uses compact version, History uses full version
  itemType = 'transaction' // 'transaction' or 'order'
}) => {
  // Validate transaction object
  if (!transaction || typeof transaction !== 'object') {
    console.log(`❌ Invalid ${itemType} object at index ${index}:`, transaction);
    return null;
  }

  try {
    // Handle Order type items
    if (itemType === 'order') {
      const orderID = transaction.id || `order-${index}`;
      const market = transaction.market || 'UNKNOWN/UNKNOWN';
      const orderSide = transaction.side || 'UNKNOWN';
      const baseAsset = transaction.parsedMarket?.baseAsset || transaction.market?.split('/')[0] || 'BTC';
      const quoteAsset = transaction.parsedMarket?.quoteAsset || transaction.market?.split('/')[1] || 'GBP';
      const baseVolume = transaction.baseVolume || '0';
      const quoteVolume = transaction.quoteVolume || '0';
      const orderStatus = transaction.status || 'UNKNOWN';
      const orderDate = transaction.date || 'Unknown';
      const orderTime = transaction.time || '00:00:00';
      const orderType = transaction.type || 'UNKNOWN';
      
      const isBuy = orderSide === 'BUY';
      const iconName = isBuy ? 'trending-up' : 'trending-down';
      
      const orderColors = isBuy ? {
        primary: '#10b981',
        background: '#ecfdf5',
        text: '#047857'
      } : {
        primary: '#ef4444',
        background: '#fef2f2',
        text: '#dc2626'
      };
      
      return (
        <Card 
          key={`order-${orderID}`}
          style={{ 
            marginBottom: 12, 
            borderRadius: 12,
            elevation: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            backgroundColor: '#ffffff',
            borderLeftWidth: 3,
            borderLeftColor: orderColors.primary
          }}
          onPress={onPress}
        >
          <Card.Content style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 20, 
                  backgroundColor: orderColors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: orderColors.primary + '40'
                }}>
                  <Icon 
                    name={iconName} 
                    size={20} 
                    color={orderColors.primary} 
                  />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 2 }}>
                    {orderSide} {baseAsset}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>
                    {market} • {orderType}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#999999' }}>
                    {orderDate} • {orderTime}
                  </Text>
                </View>
              </View>
              
              <View style={{ alignItems: 'flex-end' }}>
                {/* Show GBP (quote) as primary if available */}
                {quoteVolume !== '0' && quoteAsset === 'GBP' ? (
                  <>
                    <Text style={{ 
                      fontSize: 16, 
                      fontWeight: '600', 
                      color: orderColors.text,
                      marginBottom: 2
                    }}>
                      £{quoteVolume}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>
                      {baseVolume} {baseAsset}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={{ 
                      fontSize: 14, 
                      fontWeight: '600', 
                      color: orderColors.text,
                      marginBottom: 2
                    }}>
                      {baseVolume} {baseAsset}
                    </Text>
                    {quoteVolume !== '0' && (
                      <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>
                        {quoteVolume} {quoteAsset}
                      </Text>
                    )}
                  </>
                )}
                <Text style={{ fontSize: 11, color: '#999999' }}>
                  {orderStatus}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      );
    }
    
    // Extract transaction data
    const txnDate = transaction.date;
    const txnTime = transaction.time;
    const txnCode = transaction.code;
    const baseAsset = transaction.baseAsset;
    const baseAssetVolume = transaction.baseAssetVolume;
    const description = transaction.description || transaction.type;
    const status = transaction.status;
    const reference = transaction.parsedReference || transaction.reference;
    
    // Determine transaction type and icon
    const isIncoming = ['PI', 'FI', 'BY'].includes(txnCode) || description?.includes('In');
    const isOutgoing = ['PO', 'FO', 'SL'].includes(txnCode) || description?.includes('Out');
    
    let transactionTypeDisplay = description || 'Transaction';
    let iconName = transaction.icon || 'swap-horizontal';
    
    if (isIncoming && !transaction.icon) {
      iconName = 'arrow-down-circle';
    } else if (isOutgoing && !transaction.icon) {
      iconName = 'arrow-up-circle';
    }
    
    // Format amount with proper precision
    let amountDisplay = '';
    if (baseAssetVolume && baseAsset) {
      try {
        const Big = require('big.js');
        let volume = Big(baseAssetVolume);
        
        // Format to 9 significant digits
        let formatted;
        if (volume.eq(0)) {
          formatted = '0';
        } else if (volume.abs().gte(1)) {
          formatted = volume.toPrecision(9).replace(/\.?0+$/, '');
        } else {
          formatted = volume.toFixed(8).replace(/\.?0+$/, '');
        }
        
        amountDisplay = `${isIncoming ? '+' : '-'}${formatted} ${baseAsset}`;
      } catch (err) {
        amountDisplay = `${isIncoming ? '+' : '-'}${baseAssetVolume} ${baseAsset}`;
      }
    }
    
    // Format GBP value if available
    let gbpValueDisplay = '';
    if (transaction.quoteAssetVolume && transaction.quoteAsset === 'GBP') {
      const gbpAmount = parseFloat(transaction.quoteAssetVolume);
      if (!isNaN(gbpAmount)) {
        // Format to 9 significant digits
        try {
          const Big = require('big.js');
          let value = Big(gbpAmount);
          let formatted;
          if (value.eq(0)) {
            formatted = '0';
          } else if (value.abs().gte(1)) {
            formatted = value.toPrecision(9).replace(/\.?0+$/, '');
          } else {
            formatted = value.toFixed(8).replace(/\.?0+$/, '');
          }
          gbpValueDisplay = `£${formatted}`;
        } catch (err) {
          gbpValueDisplay = `£${gbpAmount.toFixed(2)}`;
        }
      }
    }
    
    // Status display
    const statusDisplay = status === 'A' ? 'Completed' : (status || 'Pending');
    
    // Color scheme for payment direction
    const currentColors = isIncoming ? {
      primary: '#10b981',
      background: '#ecfdf5',
      text: '#047857'
    } : isOutgoing ? {
      primary: '#ef4444',
      background: '#fef2f2',
      text: '#dc2626'
    } : {
      primary: '#6b7280',
      background: '#f9fafb',
      text: '#374151'
    };
    
    // Compact version (for Home page)
    if (compact) {
      return (
        <Card 
          key={`transaction-${transaction.id || index}`}
          style={{ 
            marginBottom: 8, 
            borderRadius: 12,
            elevation: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            backgroundColor: '#ffffff',
            borderLeftWidth: 3,
            borderLeftColor: currentColors.primary
          }}
          onPress={onPress}
        >
          <Card.Content style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 20, 
                  backgroundColor: currentColors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: currentColors.primary + '40'
                }}>
                  <Icon 
                    name={iconName} 
                    size={20} 
                    color={currentColors.primary} 
                  />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 2 }}>
                    {transactionTypeDisplay}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    {txnDate} • {txnTime}
                  </Text>
                </View>
              </View>
              
              <View style={{ alignItems: 'flex-end' }}>
                {/* Show GBP as primary (larger) */}
                {gbpValueDisplay ? (
                  <>
                    <Text style={{ 
                      fontSize: 16, 
                      fontWeight: '600', 
                      color: currentColors.text,
                      marginBottom: 2
                    }}>
                      {gbpValueDisplay}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                      {amountDisplay}
                    </Text>
                  </>
                ) : (
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '600', 
                    color: currentColors.text,
                    marginBottom: 2
                  }}>
                    {amountDisplay}
                  </Text>
                )}
              </View>
            </View>
          </Card.Content>
        </Card>
      );
    }
    
    // Full version (for History page) - now using same sizes as compact
    return (
      <Card 
        key={`transaction-${transaction.id || index}`}
        style={{ 
          marginBottom: 12, 
          borderRadius: 12,
          elevation: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          backgroundColor: '#ffffff',
          borderLeftWidth: 3,
          borderLeftColor: currentColors.primary
        }}
        onPress={onPress}
      >
        <Card.Content style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 20, 
                backgroundColor: currentColors.background,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
                borderWidth: 1,
                borderColor: currentColors.primary + '40'
              }}>
                <Icon 
                  name={iconName} 
                  size={20} 
                  color={currentColors.primary} 
                />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text 
                  style={{ 
                    fontWeight: '600', 
                    fontSize: 14,
                    color: '#1f2937',
                    marginBottom: 2
                  }}
                >
                  {transactionTypeDisplay}
                </Text>
                <Text 
                  style={{ 
                    color: '#6b7280',
                    fontSize: 12,
                    marginBottom: 2
                  }}
                >
                  {txnDate} • {txnTime}
                </Text>
                {reference && (
                  <Text 
                    style={{ 
                      color: '#999999',
                      fontSize: 11
                    }}
                  >
                    Ref: {reference}
                  </Text>
                )}
              </View>
            </View>
            
            <View style={{ alignItems: 'flex-end' }}>
              {/* Show GBP as primary (larger) */}
              {gbpValueDisplay ? (
                <>
                  <Text 
                    style={{ 
                      fontWeight: '600',
                      fontSize: 16,
                      color: currentColors.text,
                      marginBottom: 2
                    }}
                  >
                    {gbpValueDisplay}
                  </Text>
                  <Text 
                    style={{ 
                      color: '#6b7280',
                      fontSize: 12,
                      marginBottom: 2
                    }}
                  >
                    {amountDisplay}
                  </Text>
                </>
              ) : (
                <Text 
                  style={{ 
                    fontWeight: '600',
                    fontSize: 14,
                    color: currentColors.text,
                    marginBottom: 2
                  }}
                >
                  {amountDisplay}
                </Text>
              )}
              <Text 
                style={{ 
                  color: '#999999',
                  fontSize: 11
                }}
              >
                {statusDisplay}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  } catch (error) {
    console.log(`❌ Error rendering transaction ${index}:`, error);
    return null;
  }
};

export default TransactionListItem;
