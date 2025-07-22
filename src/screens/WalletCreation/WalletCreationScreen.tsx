import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CustomHeader } from '../../components/common/CustomHeader';
import { WalletService } from '../../services/WalletService';
import styles from './WalletCreationScreen.styles';

interface WalletCreationScreenProps {
  onWalletCreated: () => void;
  onImportWallet?: () => void;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const WalletCreationScreen: React.FC<WalletCreationScreenProps> = ({
  onWalletCreated,
  onImportWallet,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Password strength calculation
  const calculatePasswordStrength = useCallback((pwd: string): PasswordStrength => {
    let score = 0;
    
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    
    if (score < 2) return { score: 1, label: 'Weak', color: '#EF4444' };
    if (score < 4) return { score: 2, label: 'Fair', color: '#F59E0B' };
    if (score < 6) return { score: 3, label: 'Good', color: '#10B981' };
    return { score: 4, label: 'Strong', color: '#059669' };
  }, []);

  const passwordStrength = calculatePasswordStrength(password);

  const validateForm = (): boolean => {
    if (password.length < 8) {
      Alert.alert('Invalid Password', 'Password must be at least 8 characters long');
      return false;
    }
    
    if (passwordStrength.score < 2) {
      Alert.alert('Weak Password', 'Please choose a stronger password for better security');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleCreateWallet = async () => {
    if (!validateForm()) return;

    setIsCreating(true);
    try {
      await WalletService.createWallet(password);
      
      Alert.alert(
        'Wallet Created Successfully!',
        'Your secure wallet has been created. Make sure to backup your recovery phrase.',
        [
          {
            text: 'Continue',
            onPress: onWalletCreated,
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Creation Failed', 
        error instanceof Error ? error.message : 'Failed to create wallet'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleImportWallet = () => {
    if (onImportWallet) {
      onImportWallet();
    }
  };

  const openTermsOfService = () => {
    Linking.openURL('https://example.com/terms');
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://example.com/privacy');
  };

  const renderPasswordStrengthBar = () => {
    const fillWidth = password.length > 0 ? (passwordStrength.score / 4) * 100 : 0;
    
    return (
      <View style={styles.passwordStrengthContainer}>
        <View style={styles.passwordStrengthBar}>
          <View 
            style={[
              styles.passwordStrengthFill,
              { 
                width: `${fillWidth}%`,
                backgroundColor: passwordStrength.color,
              }
            ]} 
          />
        </View>
        {password.length > 0 && (
          <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
            Password strength: {passwordStrength.label}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <CustomHeader
        showLogo={true}
        title="Perpetual"
        subtitle="Brilliance. Trust. Perpetual"
        backgroundColor="#ffffff"
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Create New Wallet</Text>
          <Text style={styles.subtitle}>
            Set up your secure digital wallet to store your certificates
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.textInput,
                  passwordFocused && styles.textInputFocused,
                ]}
                placeholder="Enter a strong password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                autoCapitalize="none"
                accessibilityLabel="Password input"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Icon 
                  name={showPassword ? "visibility-off" : "visibility"} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            </View>
            {renderPasswordStrengthBar()}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.textInput,
                  confirmPasswordFocused && styles.textInputFocused,
                ]}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                onFocus={() => setConfirmPasswordFocused(true)}
                onBlur={() => setConfirmPasswordFocused(false)}
                autoCapitalize="none"
                accessibilityLabel="Confirm password input"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                <Icon 
                  name={showConfirmPassword ? "visibility-off" : "visibility"} 
                  size={20} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Info Section */}
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

        {/* Buttons Section */}
        <View style={styles.buttonSection}>
          {/* Primary Button - Create Wallet */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#8B5CF6' }]}
            onPress={handleCreateWallet}
            disabled={isCreating}
            accessibilityLabel="Create wallet button"
          >
            <View style={styles.primaryButtonGradient}>
              <Text style={styles.primaryButtonText}>
                {isCreating ? 'Creating Wallet...' : 'Create Wallet'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Secondary Button - Import Wallet */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleImportWallet}
            disabled={isCreating}
            accessibilityLabel="Import existing wallet button"
          >
            <Icon name="download" size={20} color="#8B5CF6" />
            <Text style={styles.secondaryButtonText}>Import Existing Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By creating a wallet, you agree to our{' '}
            <Text style={styles.footerLink} onPress={openTermsOfService}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={styles.footerLink} onPress={openPrivacyPolicy}>
              Privacy Policy
            </Text>
          </Text>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isCreating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Creating your secure wallet...</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default WalletCreationScreen;
