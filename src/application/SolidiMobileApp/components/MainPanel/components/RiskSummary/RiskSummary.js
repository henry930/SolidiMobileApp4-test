// React imports
import React, { useContext } from 'react';
import { 
  Text, 
  StyleSheet, 
  View, 
  ScrollView,
  TouchableOpacity 
} from 'react-native';
import { Title, Card } from 'react-native-paper';

// Internal imports
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { colors } from 'src/constants';
import AppStateContext from 'src/application/data';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('RiskSummary');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let RiskSummary = () => {
  let appState = useContext(AppStateContext);

  let goBack = () => {
    console.log('[RiskSummary] I Understand button clicked - closing page');
    // Use goBack to return to previous page
    if (appState.goBack) {
      appState.goBack();
    } else {
      // Fallback: navigate to Home if goBack is not available
      console.log('[RiskSummary] goBack not available, navigating to Home');
      appState.setMainPanelState({
        mainPanelState: 'Home',
        pageName: 'default'
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Title style={styles.title}>Risk Summary</Title>
      </View>

      {/* Risk Content */}
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        
        {/* Reading Time */}
        <View style={styles.readingTimeContainer}>
          <Text style={styles.readingTime}>Estimated reading time: 2 min</Text>
        </View>
        {/* Key Risks Section */}
        <Text style={styles.sectionTitle}>What are the key risks?</Text>

        {/* Risk 1 */}
        <Card style={styles.riskCard}>
          <Card.Content>
            <Text style={styles.riskNumber}>1. You could lose all the money you invest</Text>
            <Text style={styles.riskDescription}>
              The performance of most cryptoassets can be highly volatile, with their value dropping as quickly as it can rise. You should be prepared to lose all the money you invest in cryptoassets.
            </Text>
            <Text style={styles.riskDescription}>
              The cryptoasset market is largely unregulated. There is a risk of losing money or any cryptoassets you purchase due to risks such as cyber-attacks, financial crime and firm failure.
            </Text>
          </Card.Content>
        </Card>

        {/* Risk 2 */}
        <Card style={styles.riskCard}>
          <Card.Content>
            <Text style={styles.riskNumber}>2. You should not expect to be protected if something goes wrong</Text>
            <Text style={styles.riskDescription}>
              The Financial Services Compensation Scheme (FSCS) doesn't protect this type of investment because it's not a 'specified investment' under the UK regulatory regime – in other words, this type of investment isn't recognised as the sort of investment that the FSCS can protect. Learn more by using the FSCS investment protection checker here.
            </Text>
            <Text style={styles.riskDescription}>
              The Financial Ombudsman Service (FOS) will not be able to consider complaints related to this firm. Learn more about FOS protection here.
            </Text>
          </Card.Content>
        </Card>

        {/* Risk 3 */}
        <Card style={styles.riskCard}>
          <Card.Content>
            <Text style={styles.riskNumber}>3. You may not be able to sell your investment when you want to</Text>
            <Text style={styles.riskDescription}>
              There is no guarantee that investments in cryptoassets can be easily sold at any given time. The ability to sell a cryptoasset depends on various factors, including the supply and demand in the market at that time.
            </Text>
            <Text style={styles.riskDescription}>
              Operational failings such as technology outages, cyber-attacks and comingling of funds could cause unwanted delay and you may be unable to sell your cryptoassets at the time you want.
            </Text>
          </Card.Content>
        </Card>

        {/* Risk 4 */}
        <Card style={styles.riskCard}>
          <Card.Content>
            <Text style={styles.riskNumber}>4. Cryptoasset investments can be complex</Text>
            <Text style={styles.riskDescription}>
              Investments in cryptoassets can be complex, making it difficult to understand the risks associated with the investment.
            </Text>
            <Text style={styles.riskDescription}>
              You should do your own research before investing. If something sounds too good to be true, it probably is.
            </Text>
          </Card.Content>
        </Card>

        {/* Risk 5 */}
        <Card style={styles.riskCard}>
          <Card.Content>
            <Text style={styles.riskNumber}>5. Don't put all your eggs in one basket</Text>
            <Text style={styles.riskDescription}>
              Putting all your money into a single type of investment is risky. Spreading your money across different investments makes you less dependent on any one to do well.
            </Text>
            <Text style={styles.riskDescription}>
              A good rule of thumb is not to invest more than 10% of your money in high-risk investments.
            </Text>
          </Card.Content>
        </Card>

        {/* Footer Information */}
        <Card style={styles.footerCard}>
          <Card.Content>
            <Text style={styles.footerText}>
              If you are interested in learning more about how to protect yourself, visit the FCA's website here.
            </Text>
            <Text style={styles.footerText}>
              For further information about cryptoassets, visit the FCA's website.
            </Text>
          </Card.Content>
        </Card>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Close Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.closeButtonLarge} onPress={goBack}>
          <Text style={styles.closeButtonText}>I Understand</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.defaultBackground,
  },
  header: {
    paddingHorizontal: scaledWidth(20),
    paddingVertical: scaledHeight(15),
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    alignItems: 'center',
  },
  title: {
    fontSize: normaliseFont(20),
    fontWeight: '600',
    color: colors.text,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: scaledWidth(20),
  },
  readingTimeContainer: {
    marginBottom: scaledHeight(16),
    alignItems: 'center',
  },
  readingTime: {
    fontSize: normaliseFont(14),
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  warningCard: {
    backgroundColor: '#ffe6e6',
    marginBottom: scaledHeight(20),
    elevation: 2,
  },
  warningText: {
    fontSize: normaliseFont(16),
    color: '#d32f2f',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: normaliseFont(18),
    fontWeight: '700',
    color: colors.text,
    marginBottom: scaledHeight(16),
    marginTop: scaledHeight(8),
  },
  riskCard: {
    backgroundColor: colors.white,
    marginBottom: scaledHeight(12),
    elevation: 1,
  },
  riskNumber: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: colors.primary,
    marginBottom: scaledHeight(8),
  },
  riskDescription: {
    fontSize: normaliseFont(14),
    color: colors.text,
    lineHeight: 20,
    marginBottom: scaledHeight(8),
  },
  footerCard: {
    backgroundColor: '#f0f8ff',
    marginTop: scaledHeight(16),
    elevation: 1,
  },
  footerText: {
    fontSize: normaliseFont(14),
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: scaledHeight(8),
  },
  buttonContainer: {
    padding: scaledWidth(20),
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  closeButtonLarge: {
    backgroundColor: colors.primary,
    paddingVertical: scaledHeight(12),
    paddingHorizontal: scaledWidth(20),
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: colors.white,
  },
});

export default RiskSummary;