import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { StorageService, IssuerDetails } from '../services/StorageService';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

interface IssuerWithCredentialCount extends IssuerDetails {
  credentialCount: number;
}

// Color palette for issuer icons
const ISSUER_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple  
  '#10B981', // Green
  '#EF4444', // Red
  '#F59E0B', // Yellow
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#14B8A6', // Teal
];

const CredentialsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [issuers, setIssuers] = useState<IssuerWithCredentialCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadIssuers = async () => {
    try {
      const issuersWithCounts = await StorageService.getIssuersWithCredentialCountsById();
      setIssuers(issuersWithCounts);
    } catch (error) {
      console.error('Error loading issuers:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadIssuers();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadIssuers();
    setRefreshing(false);
  };

  const handleIssuerPress = (issuer: IssuerWithCredentialCount) => {
    // Navigate to issuer details screen showing all credentials from this issuer
    (navigation as any).navigate('IssuerDetails', { issuerId: issuer.id });
  };

  const handleSearchPress = () => {
    // TODO: Implement search functionality
    console.log('Search pressed');
  };

  const handleMenuPress = () => {
    // TODO: Implement menu functionality
    console.log('Menu pressed');
  };

  const handleSortPress = () => {
    // TODO: Implement sort functionality
    console.log('Sort pressed');
  };

  const getIssuerColor = (index: number): string => {
    return ISSUER_COLORS[index % ISSUER_COLORS.length];
  };

  const renderIssuerIcon = (issuer: IssuerWithCredentialCount, index: number) => {
    if (issuer.image) {
      // Handle base64 image
      const imageSource = issuer.image.startsWith('data:image')
        ? { uri: issuer.image }
        : { uri: `data:image/png;base64,${issuer.image}` };
      
      return (
        <Image
          source={imageSource}
          style={styles.issuerImage}
          resizeMode="cover"
        />
      );
    } else {
      // Fallback to colored square with initials
      const backgroundColor = getIssuerColor(index);
      const initials = issuer.name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
      
      return (
        <View style={[styles.issuerIconPlaceholder, { backgroundColor }]}>
          <Text style={styles.issuerInitials}>{initials}</Text>
        </View>
      );
    }
  };

  const renderIssuerItem = ({ item, index }: { item: IssuerWithCredentialCount; index: number }) => (
    <TouchableOpacity 
      style={styles.issuerCard} 
      onPress={() => handleIssuerPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.issuerContent}>
        {renderIssuerIcon(item, index)}
        <View style={styles.issuerInfo}>
          <Text style={styles.issuerName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.credentialCount}>
            {item.credentialCount} {item.credentialCount === 1 ? 'credential' : 'credentials'}
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color="#D1D5DB" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="badge" size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>No Credentials Yet</Text>
      <Text style={styles.emptySubtitle}>
        Add trusted credential issuers to start managing your digital certificates.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.headerTitle}>My Credentials</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={handleSearchPress}
            activeOpacity={0.7}
          >
            <Icon name="search" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={handleMenuPress}
            activeOpacity={0.7}
          >
            <Icon name="more-vert" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Issuers ({issuers.length})
        </Text>
        <TouchableOpacity 
          style={styles.sortButton} 
          onPress={handleSortPress}
          activeOpacity={0.7}
        >
          <Text style={styles.sortButtonText}>Sort</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading credentials...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {renderHeader()}
      <FlatList
        data={issuers}
        renderItem={renderIssuerItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
    paddingTop: 16,
  },
  issuerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  issuerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  issuerImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  issuerIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  issuerInitials: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  issuerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  issuerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },
  credentialCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
});

export default CredentialsScreen;
