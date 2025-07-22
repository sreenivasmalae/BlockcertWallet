import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { Button } from '@rneui/themed';
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CustomHeader } from '../components/common/CustomHeader';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  return (
    <View style={styles.container}>
      <CustomHeader
        showLogo={true}
        title="Perpetual"
        subtitle="Brilliance. Trust. Perpetual"
        backgroundColor="#ffffff"
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.titleSection}>
            <Text style={styles.mainTitle}>
              {showImport ? 'Import Existing Wallet' : 'Create New Wallet'}
            </Text>
            <Text style={styles.subtitle}>
              {showImport 
                ? 'Restore your wallet using your recovery phrase'
                : 'Set up your secure digital wallet to store your certificates'
              }
            </Text>
          </View>

          <View style={styles.formSection}>
            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Create a strong password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  accessibilityRole="button"
                >
                  <Icon 
                    name={showPassword ? "visibility" : "visibility-off"} 
                    size={24} 
                    color="#6B7280" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  accessibilityRole="button"
                >
                  <Icon 
                    name={showConfirmPassword ?  "visibility" : "visibility-off" } 
                    size={24} 
                    color="#6B7280" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {showImport && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Enter your 12-word recovery phrase"
                  value={mnemonic}
                  onChangeText={setMnemonic}
                  multiline
                  numberOfLines={3}
                  autoCapitalize="none"
                />
              </View>
            )}
          </View>

          {!showImport && (
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Icon 
                  name="security" 
                  size={24} 
                  color="#2563EB" 
                  style={styles.infoIcon}
                />
                <Text style={styles.infoTitle}>Secure Wallet Creation</Text>
              </View>
              <Text style={styles.infoDescription}>
                Your wallet will be encrypted using advanced cryptography and secured with blockchain technology. 
                Your private keys are stored locally and never shared with our servers.
              </Text>
            </View>
          )}

          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={showImport ? handleImportWallet : handleCreateWallet}
              disabled={isCreating || isImporting}
            >
              <Text style={styles.primaryButtonText}>
                {showImport 
                  ? (isImporting ? 'Importing...' : 'Import Wallet')
                  : (isCreating ? 'Creating...' : 'Create Wallet')
                }
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setShowImport(!showImport);
                setMnemonic('');
                setPassword('');
                setConfirmPassword('');
              }}
            >
              <Icon 
                name={showImport ? "add" : "download"} 
                size={20} 
                color="#8B5CF6" 
              />
              <Text style={styles.secondaryButtonText}>
                {showImport ? 'Create New Wallet Instead' : 'Import Existing Wallet'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By creating a wallet, you agree to our{' '}
              <Text style={styles.footerLink}>Terms of Service</Text>{' '}
              and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 32,
  },
  // Main Title Section
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  // Form Section
  formSection: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeIcon: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Info Section
  infoSection: {
    backgroundColor: '#EBF8FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  infoDescription: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  // Buttons
  buttonSection: {
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8B5CF6',
    marginLeft: 8,
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  // Legacy styles for compatibility
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
  button: {
    borderRadius: 25,
    paddingVertical: 12,
    marginTop: 10,
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
