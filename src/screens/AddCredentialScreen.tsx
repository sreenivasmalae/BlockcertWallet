import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Header } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { pick as DocumentPicker, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { Certificate } from '@blockcerts/cert-verifier-js';
import { StorageService } from '../services/StorageService';
import { BlockcertCredential } from '../types/blockcerts';
import RNFS from 'react-native-fs';
import CryptoJS from 'crypto-js';

const AddCredentialScreen: React.FC = () => {
  const navigation = useNavigation();
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleScanQR = () => {
    // Navigate to Scan QR screen (assuming this tab exists in navigation)
    // @ts-ignore - navigation type might need updating
    navigation.navigate('Scan');
  };

  const handleImportFromFile = async () => {
    try {
      const result = await DocumentPicker({
        type: [types.json],
        allowMultiSelection: false,
      });

      // In the new API, result is an array of picked documents
      if (result && result.length > 0) {
        const file = result[0];
        
        // Read file content
        const fileContent = await RNFS.readFile(file.uri, 'utf8');
        
        // Process the JSON credential
        await processCredentialJson(fileContent, 'file');
      }
    } catch (error: any) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        // User cancelled the picker
        return;
      }
      
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to read the selected file. Please try again.');
    }
  };

  const handleImportFromUrl = () => {
    setShowUrlModal(true);
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch content from URL
      const response = await fetch(urlInput.trim());
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }

      // Try to get content as text first
      const content = await response.text();

      // Process the credential
      await processCredentialJson(content, 'url');
      
      setShowUrlModal(false);
      setUrlInput('');
    } catch (error: any) {
      console.error('Error fetching from URL:', error);
      let errorMessage = 'Failed to fetch content from URL. Please check the URL and try again.';
      
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the URL. Please check your internet connection and the URL.';
      } else if (error.message.includes('not valid JSON')) {
        errorMessage = 'The content at the URL is not valid JSON format.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const processCredentialJson = async (content: string, source: 'file' | 'url') => {
    try {
      console.log('Processing credential content:', content.substring(0, 200) + '...');
      
      // First, try to parse as JSON
      let jsonData: any;
      try {
        jsonData = JSON.parse(content);
        console.log('JSON parsed successfully, keys:', Object.keys(jsonData));
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('The content is not valid JSON format');
      }

      // Check if it has proof key (basic credential validation)
      if (!jsonData.proof) {
        console.error('Missing proof field in JSON:', jsonData);
        throw new Error('This is not a valid credential - missing proof field');
      }

      // Extract credential ID for duplicate checking
      const credentialId = jsonData.id;
      console.log('Credential ID found:', credentialId);

      // Check for duplicate credentials
      if (credentialId) {
        console.log('Checking for duplicate credentials...');
        const duplicateCheck = await StorageService.checkCredentialExists(credentialId);
        
        if (duplicateCheck.exists) {
          console.log('Duplicate credential found:', duplicateCheck.credential);
          
          // Get certificate name for better user experience
          const certificateName = jsonData.name || jsonData.credentialSubject?.name || 'this certificate';
          
          Alert.alert(
            'Credential Already Exists',
            `The credential "${certificateName}" is already available in your wallet under the issuer "${duplicateCheck.issuerName}". You cannot add the same credential twice.`,
            [
              {
                text: 'OK',
                style: 'default',
                onPress: () => setIsLoading(false),
              },
            ]
          );
          return;
        }
      } else {
        console.log('No credential ID found, generating one...');
        // If no ID exists, generate one based on content hash to ensure uniqueness
        const contentHash = CryptoJS.SHA256(content).toString();
        jsonData.id = contentHash;
        
        // Check again with the generated ID
        const duplicateCheck = await StorageService.checkCredentialExists(contentHash);
        if (duplicateCheck.exists) {
          const certificateName = jsonData.name || jsonData.credentialSubject?.name || 'this certificate';
          Alert.alert(
            'Credential Already Exists',
            `The credential "${certificateName}" (or identical content) is already available in your wallet under the issuer "${duplicateCheck.issuerName}". You cannot add the same credential twice.`,
            [
              {
                text: 'OK',
                style: 'default',
                onPress: () => setIsLoading(false),
              },
            ]
          );
          return;
        }
      }

      console.log('No duplicate found, proceeding with issuer matching...');

      // Extract issuer URL from credential
      let issuerUrl = '';
      if (typeof jsonData.issuer === 'string') {
        issuerUrl = jsonData.issuer;
      } else if (jsonData.issuer && jsonData.issuer.id) {
        issuerUrl = jsonData.issuer.id;
      } else if (jsonData.issuer && jsonData.issuer.url) {
        issuerUrl = jsonData.issuer.url;
      }

      console.log('Extracted issuer URL:', issuerUrl);

      // Fetch issuer data to get publicKey for matching
      let issuerPublicKey = '';
      let matchedIssuer: any = null;
      
      if (issuerUrl) {
        try {
          console.log('Fetching issuer data from URL:', issuerUrl);
          const response = await fetch(issuerUrl);
          if (response.ok) {
            const issuerData = await response.json();
            console.log('Issuer data fetched:', issuerData);
            
            // Extract publicKey from issuer data
            if (Array.isArray(issuerData.publicKey) && issuerData.publicKey.length > 0) {
              issuerPublicKey = issuerData.publicKey[0].id || JSON.stringify(issuerData.publicKey[0]);
            } else if (typeof issuerData.publicKey === 'string') {
              issuerPublicKey = issuerData.publicKey;
            }
            
            console.log('Extracted issuer publicKey:', issuerPublicKey);
            
            // Find matching issuer in local storage
            if (issuerPublicKey) {
              const storedIssuers = await StorageService.getIssuers();
              matchedIssuer = storedIssuers.find(issuer => issuer.publicKey === issuerPublicKey);
              console.log('Matched issuer found:', matchedIssuer?.name || 'None');
            }
          }
        } catch (error) {
          console.warn('Failed to fetch issuer data:', error);
        }
      }

      // If no matching issuer found, warn the user
      if (!matchedIssuer) {
        Alert.alert(
          'Issuer Not Found',
          'This credential is from an issuer that is not yet added to your wallet. Please add the issuer first before importing credentials from them.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setIsLoading(false),
            },
            {
              text: 'Import Anyway',
              onPress: () => proceedWithCredentialImport(jsonData, content, source, matchedIssuer),
            },
          ]
        );
        return;
      }

      await proceedWithCredentialImport(jsonData, content, source, matchedIssuer);

    } catch (error: any) {
      console.error('Error processing credential:', error);
      let errorMessage = 'Failed to process the credential.';
      
      if (error.message.includes('not valid JSON')) {
        errorMessage = 'The content is not valid JSON format.';
      } else if (error.message.includes('missing proof field')) {
        errorMessage = 'This is not a valid credential - missing proof field.';
      } else if (error.message.includes('not a valid Blockcerts certificate')) {
        errorMessage = 'This is not a valid Blockcerts certificate format.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Invalid Credential', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const proceedWithCredentialImport = async (jsonData: any, content: string, source: 'file' | 'url', matchedIssuer: any) => {
    try {
      console.log('Proceeding with credential import...');

      // Use Blockcerts verifier to validate the certificate
      let certificate;
      let verificationResult;
      
      try {
        certificate = new Certificate(jsonData);
        console.log('Certificate instance created');
        
        await certificate.init();
        console.log('Certificate initialized successfully');

        // Check if the certificate format is valid
        if (!certificate.isFormatValid) {
          throw new Error('This is not a valid Blockcerts certificate');
        }
        console.log('Certificate format is valid');

        // Verify the certificate
        setIsLoading(true);
        console.log('Starting certificate verification...');
        verificationResult = await certificate.verify((step) => {
          console.log('Verification step:', step.code, step.status);
        });
        console.log('Verification completed:', verificationResult);
      } catch (verificationError: any) {
        console.warn('Certificate verification failed:', verificationError);
        // If verification fails, we'll still try to save the credential but mark it as unverified
        verificationResult = { status: 'failure', message: verificationError.message };
      }

      // Create credential object from validated certificate
      const credentialData: BlockcertCredential = {
        '@context': jsonData['@context'] || ['https://www.w3.org/2018/credentials/v1'],
        id: certificate?.id || jsonData.id || Date.now().toString(),
        type: jsonData.type || ['VerifiableCredential'],
        issuer: typeof jsonData.issuer === 'string' ? jsonData.issuer : {
          id: jsonData.issuer?.id || '',
          name: certificate?.issuer?.name || jsonData.issuer?.name || 'Unknown Issuer',
          url: certificate?.issuer?.url || jsonData.issuer?.url || '',
          email: certificate?.issuer?.email || jsonData.issuer?.email || '',
        },
        issuanceDate: certificate?.issuedOn || jsonData.issuanceDate || new Date().toISOString(),
        credentialSubject: jsonData.credentialSubject || {},
        proof: jsonData.proof,
        metadata: {
          title: certificate?.name || jsonData.name || jsonData.credentialSubject?.name || 'Unnamed Certificate',
          description: certificate?.description || jsonData.description || '',
          recipient: certificate?.recipientFullName || jsonData.credentialSubject?.name || 'Unknown Recipient',
          addedAt: new Date(),
          importedAt: new Date().toISOString(),
          source: source,
          fileSize: content.length,
          isVerified: verificationResult?.status === 'success',
          verificationStatus: verificationResult?.status === 'success' ? 'verified' : 'failed',
          // Store the issuer ID for association
          issuerId: matchedIssuer?.id,
          // Store the complete raw JSON for detailed view and re-verification
          rawJson: content,
        },
      };

      // Save the credential
      await StorageService.saveCredential(credentialData);

      Alert.alert(
        'Success',
        `Certificate "${credentialData.metadata?.title || 'Unnamed Certificate'}" has been successfully imported and ${verificationResult?.status === 'success' ? 'verified' : 'saved (verification failed)'}!${matchedIssuer ? ` Added under issuer: ${matchedIssuer.name}` : ''}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (error: any) {
      console.error('Error processing credential:', error);
      let errorMessage = 'Failed to process the credential.';
      
      if (error.message.includes('not valid JSON')) {
        errorMessage = 'The content is not valid JSON format.';
      } else if (error.message.includes('missing proof field')) {
        errorMessage = 'This is not a valid credential - missing proof field.';
      } else if (error.message.includes('not a valid Blockcerts certificate')) {
        errorMessage = 'This is not a valid Blockcerts certificate format.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Invalid Credential', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderUrlModal = () => (
    <Modal
      visible={showUrlModal}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setShowUrlModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <Header
          centerComponent={{
            text: 'Import from URL',
            style: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
          }}
          leftComponent={{
            icon: 'close',
            color: '#fff',
            onPress: () => {
              setShowUrlModal(false);
              setUrlInput('');
            },
          }}
          backgroundColor="#2196F3"
        />
        
        <KeyboardAvoidingView
          style={styles.modalContent}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.modalScrollView}>
            <Card containerStyle={styles.formCard}>
              <Text style={styles.modalTitle}>Import Credential from URL</Text>
              <Text style={styles.modalSubtitle}>
                Enter the URL of the credential JSON file to import
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Credential URL <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://example.com/credential.json"
                  value={urlInput}
                  onChangeText={setUrlInput}
                  autoCapitalize="none"
                  keyboardType="url"
                  multiline
                />
              </View>
            </Card>

            <View style={styles.buttonContainer}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowUrlModal(false);
                  setUrlInput('');
                }}
                buttonStyle={[styles.button, styles.cancelButton]}
                titleStyle={styles.cancelButtonText}
                type="outline"
              />
              <Button
                title="Import"
                onPress={handleUrlImport}
                loading={isLoading}
                disabled={isLoading || !urlInput.trim()}
                buttonStyle={[styles.button, styles.importButton]}
                titleStyle={styles.importButtonText}
                icon={
                  <Icon
                    name="download"
                    size={20}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                }
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        centerComponent={{
          text: 'Add Credential',
          style: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
        }}
        leftComponent={{
          icon: 'arrow-back',
          color: '#fff',
          onPress: () => navigation.goBack(),
        }}
        backgroundColor="#2196F3"
      />

      <ScrollView style={styles.content}>
        <Text style={styles.title}>How would you like to add a credential?</Text>
        
        <Card containerStyle={styles.optionCard}>
          <View style={styles.optionContent}>
            <Icon name="qr-code-scanner" size={48} color="#2196F3" />
            <Text style={styles.optionTitle}>Scan QR Code</Text>
            <Text style={styles.optionDescription}>
              Scan a QR code from your credential issuer to automatically add the credential
            </Text>
            <Button
              title="Scan QR Code"
              onPress={handleScanQR}
              buttonStyle={styles.optionButton}
              icon={<Icon name="qr-code-scanner" size={20} color="#fff" style={styles.buttonIcon} />}
            />
          </View>
        </Card>

        <Card containerStyle={styles.optionCard}>
          <View style={styles.optionContent}>
            <Icon name="link" size={48} color="#FF9800" />
            <Text style={styles.optionTitle}>Import from URL</Text>
            <Text style={styles.optionDescription}>
              Import a credential from a URL that provides a JSON credential file
            </Text>
            <Button
              title="Import from URL"
              onPress={handleImportFromUrl}
              buttonStyle={[styles.optionButton, styles.urlButton]}
              icon={<Icon name="link" size={20} color="#fff" style={styles.buttonIcon} />}
            />
          </View>
        </Card>

        {/* <Card containerStyle={styles.optionCard}>
          <View style={styles.optionContent}>
            <Icon name="upload-file" size={48} color="#4CAF50" />
            <Text style={styles.optionTitle}>Import from File</Text>
            <Text style={styles.optionDescription}>
              Upload a credential file (.json) from your device
            </Text>
            <Button
              title="Import from File"
              onPress={handleImportFromFile}
              buttonStyle={[styles.optionButton, styles.uploadButton]}
              icon={<Icon name="upload-file" size={20} color="#fff" style={styles.buttonIcon} />}
            />
          </View>
        </Card> */}
      </ScrollView>

      {renderUrlModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionCard: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionContent: {
    alignItems: 'center',
    padding: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  urlButton: {
    backgroundColor: '#FF9800',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
  },
  buttonIcon: {
    marginRight: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollView: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    borderRadius: 12,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
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
    minHeight: 80,
    textAlignVertical: 'top',
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
  },
  cancelButton: {
    borderColor: '#ddd',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: '#666',
  },
  importButton: {
    backgroundColor: '#2196F3',
  },
  importButtonText: {
    color: '#fff',
  },
});

export default AddCredentialScreen;
