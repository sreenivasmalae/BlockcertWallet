import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Header, Button } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService, IssuerDetails } from '../services/StorageService';
import { useNavigation } from '../hooks/useNavigation';

const IssuerListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [issuers, setIssuers] = useState<IssuerDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadIssuers = async () => {
    try {
      const issuersList = await StorageService.getIssuers();
      setIssuers(issuersList);
    } catch (error) {
      console.error('Error loading issuers:', error);
      Alert.alert('Error', 'Failed to load issuers');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIssuers();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadIssuers();
    }, [])
  );

  const handleDeleteIssuer = (issuer: IssuerDetails) => {
    Alert.alert(
      'Delete Issuer',
      `Are you sure you want to delete "${issuer.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteIssuer(issuer.id);
              await loadIssuers();
              Alert.alert('Success', 'Issuer deleted successfully');
            } catch (error) {
              console.error('Error deleting issuer:', error);
              Alert.alert('Error', 'Failed to delete issuer');
            }
          },
        },
      ]
    );
  };

  const handleAddIssuer = () => {
    navigation.navigate('AddIssuer');
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderIssuerItem = ({ item }: { item: IssuerDetails }) => (
    <Card containerStyle={styles.issuerCard}>
      <View style={styles.issuerHeader}>
        <View style={styles.issuerInfo}>
          <Text style={styles.issuerName}>{item.name}</Text>
          <Text style={styles.issuerUrl}>{item.url}</Text>
          {item.email && <Text style={styles.issuerEmail}>{item.email}</Text>}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteIssuer(item)}
        >
          <Icon name="delete" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      {item.description && (
        <Text style={styles.issuerDescription}>{item.description}</Text>
      )}

      <View style={styles.issuerDetails}>
        {/* <Text style={styles.detailLabel}>Public Key:</Text>
        <Text style={styles.publicKey} numberOfLines={2}>
          {item.publicKey}
        </Text> */}
        <Text style={styles.addedDate}>
          Added {formatDate(item.addedAt)}
        </Text>
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="domain" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Issuers Added</Text>
      <Text style={styles.emptySubtitle}>
        Add trusted credential issuers to verify and manage your digital certificates
      </Text>
      <Button
        title="Add Your First Issuer"
        onPress={handleAddIssuer}
        buttonStyle={styles.emptyButton}
        icon={<Icon name="add" size={20} color="#fff" style={styles.buttonIcon} />}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        centerComponent={{
          text: 'Trusted Issuers',
          style: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
        }}
        leftComponent={{
          icon: 'arrow-back',
          color: '#fff',
          onPress: () => navigation.goBack(),
        }}
        rightComponent={{
          icon: 'add',
          color: '#fff',
          onPress: handleAddIssuer,
        }}
        backgroundColor="#2196F3"
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading issuers...</Text>
        </View>
      ) : (
        <FlatList
          data={issuers}
          renderItem={renderIssuerItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            issuers.length === 0 && styles.emptyContainer,
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  issuerCard: {
    borderRadius: 12,
    marginBottom: 12,
  },
  issuerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  issuerInfo: {
    flex: 1,
  },
  issuerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  issuerUrl: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 2,
  },
  issuerEmail: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  issuerDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  issuerDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  publicKey: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  addedDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 32,
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default IssuerListScreen;
