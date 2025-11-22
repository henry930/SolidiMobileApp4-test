// React imports
import React, { useState, useContext, useEffect, useRef } from 'react';
import { 
  Text, 
  TextInput, 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Modal,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';

// Internal imports
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { colors } from 'src/constants';
import AppStateContext from 'src/application/data';

/**
 * VaspSearchModal - Full-screen modal for searching and selecting VASP (exchange)
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Whether modal is visible
 * @param {Function} props.onSelect - Callback when VASP is selected (receives VASP object)
 * @param {Function} props.onCancel - Callback when user cancels
 * @param {string} props.initialQuery - Initial search query
 */
const VaspSearchModal = ({ visible, onSelect, onCancel, initialQuery = '' }) => {
  const appState = useContext(AppStateContext);
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);
  
  // Add new exchange form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    vaspname: '',
    vaspurl: '',
    vaspdetails: ''
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery(initialQuery);
      if (initialQuery && initialQuery.trim().length >= 2) {
        searchVasp(initialQuery);
      }
    }
  }, [visible]);

  // Search VASP via API
  const searchVasp = async (query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔍 VASP search requested for:', query);

      // Ensure API client is available
      if (!appState || !appState.apiClient || typeof appState.apiClient.privateMethod !== 'function') {
        console.log('⚠️ API client not ready for VASP search, calling generalSetup...');
        if (appState && typeof appState.generalSetup === 'function') {
          try {
            await appState.generalSetup({ caller: 'VaspSearchModal' });
            console.log('✅ generalSetup finished for VASP search');
          } catch (gsErr) {
            console.error('❌ generalSetup failed for VASP search:', gsErr);
          }
        }
      }

      const apiRoute = `vasp/${encodeURIComponent(query.trim())}`;
      const abortController = appState && appState.createAbortController
        ? appState.createAbortController({ tag: 'vaspSearch' })
        : undefined;

      if (!appState || !appState.apiClient || typeof appState.apiClient.privateMethod !== 'function') {
        throw new Error('API client not available for VASP search');
      }

      const res = await appState.apiClient.privateMethod({ httpMethod: 'POST', apiRoute, params: {}, abortController });

      console.log('📨 VASP search response raw:', res);
      console.log('📨 VASP search response type:', typeof res);
      console.log('📨 VASP search response keys:', res ? Object.keys(res) : 'null');

      // Accept several common response shapes
      let list = [];
      if (Array.isArray(res)) {
        console.log('✓ Response is array, length:', res.length);
        list = res;
      } else if (res && Array.isArray(res.data)) {
        console.log('✓ Response has data array, length:', res.data.length);
        list = res.data;
      } else if (res && res.success && Array.isArray(res.items)) {
        console.log('✓ Response has items array, length:', res.items.length);
        list = res.items;
      } else {
        console.log('⚠️ Unknown response structure, attempting to extract data...');
        // Try to find any array in the response
        if (res) {
          for (const key of Object.keys(res)) {
            if (Array.isArray(res[key])) {
              console.log(`✓ Found array at res.${key}, length:`, res[key].length);
              list = res[key];
              break;
            }
          }
        }
      }

      console.log('📋 Raw list before normalization:', JSON.stringify(list, null, 2));

      // Normalize items
      list = (list || []).map((item, idx) => {
        console.log(`🔍 Normalizing item ${idx}:`, item);
        if (typeof item === 'string') {
          console.log(`  → String item, creating {id, name}`);
          return { id: item, name: item };
        }
        if (item && typeof item === 'object') {
          const normalized = {
            id: item.uuid || item.id || item.vaspId || item.vasp_id || `vasp_${idx}`,
            name: item.compgroup || item.name || item.vaspName || item.vasp_name || item.label || item.title || 'Unknown Exchange',
            url: item.url,
            country: item.country,
            ...item
          };
          console.log(`  → Object item, normalized:`, normalized);
          return normalized;
        }
        console.log(`  → Unknown item type:`, typeof item);
        return item;
      });

      console.log('✅ VASP search final processed list:', JSON.stringify(list, null, 2));
      setSuggestions(list);
      setError('');
    } catch (err) {
      console.error('❌ VASP search error:', err);
      setError(err?.message || 'Failed to search exchanges');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchQuery && searchQuery.trim().length >= 2) {
        searchVasp(searchQuery);
      } else {
        setSuggestions([]);
        setError('');
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleSelect = (vasp) => {
    console.log('✅ VASP selected:', vasp);
    onSelect(vasp);
  };

  const handleAddNew = () => {
    // Open the add form with pre-filled name
    setAddFormData({
      vaspname: searchQuery,
      vaspurl: '',
      vaspdetails: ''
    });
    setShowAddForm(true);
    setAddError('');
  };

  const handleAddFormCancel = () => {
    setShowAddForm(false);
    setAddFormData({ vaspname: '', vaspurl: '', vaspdetails: '' });
    setAddError('');
  };

  const handleAddFormSubmit = async () => {
    // Validate
    if (!addFormData.vaspname.trim()) {
      setAddError('Exchange name is required');
      return;
    }
    if (!addFormData.vaspurl.trim()) {
      setAddError('Exchange URL is required');
      return;
    }

    setAddLoading(true);
    setAddError('');

    try {
      console.log('🆕 Creating new VASP:', addFormData);

      // Ensure API client is available
      if (!appState || !appState.apiClient || typeof appState.apiClient.privateMethod !== 'function') {
        console.log('⚠️ API client not ready for VASP creation, calling generalSetup...');
        if (appState && typeof appState.generalSetup === 'function') {
          try {
            await appState.generalSetup({ caller: 'VaspSearchModal-Create' });
            console.log('✅ generalSetup finished for VASP creation');
          } catch (gsErr) {
            console.error('❌ generalSetup failed for VASP creation:', gsErr);
          }
        }
      }

      if (!appState || !appState.apiClient || typeof appState.apiClient.privateMethod !== 'function') {
        throw new Error('API client not available for VASP creation');
      }

      const params = {
        vaspname: addFormData.vaspname.trim(),
        vaspurl: addFormData.vaspurl.trim(),
        vaspdetails: addFormData.vaspdetails.trim()
      };

      const abortController = appState && appState.createAbortController
        ? appState.createAbortController({ tag: 'vaspCreate' })
        : undefined;

      const result = await appState.apiClient.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'vasp',
        params,
        abortController
      });

      console.log('✅ VASP created successfully:', result);

      // Return the created VASP
      const newVasp = {
        id: result.uuid || result.id || addFormData.vaspname,
        name: addFormData.vaspname,
        compgroup: addFormData.vaspname,
        url: addFormData.vaspurl,
        uuid: result.uuid || result.id,
        isNew: true
      };

      onSelect(newVasp);
    } catch (err) {
      console.error('❌ VASP creation error:', err);
      setAddError(err?.message || 'Failed to create exchange. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Exchange</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchLabel}>Exchange Name</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Type exchange name (e.g., Binance, Coinbase)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
            autoFocus={true}
          />
          <Text style={styles.searchHint}>Type at least 2 characters to search</Text>
        </View>

        {/* Results */}
        <ScrollView style={styles.resultsContainer} contentContainerStyle={styles.resultsContent}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Searching exchanges...</Text>
            </View>
          )}

          {!loading && error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => searchVasp(searchQuery)}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && !error && suggestions.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsSectionTitle}>
                Found {suggestions.length} exchange{suggestions.length !== 1 ? 's' : ''}:
              </Text>
              {suggestions.map((vasp, idx) => (
                <TouchableOpacity
                  key={vasp.id || vasp.name || idx}
                  style={styles.resultItem}
                  onPress={() => handleSelect(vasp)}
                >
                  <View style={styles.resultItemIcon}>
                    <Text style={styles.resultItemIconText}>🏢</Text>
                  </View>
                  <View style={styles.resultItemContent}>
                    <Text style={styles.resultItemName}>{vasp.name || vasp.label}</Text>
                    {vasp.country && (
                      <Text style={styles.resultItemDetail}>Country: {vasp.country}</Text>
                    )}
                    {vasp.id && (
                      <Text style={styles.resultItemDetail}>ID: {vasp.id}</Text>
                    )}
                  </View>
                  <Text style={styles.resultItemArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!loading && !error && suggestions.length === 0 && searchQuery.trim().length >= 2 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No exchanges found</Text>
              <Text style={styles.emptyText}>
                No exchanges matching "{searchQuery}" were found in our database.
              </Text>
              <TouchableOpacity 
                style={styles.addNewButton}
                onPress={handleAddNew}
              >
                <Text style={styles.addNewButtonText}>Add "{searchQuery}" as new exchange</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && !error && searchQuery.trim().length < 2 && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsIcon}>💡</Text>
              <Text style={styles.instructionsTitle}>How to search</Text>
              <Text style={styles.instructionsText}>
                Start typing the name of the exchange (e.g., "Binance", "Coinbase", "Kraken").
                {'\n\n'}
                We'll search our database and show you matching exchanges.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Add New Exchange Form Modal */}
        {showAddForm && (
          <View style={styles.addFormOverlay}>
            <View style={styles.addFormContainer}>
              <View style={styles.addFormHeader}>
                <Text style={styles.addFormTitle}>Add New Exchange</Text>
                <TouchableOpacity onPress={handleAddFormCancel} style={styles.addFormCloseButton}>
                  <Text style={styles.addFormCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.addFormContent}>
                <View style={styles.addFormGroup}>
                  <Text style={styles.addFormLabel}>Exchange Name *</Text>
                  <TextInput
                    style={styles.addFormInput}
                    placeholder="e.g., Binance"
                    value={addFormData.vaspname}
                    onChangeText={(value) => setAddFormData(prev => ({ ...prev, vaspname: value }))}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.addFormGroup}>
                  <Text style={styles.addFormLabel}>Exchange URL *</Text>
                  <TextInput
                    style={styles.addFormInput}
                    placeholder="e.g., www.binance.com"
                    value={addFormData.vaspurl}
                    onChangeText={(value) => setAddFormData(prev => ({ ...prev, vaspurl: value }))}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                <View style={styles.addFormGroup}>
                  <Text style={styles.addFormLabel}>Details (Optional)</Text>
                  <TextInput
                    style={[styles.addFormInput, styles.addFormTextArea]}
                    placeholder="e.g., Centralized exchange based in Malta"
                    value={addFormData.vaspdetails}
                    onChangeText={(value) => setAddFormData(prev => ({ ...prev, vaspdetails: value }))}
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                {addError ? (
                  <View style={styles.addFormError}>
                    <Text style={styles.addFormErrorText}>❌ {addError}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.addFormButtons}>
                <TouchableOpacity
                  style={[styles.addFormButton, styles.addFormButtonSecondary]}
                  onPress={handleAddFormCancel}
                  disabled={addLoading}
                >
                  <Text style={styles.addFormButtonTextSecondary}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addFormButton, styles.addFormButtonPrimary]}
                  onPress={handleAddFormSubmit}
                  disabled={addLoading}
                >
                  <Text style={styles.addFormButtonTextPrimary}>
                    {addLoading ? 'Adding...' : 'Add Exchange'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaledWidth(16),
    paddingVertical: scaledHeight(12),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cancelButton: {
    padding: scaledWidth(8),
  },
  cancelButtonText: {
    fontSize: normaliseFont(16),
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: normaliseFont(18),
    fontWeight: '700',
    color: '#212121',
  },
  headerSpacer: {
    width: scaledWidth(60),
  },
  searchContainer: {
    padding: scaledWidth(16),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchLabel: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: '#424242',
    marginBottom: scaledHeight(8),
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: scaledWidth(12),
    fontSize: normaliseFont(16),
    color: '#212121',
  },
  searchHint: {
    fontSize: normaliseFont(12),
    color: '#757575',
    marginTop: scaledHeight(6),
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    padding: scaledWidth(16),
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: scaledHeight(40),
  },
  loadingText: {
    fontSize: normaliseFont(16),
    color: '#757575',
    marginTop: scaledHeight(16),
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: scaledHeight(40),
    paddingHorizontal: scaledWidth(20),
  },
  errorIcon: {
    fontSize: normaliseFont(48),
    marginBottom: scaledHeight(16),
  },
  errorText: {
    fontSize: normaliseFont(16),
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: scaledHeight(20),
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: scaledWidth(24),
    paddingVertical: scaledHeight(12),
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: normaliseFont(16),
    color: colors.white,
    fontWeight: '600',
  },
  resultsSection: {
    marginBottom: scaledHeight(20),
  },
  resultsSectionTitle: {
    fontSize: normaliseFont(14),
    fontWeight: '700',
    color: '#424242',
    marginBottom: scaledHeight(12),
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: scaledWidth(16),
    marginBottom: scaledHeight(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultItemIcon: {
    width: scaledWidth(48),
    height: scaledWidth(48),
    borderRadius: scaledWidth(24),
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaledWidth(12),
  },
  resultItemIconText: {
    fontSize: normaliseFont(24),
  },
  resultItemContent: {
    flex: 1,
  },
  resultItemName: {
    fontSize: normaliseFont(17),
    fontWeight: '700',
    color: '#212121',
    marginBottom: scaledHeight(4),
  },
  resultItemDetail: {
    fontSize: normaliseFont(13),
    color: '#757575',
  },
  resultItemArrow: {
    fontSize: normaliseFont(28),
    color: '#BDBDBD',
    marginLeft: scaledWidth(8),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scaledHeight(40),
    paddingHorizontal: scaledWidth(20),
  },
  emptyIcon: {
    fontSize: normaliseFont(64),
    marginBottom: scaledHeight(16),
  },
  emptyTitle: {
    fontSize: normaliseFont(20),
    fontWeight: '700',
    color: '#212121',
    marginBottom: scaledHeight(8),
  },
  emptyText: {
    fontSize: normaliseFont(15),
    color: '#757575',
    textAlign: 'center',
    marginBottom: scaledHeight(24),
    lineHeight: scaledHeight(22),
  },
  addNewButton: {
    backgroundColor: colors.success,
    paddingHorizontal: scaledWidth(24),
    paddingVertical: scaledHeight(14),
    borderRadius: 8,
  },
  addNewButtonText: {
    fontSize: normaliseFont(16),
    color: colors.white,
    fontWeight: '700',
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingVertical: scaledHeight(40),
    paddingHorizontal: scaledWidth(20),
  },
  instructionsIcon: {
    fontSize: normaliseFont(64),
    marginBottom: scaledHeight(16),
  },
  instructionsTitle: {
    fontSize: normaliseFont(20),
    fontWeight: '700',
    color: '#212121',
    marginBottom: scaledHeight(12),
  },
  instructionsText: {
    fontSize: normaliseFont(15),
    color: '#757575',
    textAlign: 'center',
    lineHeight: scaledHeight(22),
  },

  // Add form styles
  addFormOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaledWidth(20),
  },
  addFormContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scaledWidth(20),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  addFormTitle: {
    fontSize: normaliseFont(20),
    fontWeight: '700',
    color: '#212121',
  },
  addFormCloseButton: {
    padding: scaledWidth(4),
  },
  addFormCloseButtonText: {
    fontSize: normaliseFont(24),
    color: '#757575',
    fontWeight: '300',
  },
  addFormContent: {
    padding: scaledWidth(20),
    maxHeight: scaledHeight(400),
  },
  addFormGroup: {
    marginBottom: scaledHeight(20),
  },
  addFormLabel: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: '#424242',
    marginBottom: scaledHeight(8),
  },
  addFormInput: {
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 8,
    padding: scaledWidth(12),
    fontSize: normaliseFont(16),
    color: '#212121',
    backgroundColor: '#FAFAFA',
  },
  addFormTextArea: {
    height: scaledHeight(80),
    textAlignVertical: 'top',
  },
  addFormError: {
    backgroundColor: '#FFEBEE',
    padding: scaledWidth(12),
    borderRadius: 8,
    marginTop: scaledHeight(8),
  },
  addFormErrorText: {
    color: '#C62828',
    fontSize: normaliseFont(14),
    textAlign: 'center',
  },
  addFormButtons: {
    flexDirection: 'row',
    padding: scaledWidth(20),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: scaledWidth(12),
  },
  addFormButton: {
    flex: 1,
    paddingVertical: scaledHeight(14),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFormButtonSecondary: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  addFormButtonPrimary: {
    backgroundColor: colors.primary,
  },
  addFormButtonTextSecondary: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: '#424242',
  },
  addFormButtonTextPrimary: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default VaspSearchModal;
