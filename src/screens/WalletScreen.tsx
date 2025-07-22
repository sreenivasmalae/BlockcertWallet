import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button, Card } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import Header from '../components/Header';
import { WalletService } from '../services/WalletService';
import { WalletData } from '../types/wallet';
import { useNavigation } from '../hooks/useNavigation';

const WalletScreen: React.FC = () => {
  const _navigation = useNavigation();
  const [_wallet, _setWallet] = useState<WalletData | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletInfo();
  }, []);

  const loadWalletInfo = async () => {
    try {
      const hasWallet = await WalletService.walletExists();
      
      if (hasWallet) {
        const address = await WalletService.getWalletAddress();
        setWalletAddress(address);
      }
    } catch (error) {
      console.error('Error loading wallet info:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Address copied to clipboard');
  };

  const handleBackupWallet = () => {
    Alert.prompt(
      'Enter Password',
      'Please enter your wallet password to view backup',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async (password: string | undefined) => {
            if (password) {
              try {
                const walletData = await WalletService.loadWallet(password);
                if (walletData) {
                  Alert.alert(
                    'Recovery Phrase',
                    `Your 12-word recovery phrase:\n\n${walletData.mnemonic}\n\nStore this safely!`,
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                Alert.alert('Error', 'Invalid password');
              }
            }
          },
        },
      ],
      'secure-text'
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centerContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!walletAddress) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centerContainer}>
          <Icon name="account-balance-wallet" size={80} color="#2196F3" />
          <Text style={styles.title}>No Wallet Found</Text>
          <Text style={styles.subtitle}>
            This shouldn't happen. Please restart the app.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.scrollView}>
        <Card containerStyle={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Icon name="account-balance-wallet" size={40} color="#2196F3" />
            <Text style={styles.walletName}>My Wallet</Text>
          </View>
          
          <View style={styles.addressContainer}>
            <Text style={styles.addressLabel}>Ethereum Address:</Text>
            <TouchableOpacity onPress={() => copyToClipboard(walletAddress)}>
              <Text style={styles.addressText}>{walletAddress}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(walletAddress)}
            >
              <Icon name="content-copy" size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>
        </Card>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleBackupWallet}>
            <Icon name="backup" size={24} color="#2196F3" />
            <Text style={styles.actionButtonText}>View Recovery Phrase</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerButton: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 16,
    width: 250,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#2196F3',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    width: 250,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  walletCard: {
    borderRadius: 12,
    marginBottom: 20,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#333',
  },
  addressContainer: {
    marginBottom: 15,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  addressText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
  },
  copyButton: {
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  statusContainer: {
    marginTop: 10,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
});

export default WalletScreen;
