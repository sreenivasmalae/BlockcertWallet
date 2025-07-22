import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../components/Header';
import { StorageService, IssuerDetails } from '../services/StorageService';
import { WalletService } from '../services/WalletService';
import { useNavigation } from '../hooks/useNavigation';

const AddIssuerScreen: React.FC = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    url: '',
    otp: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.url.trim()) {
      newErrors.url = 'Issuer URL is required';
    } else {
      // Basic URL validation
      const urlPattern = /^https?:\/\/.+\..+/;
      if (!urlPattern.test(formData.url.trim())) {
        newErrors.url = 'Please enter a valid URL (e.g., https://example.com)';
      }
    }

    if (!formData.otp.trim()) {
      newErrors.otp = 'OTP is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const fetchIssuerData = async (url: string): Promise<any> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch issuer data: ${response.status}`);
      }
      
      // Get response as text first
      const responseText = await response.text();
      
      // Try to parse as JSON
      let jsonData;
      try {
        jsonData = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Response is not valid JSON format');
      }
      
      return jsonData;
    } catch (error) {
      console.error('Error fetching issuer data:', error);
      throw error;
    }
  };

  const validateIssuerJson = (jsonData: any): { name: string; introductionURL: string; publicKey: string } => {
    if (!jsonData.name) {
      throw new Error('Missing required field: name');
    }
    if (!jsonData.introductionURL) {
      throw new Error('Missing required field: introductionURL');
    }
    if (!jsonData.publicKey) {
      throw new Error('Missing required field: publicKey');
    }
    
    // Handle publicKey as array (extract first key ID) or string
    let publicKey: string;
    if (Array.isArray(jsonData.publicKey)) {
      if (jsonData.publicKey.length === 0) {
        throw new Error('publicKey array is empty');
      }
      // Extract the ID from the first public key object
      publicKey = jsonData.publicKey[0].id || String(jsonData.publicKey[0].id) || 'unknown-key';
    } else {
      publicKey = jsonData.publicKey;
    }
    
    return {
      name: jsonData.name,
      introductionURL: jsonData.introductionURL,
      publicKey: publicKey,
    };
  };

  const verifyWithIntroductionURL = async (introductionURL: string, otp: string, userPublicKey: string): Promise<boolean> => {
    try {
      const response = await fetch(introductionURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nonce: otp,
          bitcoinAddress: userPublicKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error verifying with introduction URL:', error);
      throw error;
    }
  };

  const handleAddIssuer = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Fetch and validate issuer JSON data
      const issuerJsonData = await fetchIssuerData(formData.url.trim());
      const validatedData = validateIssuerJson(issuerJsonData);

      // Step 2: Get user's wallet public key (we need wallet address for bitcoinAddress)
      const walletAddress = await WalletService.getWalletAddress();
      if (!walletAddress) {
        throw new Error('No wallet found. Please create a wallet first.');
      }

      // Step 3: Verify with introduction URL
      await verifyWithIntroductionURL(
        validatedData.introductionURL,
        formData.otp.trim(),
        walletAddress
      );

      // Step 4: Save issuer data to local storage
      const issuerData: IssuerDetails = {
        id: Date.now().toString(),
        name: validatedData.name,
        url: formData.url.trim(),
        publicKey: validatedData.publicKey,
        email: issuerJsonData.email || undefined,
        description: issuerJsonData.description || undefined,
        image: issuerJsonData.image || undefined, // Save base64 image
        addedAt: new Date(),
      };

      await StorageService.saveIssuer(issuerData);
      
      Alert.alert(
        'Success',
        `Issuer "${validatedData.name}" has been verified and added successfully!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error adding issuer:', error);
      let errorMessage = 'Failed to add issuer. Please try again.';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        errorMessage = 'Unable to fetch issuer data. Please check the URL and your internet connection.';
      } else if (error.message.includes('not valid JSON')) {
        errorMessage = 'Invalid issuer data format. The URL must return valid JSON data.';
      } else if (error.message.includes('Missing required field')) {
        errorMessage = `Invalid issuer data: ${error.message}`;
      } else if (error.message.includes('publicKey array is empty')) {
        errorMessage = 'Invalid issuer data: Public key information is missing.';
      } else if (error.message.includes('Verification failed')) {
        errorMessage = 'OTP verification failed. Please check your OTP and try again.';
      } else if (error.message.includes('No wallet found')) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (Object.values(formData).some(value => value.trim())) {
      Alert.alert(
        'Discard Changes?',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Add Issuer"
        showBackButton={true}
        onBackPress={handleCancel}
      />
      
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Add Issuer</Text>
            <Text style={styles.cardSubtitle}>
              Enter the issuer URL and verification OTP to add a trusted credential issuer
            </Text>

            {/* Issuer URL */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Issuer URL <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, errors.url && styles.errorInput]}
                placeholder="https://example.com/issuer.json"
                value={String(formData.url)}
                onChangeText={(value) => handleInputChange('url', value)}
                autoCapitalize="none"
                keyboardType="url"
              />
              {errors.url && <Text style={styles.errorText}>{String(errors.url)}</Text>}
            </View>

            {/* OTP */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                One-time code <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, errors.otp && styles.errorInput]}
                placeholder="Enter verification OTP"
                value={String(formData.otp)}
                onChangeText={(value) => handleInputChange('otp', value)}
                autoCapitalize="none"
                keyboardType="numeric"
                maxLength={6}
              />
              {errors.otp && <Text style={styles.errorText}>{String(errors.otp)}</Text>}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.button, styles.cancelButton]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAddIssuer}
              disabled={isLoading}
              style={[styles.button, styles.saveButton, isLoading && styles.disabledButton]}
            >
              <View style={styles.buttonContent}>
                <Icon name="save" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Adding...' : 'Add Issuer'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorInput: {
    borderColor: '#F44336',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default AddIssuerScreen;
