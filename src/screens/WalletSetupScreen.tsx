import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import { WalletService } from '../services/WalletService';

interface WalletSetupScreenProps {
  onWalletCreated: () => void;
}

const WalletSetupScreen: React.FC<WalletSetupScreenProps> = ({ onWalletCreated }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');

  const validatePassword = (): boolean => {
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleCreateWallet = async () => {
    if (!validatePassword()) return;

    setIsCreating(true);
    try {
      const wallet = await WalletService.createWallet(password);
      
      // Store the recovery phrase and show the modal
      setRecoveryPhrase(wallet.mnemonic);
      setShowRecoveryModal(true);
      
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create wallet');
    } finally {
      setIsCreating(false);
    }
  };

  const handleImportWallet = async () => {
    if (!validatePassword()) return;
    if (!mnemonic.trim()) {
      Alert.alert('Error', 'Please enter your recovery phrase');
      return;
    }

    setIsImporting(true);
    try {
      const wallet = await WalletService.importWallet(mnemonic.trim(), password);
      
      Alert.alert(
        'Wallet Imported Successfully!',
        `Your wallet address: ${wallet.address}`,
        [
          {
            text: 'Continue',
            onPress: onWalletCreated,
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to import wallet');
    } finally {
      setIsImporting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      Clipboard.setString(recoveryPhrase);
      Alert.alert('Copied!', 'Recovery phrase copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const shareRecoveryPhrase = async () => {
    try {
      const message = `My Blockcerts Wallet Recovery Phrase:\n\n${recoveryPhrase}\n\nIMPORTANT: Keep this phrase secure and private. Anyone with access to this phrase can access your wallet.`;
      
      await Share.share({
        message: message,
        title: 'Wallet Recovery Phrase',
      });
    } catch (error) {
      console.error('Error sharing recovery phrase:', error);
    }
  };

  const handleRecoveryPhraseConfirmed = () => {
    setShowRecoveryModal(false);
    setRecoveryPhrase('');
    onWalletCreated();
  };

  const showRecoveryPhrase = (phrase: string) => {
    setRecoveryPhrase(phrase);
    setShowRecoveryModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Icon name="account-balance-wallet" size={80} color="#2196F3" />
            <Text style={styles.title}>Welcome to Blockcerts Wallet</Text>
            <Text style={styles.subtitle}>
              Secure storage for your digital credentials
            </Text>
          </View>

          <Card containerStyle={styles.card}>
            <Text style={styles.cardTitle}>
              {showImport ? 'Import Existing Wallet' : 'Create New Wallet'}
            </Text>

            <Input
              placeholder="Enter a strong password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={<Icon name="lock" size={24} color="gray" />}
              containerStyle={styles.inputContainer}
            />

            <Input
              placeholder="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIcon={<Icon name="lock" size={24} color="gray" />}
              containerStyle={styles.inputContainer}
            />

            {showImport && (
              <Input
                placeholder="Enter your 12-word recovery phrase"
                value={mnemonic}
                onChangeText={setMnemonic}
                multiline
                numberOfLines={3}
                leftIcon={<Icon name="vpn-key" size={24} color="gray" />}
                containerStyle={styles.inputContainer}
              />
            )}

            {showImport ? (
              <Button
                title="Import Wallet"
                onPress={handleImportWallet}
                loading={isImporting}
                disabled={isImporting}
                buttonStyle={[styles.button, styles.primaryButton]}
                titleStyle={styles.buttonText}
              />
            ) : (
              <Button
                title="Create Wallet"
                onPress={handleCreateWallet}
                loading={isCreating}
                disabled={isCreating}
                buttonStyle={[styles.button, styles.primaryButton]}
                titleStyle={styles.buttonText}
              />
            )}

            <Button
              title={showImport ? 'Create New Wallet Instead' : 'Import Existing Wallet'}
              onPress={() => {
                setShowImport(!showImport);
                setMnemonic('');
                setPassword('');
                setConfirmPassword('');
              }}
              type="clear"
              titleStyle={styles.switchButtonText}
              containerStyle={styles.switchButton}
            />
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Your wallet will be encrypted and stored securely on this device.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Recovery Phrase Modal */}
      <Modal
        visible={showRecoveryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Icon name="security" size={60} color="#4CAF50" />
                <Text style={styles.modalTitle}>Wallet Created Successfully!</Text>
                <Text style={styles.modalSubtitle}>
                  Save your recovery phrase securely. You'll need it to restore your wallet.
                </Text>
              </View>

              <View style={styles.recoveryPhraseContainer}>
                <Text style={styles.recoveryPhraseLabel}>Recovery Phrase:</Text>
                <View style={styles.recoveryPhraseBox}>
                  <Text style={styles.recoveryPhraseText}>{recoveryPhrase}</Text>
                </View>
                
                <Text style={styles.warningText}>
                  ⚠️ Anyone with access to this phrase can access your wallet. Keep it safe and private!
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.actionButton} onPress={copyToClipboard}>
                  <Icon name="content-copy" size={24} color="#2196F3" />
                  <Text style={styles.actionButtonText}>Copy</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={shareRecoveryPhrase}>
                  <Icon name="share" size={24} color="#2196F3" />
                  <Text style={styles.actionButtonText}>Share</Text>
                </TouchableOpacity>
              </View>

              <Button
                title="I have saved my recovery phrase"
                onPress={handleRecoveryPhraseConfirmed}
                buttonStyle={styles.confirmButton}
                titleStyle={styles.confirmButtonText}
                icon={<Icon name="check-circle" size={20} color="white" />}
              />
            </ScrollView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  card: {
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 10,
  },
  button: {
    borderRadius: 25,
    paddingVertical: 12,
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 15,
  },
  switchButtonText: {
    color: '#2196F3',
    fontSize: 14,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalContent: {
    padding: 20,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  recoveryPhraseContainer: {
    width: '100%',
    marginBottom: 25,
  },
  recoveryPhraseLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  recoveryPhraseBox: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  recoveryPhraseText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'monospace',
  },
  warningText: {
    fontSize: 14,
    color: '#ff6b35',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 25,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#2196F3',
    minWidth: 100,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    minWidth: 250,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WalletSetupScreen;
