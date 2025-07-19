import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
      
      Alert.alert(
        'Wallet Created Successfully!',
        `Your wallet address: ${wallet.address}\n\nPlease save your recovery phrase safely. You will need it to restore your wallet.`,
        [
          {
            text: 'Show Recovery Phrase',
            onPress: () => showRecoveryPhrase(wallet.mnemonic),
          },
        ]
      );
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

  const showRecoveryPhrase = (phrase: string) => {
    Alert.alert(
      'Recovery Phrase',
      `IMPORTANT: Write down these 12 words in order and store them safely:\n\n${phrase}\n\nAnyone with access to this phrase can access your wallet.`,
      [
        {
          text: 'I have saved it',
          onPress: onWalletCreated,
        },
      ]
    );
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
});

export default WalletSetupScreen;
