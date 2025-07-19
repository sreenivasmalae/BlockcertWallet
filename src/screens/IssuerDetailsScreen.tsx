import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header, Button } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StorageService, IssuerDetails } from '../services/StorageService';
import { BlockcertCredential } from '../types/blockcerts';

type IssuerDetailsScreenRouteProp = RouteProp<{
  IssuerDetails: { issuerId: string };
}, 'IssuerDetails'>;

const IssuerDetailsScreen: React.FC = () => {
  const route = useRoute<IssuerDetailsScreenRouteProp>();
  const navigation = useNavigation();
  const { issuerId } = route.params;

  const [issuer, setIssuer] = useState<IssuerDetails | null>(null);
  const [credentials, setCredentials] = useState<BlockcertCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadIssuerData = useCallback(async () => {
    try {
      // Load issuer details
      const issuerData = await StorageService.getIssuerById(issuerId);
      if (!issuerData) {
        Alert.alert('Error', 'Issuer not found');
        navigation.goBack();
        return;
      }
      setIssuer(issuerData);

      // Load credentials for this issuer
      const credentialsList = await StorageService.getCredentialsByIssuerId(issuerId);
      setCredentials(credentialsList);
    } catch (error) {
      console.error('Error loading issuer data:', error);
      Alert.alert('Error', 'Failed to load issuer data');
    } finally {
      setLoading(false);
    }
  }, [issuerId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadIssuerData();
    }, [loadIssuerData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIssuerData();
    setRefreshing(false);
  };

  const handleCredentialPress = (credential: BlockcertCredential) => {
    // Navigate to credential details screen
    (navigation as any).navigate('CredentialDetail', { credentialId: credential.id });
  };

  // Helper functions to extract certificate details from JSON
  const getCertificateName = (rawJson: string): string => {
    try {
      const jsonData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      
      // Try different possible fields for certificate name
      return jsonData.name || 
             jsonData.certificatename || 
             jsonData.credentialSubject?.name ||
             jsonData.badge?.name ||
             jsonData.title ||
             'Unnamed Certificate';
    } catch (error) {
      console.error('Error parsing certificate JSON for name:', error);
      return 'Unnamed Certificate';
    }
  };

  const getCertificateDescription = (rawJson: string): string => {
    try {
      const jsonData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      
      // Try different possible fields for certificate description
      return jsonData.description || 
             jsonData.alternativeheadline || 
             jsonData.credentialSubject?.description ||
             jsonData.badge?.description ||
             jsonData.subtitle ||
             jsonData.type?.[1] || // Sometimes type is an array with description as second element
             'Certificate of Completion';
    } catch (error) {
      console.error('Error parsing certificate JSON for description:', error);
      return 'Certificate of Completion';
    }
  };

  const getCredentialIcon = (index: number): string => {
    const icons = ['school', 'security', 'star', 'verified', 'workspace_premium'];
    return icons[index % icons.length];
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Unknown Date';
    }
  };

  const renderCredentialItem = ({ item, index }: { item: BlockcertCredential; index: number }) => {
    // Get certificate name and description from the raw JSON
    const certificateName = item.metadata?.rawJson ? 
      getCertificateName(item.metadata.rawJson) : 
      (item.metadata?.title || 'Unnamed Certificate');
      
    const certificateDescription = item.metadata?.rawJson ? 
      getCertificateDescription(item.metadata.rawJson) : 
      'Certificate of Completion';
    
    return (
      <TouchableOpacity
        style={styles.credentialCard}
        onPress={() => handleCredentialPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.credentialHeader}>
          <Text style={styles.credentialDate}>
            {formatDate(item.issuanceDate)}
          </Text>
          <View style={[styles.verificationBadge, styles.verifiedBadge]}>
            <View style={styles.verificationDot} />
            <Text style={styles.verificationText}>Verified</Text>
          </View>
        </View>
        
        <View style={styles.credentialContent}>
          <View style={styles.credentialIconContainer}>
            <Icon 
              name={getCredentialIcon(index)} 
              size={24} 
              color="#2196F3" 
            />
          </View>
          
          <View style={styles.credentialInfo}>
            <Text style={styles.credentialTitle}>
              {certificateName}
            </Text>
            <Text style={styles.credentialType}>
              {certificateDescription}
            </Text>
          </View>
          
          <Icon name="chevron-right" size={24} color="#C0C0C0" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="school" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Certificates</Text>
      <Text style={styles.emptySubtitle}>
        This issuer hasn't issued any certificates to you yet.
      </Text>
      <Button
        title="Add Certificate"
        onPress={() => navigation.navigate('AddCredential' as never)}
        buttonStyle={styles.addButton}
        titleStyle={styles.addButtonText}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
        <Header
          centerComponent={{
            text: 'Loading...',
            style: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
          }}
          leftComponent={{
            icon: 'arrow-back',
            color: '#fff',
            onPress: () => navigation.goBack(),
          }}
          backgroundColor="#2196F3"
        />
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-empty" size={50} color="#2196F3" />
          <Text style={styles.loadingText}>Loading issuer data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!issuer) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
        <Header
          centerComponent={{
            text: 'Issuer Not Found',
            style: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
          }}
          leftComponent={{
            icon: 'arrow-back',
            color: '#fff',
            onPress: () => navigation.goBack(),
          }}
          backgroundColor="#2196F3"
        />
        <View style={styles.errorContainer}>
          <Icon name="error" size={50} color="#EF4444" />
          <Text style={styles.errorText}>Issuer not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{issuer?.name || 'Digital Credentials'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Issuer Information Section */}
      <View style={styles.issuerSection}>
        <View style={styles.issuerHeader}>
          <View style={styles.issuerIconContainer}>
            {issuer?.image ? (
              <Image source={{ uri: issuer.image }} style={styles.issuerIconImage} />
            ) : (
              <Icon name="business" size={32} color="#2196F3" />
            )}
          </View>
          <View style={styles.issuerInfo}>
            <Text style={styles.issuerName}>{issuer?.name || 'Unknown Institution'}</Text>
            <Text style={styles.issuerSubtitle}>
              {issuer?.description || 'Digital Credential Issuer'}
            </Text>
            <View style={styles.verifiedIssuerBadge}>
              <View style={styles.verifiedDot} />
              <Text style={styles.verifiedText}>Verified Issuer</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Credentials List Section */}
      <View style={styles.credentialsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Credentials ({credentials.length})
          </Text>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={credentials}
          renderItem={renderCredentialItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={credentials.length === 0 ? styles.emptyContainer : styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2196F3']}
              tintColor="#2196F3"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
  },
  // Custom Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginRight: 40, // Compensate for back button
  },
  headerSpacer: {
    width: 40,
  },
  // Issuer Section Styles
  issuerSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
  },
  issuerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  issuerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  issuerIconImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  issuerInfo: {
    flex: 1,
  },
  issuerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  issuerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  verifiedIssuerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  // Credentials Section Styles
  credentialsSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  // Credential Card Styles
  credentialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  credentialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  credentialDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadge: {
    backgroundColor: '#E8F5E8',
  },
  verificationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  verificationText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  credentialContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  credentialIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  credentialInfo: {
    flex: 1,
  },
  credentialTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  credentialType: {
    fontSize: 14,
    color: '#666',
  },
  // Empty State Styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default IssuerDetailsScreen;
