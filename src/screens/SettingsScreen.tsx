import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { WalletService } from '../services/WalletService';
import { WalletContext } from '../../App';
import { useNavigation } from '../hooks/useNavigation';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { resetWallet } = useContext(WalletContext);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddIssuer = () => {
    navigation.navigate('IssuerList');
  };

  const handleAddCredential = () => {
    navigation.navigate('AddCredential');
  };

  const handleShowPassphrase = () => {
    setPassword('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const wallet = await WalletService.loadWallet(password);
      if (wallet) {
        setShowPasswordModal(false);
        setPassword('');
        Alert.alert(
          'Recovery Phrase',
          `Your 12-word recovery phrase:\n\n${wallet.mnemonic}\n\nStore this safely! Anyone with this phrase can access your wallet.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'No wallet found');
      }
    } catch (error) {
      Alert.alert('Error', 'Invalid password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowPasswordModal(false);
    setPassword('');
  };

  const handleDeleteWallet = () => {
    Alert.alert(
      'Delete Wallet',
      'Are you sure you want to delete your wallet? This action cannot be undone. Make sure you have backed up your recovery phrase.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await WalletService.deleteWallet();
              resetWallet();
              Alert.alert('Wallet Deleted', 'Your wallet has been deleted successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete wallet');
            }
          },
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About Blockcerts Wallet',
      'Version 1.0.0\n\nA secure wallet for managing Blockcerts digital credentials.\n\nBuilt with React Native and TypeScript.',
      [{ text: 'OK' }]
    );
  };

  const handlePdfTest = () => {
    navigation.navigate('PdfThumbnailTest');
  };

  const settingsSections = [
    {
      title: 'Credential Management',
      items: [
        {
          title: 'Manage Issuers',
          icon: 'domain',
          onPress: handleAddIssuer,
        },
        {
          title: 'Add Credential',
          icon: 'add-circle',
          onPress: handleAddCredential,
        },
      ],
    },
    {
      title: 'Wallet',
      items: [
        {
          title: 'My Passphrase',
          icon: 'vpn-key',
          onPress: handleShowPassphrase,
        }
      ],
    },
    {
      title: 'About',
      items: [
        {
          title: 'App Information',
          icon: 'info',
          onPress: handleAbout,
        }
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Settings</Text>
        
        {settingsSections.map((section, sectionIndex) => (
          <Card key={sectionIndex} containerStyle={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={styles.settingItem}
                onPress={item.onPress}
              >
                <View style={styles.settingItemContent}>
                  <Icon 
                    name={item.icon} 
                    size={24} 
                    color={item.danger ? '#F44336' : '#2196F3'} 
                  />
                  <Text 
                    style={[
                      styles.settingItemText,
                      item.danger && styles.dangerText
                    ]}
                  >
                    {item.title}
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color="#ccc" />
              </TouchableOpacity>
            ))}
          </Card>
        ))}
      </ScrollView>

      {/* Password Input Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="vpn-key" size={32} color="#2196F3" />
              <Text style={styles.modalTitle}>Enter Password</Text>
              <Text style={styles.modalSubtitle}>
                Enter your wallet password to view your recovery phrase
              </Text>
            </View>

            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              autoFocus={true}
              onSubmitEditing={handlePasswordSubmit}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={handleCloseModal}
                // buttonStyle={[styles.modalButton, styles.cancelButton]}
                titleStyle={styles.cancelButtonText}
                type="outline"
              />
              <Button
                title="Show Phrase"
                onPress={handlePasswordSubmit}
                loading={isLoading}
                disabled={isLoading || !password.trim()}
                // buttonStyle={[styles.modalButton, styles.submitButton]}
                titleStyle={styles.submitButtonText}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  sectionCard: {
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  dangerText: {
    color: '#F44336',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginBottom: 80,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
  },
  cancelButton: {
    borderColor: '#ddd',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    margin:5,
    fontSize: 18,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#2196F3',
  },
  submitButtonText: {
    margin:5,
    color: 'white',
  },
});

export default SettingsScreen;
