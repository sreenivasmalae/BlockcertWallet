import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { Button } from '@rneui/themed';
import { Camera, useCameraDevices, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../components/Header';
import { CredentialService } from '../services/CredentialService';
import { useNavigation } from '../hooks/useNavigation';

const { width } = Dimensions.get('window');

const ScanScreen: React.FC = () => {
  const navigation = useNavigation();
  const [scanning, setScanning] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Add processing lock
  
  const { hasPermission, requestPermission } = useCameraPermission();
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && scanning && !scanned && !isProcessing) {
        handleBarCodeRead(codes[0]);
      }
    },
  });

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const resetScan = useCallback(() => {
    setScanned(false);
    setScanning(true);
    setIsProcessing(false); // Reset processing lock
  }, []);

  const importCredential = useCallback(async (credentialData: string) => {
    try {
      const credentialService = CredentialService.getInstance();
      const credential = await credentialService.importCredential(
        credentialData, 
        'qr'
      );
      
      Alert.alert(
        'Success',
        'Credential imported successfully!',
        [
          { 
            text: 'View', 
            onPress: () => navigation.navigate('CredentialDetail', { credentialId: credential.id })
          },
          { text: 'OK', onPress: resetScan },
        ]
      );
    } catch (error: any) {
      console.error('Error importing credential:', error);
      
      let errorTitle = 'Import Error';
      let errorMessage = 'Failed to import the credential.';
      
      if (error.message) {
        if (error.message.includes('already exists')) {
          errorTitle = 'Credential Already Exists';
          errorMessage = error.message;
        } else if (error.message.includes('Invalid credential format')) {
          errorTitle = 'Invalid Format';
          errorMessage = 'The scanned content is not a valid credential format.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        errorTitle,
        errorMessage,
        [{ text: 'OK', onPress: resetScan }]
      );
    }
  }, [navigation, resetScan]);

  const fetchCredentialFromUrl = useCallback(async (url: string) => {
    try {
      console.log('Fetching credential from URL:', url);
      
      // Validate URL format
      try {
        const testUrl = new URL(url);
        console.log('URL is valid:', testUrl.href);
      } catch (urlError) {
        throw new Error('Invalid URL format');
      }
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'BlockcertsWallet/1.0',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const credentialData = await response.text();
      console.log('Credential data received:', credentialData.substring(0, 200) + '...');
      
      if (!credentialData || credentialData.trim() === '') {
        throw new Error('Empty response from URL');
      }
      
      await importCredential(credentialData);
    } catch (error: any) {
      console.error('Error fetching credential from URL:', error);
      
      let errorMessage = 'Failed to fetch credential from the URL.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (error.message.includes('Invalid URL format')) {
        errorMessage = 'Invalid URL format. Please check the URL and try again.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message.includes('HTTP')) {
        errorMessage = `Server error: ${error.message}`;
      } else if (error.message.includes('Empty response')) {
        errorMessage = 'The URL returned empty content. Please verify the URL is correct.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Fetch Error',
        errorMessage,
        [{ text: 'OK', onPress: resetScan }]
      );
    }
  }, [resetScan, importCredential]);

  const validateQRData = (data: any): { isValid: boolean; errorMessage?: string; type: 'issuer' | 'credential' } => {
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errorMessage: 'Invalid QR code: Data must be a valid JSON object',
        type: 'credential'
      };
    }

    console.log('Validating QR data:', data);
    
    // Check if it has either introductionURL or proof.proofValue
    const hasIntroductionURL = data.introductionURL && typeof data.introductionURL === 'string';
    const hasProofValue = data.proof && typeof data.proof === 'object' && data.proof.proofValue !== undefined;

    if (!hasIntroductionURL && !hasProofValue) {
      return {
        isValid: false,
        errorMessage: 'Invalid QR code: Must contain either introductionURL or proof.proofValue',
        type: 'credential'
      };
    }

    // If introductionURL is present, validate it has at most one parameter
    if (hasIntroductionURL) {
      try {
        const url = new URL(data.introductionURL);
        const paramCount = Array.from(url.searchParams.keys()).length;
        
        if (paramCount > 1) {
          return {
            isValid: false,
            errorMessage: 'Invalid QR code: introductionURL must have at most one parameter',
            type: 'issuer'
          };
        }
        
        return { isValid: true, type: 'issuer' };
      } catch (urlError) {
        return {
          isValid: false,
          errorMessage: 'Invalid QR code: introductionURL is not a valid URL',
          type: 'issuer'
        };
      }
    }

    // If we have proof.proofValue, it's a credential
    if (hasProofValue) {
      return { isValid: true, type: 'credential' };
    }

    return { isValid: true, type: 'credential' };
  };

  const handleCredentialImportFromQR = useCallback(async (qrJsonData: any) => {
    try {
      // Import the necessary services
      const { StorageService } = await import('../services/StorageService');
      const CryptoJS = await import('crypto-js');

      const jsonData = qrJsonData;
      const content = JSON.stringify(jsonData);

      console.log('Processing credential from QR:', Object.keys(jsonData));

      // Check if it has proof key (basic credential validation)
      if (!jsonData.proof) {
        throw new Error('This is not a valid credential - missing proof field');
      }

      // Extract credential ID for duplicate checking
      let credentialId: string = jsonData.id;
      console.log('Credential ID found:', credentialId);

      // Check for duplicate credentials
      if (credentialId) {
        console.log('Checking for duplicate credentials...');
        const duplicateCheck = await StorageService.checkCredentialExists(credentialId);
        
        if (duplicateCheck.exists) {
          const certificateName = jsonData.name || jsonData.credentialSubject?.name || 'this certificate';
          
          Alert.alert(
            'Credential Already Exists',
            `The credential "${certificateName}" is already available in your wallet under the issuer "${duplicateCheck.issuerName}". You cannot add the same credential twice.`,
            [{ text: 'OK', onPress: resetScan }]
          );
          return;
        }
      } else {
        console.log('No credential ID found, generating one...');
        // If no ID exists, generate one based on content hash to ensure uniqueness
        const contentHash = CryptoJS.SHA256(content).toString();
        jsonData.id = contentHash;
        credentialId = contentHash;
        
        // Check again with the generated ID
        const duplicateCheck = await StorageService.checkCredentialExists(contentHash);
        if (duplicateCheck.exists) {
          const certificateName = jsonData.name || jsonData.credentialSubject?.name || 'this certificate';
          Alert.alert(
            'Credential Already Exists',
            `The credential "${certificateName}" (or identical content) is already available in your wallet under the issuer "${duplicateCheck.issuerName}". You cannot add the same credential twice.`,
            [{ text: 'OK', onPress: resetScan }]
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
            const issuerText = await response.text();
            const issuerData = JSON.parse(issuerText);
            
            // Extract publicKey from issuer data
            if (Array.isArray(issuerData.publicKey)) {
              if (issuerData.publicKey.length > 0) {
                issuerPublicKey = issuerData.publicKey[0].id || JSON.stringify(issuerData.publicKey[0]);
              }
            } else if (issuerData.publicKey) {
              issuerPublicKey = issuerData.publicKey;
            }
            
            console.log('Extracted issuer public key:', issuerPublicKey);
            
            if (issuerPublicKey) {
              // Try to find matching issuer in stored issuers
              const storedIssuers = await StorageService.getIssuers();
              matchedIssuer = storedIssuers.find(issuer => 
                issuer.publicKey === issuerPublicKey ||
                issuer.url === issuerUrl
              );
              
              if (matchedIssuer) {
                console.log('Found matching issuer:', matchedIssuer.name);
              } else {
                console.log('No matching issuer found, creating new issuer entry');
                // Create a new issuer entry from the fetched data
                const newIssuer = {
                  id: Date.now().toString(),
                  name: issuerData.name || 'Unknown Issuer',
                  url: issuerUrl,
                  publicKey: issuerPublicKey,
                  email: issuerData.email,
                  description: issuerData.description,
                  image: issuerData.image,
                  addedAt: new Date(),
                };
                
                await StorageService.saveIssuer(newIssuer);
                matchedIssuer = newIssuer;
                console.log('Created new issuer:', newIssuer.name);
              }
            }
          }
        } catch (issuerError) {
          console.warn('Could not fetch issuer data:', issuerError);
        }
      }
      
      // If still no issuer found, create a default one from credential data
      if (!matchedIssuer && jsonData.issuer) {
        console.log('Creating default issuer from credential data');
        let issuerName = 'Unknown Issuer';
        let defaultIssuerUrl = '';
        
        if (typeof jsonData.issuer === 'object') {
          issuerName = jsonData.issuer.name || jsonData.issuer.id || 'Unknown Issuer';
          defaultIssuerUrl = jsonData.issuer.url || jsonData.issuer.id || '';
        } else if (typeof jsonData.issuer === 'string') {
          issuerName = jsonData.issuer;
          defaultIssuerUrl = jsonData.issuer;
        }
        
        const defaultIssuer = {
          id: Date.now().toString(),
          name: issuerName,
          url: defaultIssuerUrl,
          publicKey: issuerPublicKey || 'unknown',
          addedAt: new Date(),
        };
        
        await StorageService.saveIssuer(defaultIssuer);
        matchedIssuer = defaultIssuer;
        console.log('Created default issuer:', defaultIssuer.name);
      }

      // Initialize Certificate for verification
      let verificationResult: any = null;
      try {
        const { Certificate } = await import('@blockcerts/cert-verifier-js');
        const certificate = new Certificate(jsonData);
        await certificate.init();
        
        if (certificate.isFormatValid) {
          verificationResult = await certificate.verify();
          console.log('Verification result:', verificationResult);
        }
      } catch (verifyError) {
        console.warn('Verification failed:', verifyError);
      }

      // Prepare credential data for storage
      const credentialDataToSave = {
        id: credentialId,
        '@context': jsonData['@context'] || 'https://www.w3.org/2018/credentials/v1',
        type: jsonData.type || ['VerifiableCredential'],
        issuanceDate: jsonData.issuanceDate || new Date().toISOString(),
        credentialSubject: jsonData.credentialSubject,
        issuer: jsonData.issuer,
        proof: jsonData.proof,
        metadata: {
          title: jsonData.name || jsonData.credentialSubject?.name || 'Unnamed Certificate',
          description: jsonData.description || '',
          recipient: jsonData.credentialSubject?.name || 'Unknown Recipient',
          addedAt: new Date(),
          importedAt: new Date().toISOString(),
          source: 'qr' as const,
          fileSize: content.length,
          isVerified: verificationResult?.status === 'success',
          verificationStatus: verificationResult?.status === 'success' ? 'verified' as const : 'failed' as const,
          issuerId: matchedIssuer?.id || 'unknown',
          rawJson: content,
        },
      };

      // Save the credential
      await StorageService.saveCredential(credentialDataToSave);

      Alert.alert(
        'Success',
        'Credential imported successfully from QR code!',
        [
          { 
            text: 'View', 
            onPress: () => {
              resetScan();
              navigation.navigate('CredentialDetail', { credentialId: credentialDataToSave.id });
            }
          },
          { text: 'OK', onPress: resetScan },
        ]
      );

    } catch (error: any) {
      console.error('Error importing credential from QR:', error);
      Alert.alert(
        'Import Error',
        error.message || 'Failed to import credential from QR code.',
        [{ text: 'OK', onPress: resetScan }]
      );
    }
  }, [resetScan, navigation]);

  const handleAddIssuerFromQR = useCallback(async (qrData: any) => {
    try {
      // Import the necessary services and classes
      const { StorageService } = await import('../services/StorageService');
      const { WalletService } = await import('../services/WalletService');

      // Extract required data for issuer addition
      const issuerData = {
        name: qrData.name || 'Unknown Issuer',
        introductionURL: qrData.introductionURL,
        publicKey: qrData.publicKey,
        url: qrData.url || qrData.introductionURL, // Use URL if provided, otherwise use introductionURL
        email: qrData.email,
        description: qrData.description,
        image: qrData.image
      };

      // Validate required fields for issuer
      if (!issuerData.name || !issuerData.introductionURL || !issuerData.publicKey) {
        throw new Error('Missing required issuer fields: name, introductionURL, or publicKey');
      }

      // Get user's wallet address for verification
      const walletAddress = await WalletService.getWalletAddress();
      if (!walletAddress) {
        throw new Error('No wallet found. Please create a wallet first.');
      }

      // Ask user for OTP for verification
      Alert.prompt(
        'OTP Required',
        'Please enter the OTP for issuer verification:',
        [
          { text: 'Cancel', onPress: resetScan },
          {
            text: 'Verify',
            onPress: async (otp?: string) => {
              if (!otp?.trim()) {
                Alert.alert('Error', 'OTP is required for verification', [{ text: 'OK', onPress: resetScan }]);
                return;
              }

              try {
                // Verify with introduction URL
                const response = await fetch(issuerData.introductionURL, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    nonce: otp.trim(),
                    bitcoinAddress: walletAddress,
                  }),
                });

                if (!response.ok) {
                  throw new Error(`Verification failed: ${response.status}`);
                }

                // Save issuer data to local storage
                const finalIssuerData = {
                  id: Date.now().toString(),
                  name: issuerData.name,
                  url: issuerData.url,
                  publicKey: issuerData.publicKey,
                  email: issuerData.email,
                  description: issuerData.description,
                  image: issuerData.image,
                  addedAt: new Date(),
                };

                await StorageService.saveIssuer(finalIssuerData);

                Alert.alert(
                  'Success',
                  `Issuer "${issuerData.name}" has been verified and added successfully!`,
                  [{ text: 'OK', onPress: resetScan }]
                );
              } catch (verifyError: any) {
                console.error('Error verifying issuer:', verifyError);
                let errorMessage = 'Failed to verify issuer. Please try again.';
                
                if (verifyError.message.includes('Verification failed')) {
                  errorMessage = 'OTP verification failed. Please check your OTP and try again.';
                } else if (verifyError.message.includes('Network request failed')) {
                  errorMessage = 'Network error. Please check your internet connection.';
                }
                
                Alert.alert('Verification Error', errorMessage, [{ text: 'OK', onPress: resetScan }]);
              }
            }
          }
        ],
        'plain-text'
      );
    } catch (error: any) {
      console.error('Error handling issuer from QR:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to process issuer data from QR code.',
        [{ text: 'OK', onPress: resetScan }]
      );
    }
  }, [resetScan]);

  const handleBarCodeRead = useCallback(async (barcode: any) => {
    // Prevent multiple simultaneous processing
    if (scanned || isProcessing) {
      console.log('Scan already in progress, ignoring...');
      return;
    }
    
    console.log('Starting QR code processing...');
    setIsProcessing(true); // Lock immediately
    setScanned(true);
    setScanning(false);

    try {
      console.log('Barcode object:', barcode);
      const data = barcode.value || barcode.displayValue;
      if (!data) {
        throw new Error('No data received from QR code scan');
      }
      console.log('QR Code scanned data:', data);
      
      if (!data) {
        console.error('No data received from QR code');
        Alert.alert(
          'Error',
          'No data received from QR code',
          [{ text: 'OK', onPress: resetScan }]
        );
        return;
      }

      console.log('Processing QR data:', data);

      if (data.startsWith('http')) {
        // Fetch data from URL first
        try {
          console.log('Fetching from URL:', data);
          const response = await fetch(data);
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
          }
          
          const textContent = await response.text();
          console.log('Received URL content:', textContent);
          if (!textContent) {
            throw new Error('Empty response from URL');
          }
          let jsonData;
          
          try {
            console.log('Attempting to parse JSON from:', textContent);
            jsonData = JSON.parse(textContent);
            console.log('Successfully parsed JSON data:', JSON.stringify(jsonData, null, 2));
            
            if (!jsonData || typeof jsonData !== 'object') {
              throw new Error('Invalid JSON structure');
            }
          } catch (parseError) {
            console.log('Failed to parse as JSON, treating as credential URL');
            // If it's not JSON, treat it as credential URL
            Alert.alert(
              'Credential URL Detected',
              'Do you want to fetch the credential from this URL?',
              [
                { text: 'Cancel', onPress: resetScan },
                { text: 'Fetch', onPress: () => fetchCredentialFromUrl(data) },
              ]
            );
            return;
          }
          
          // Validate the fetched JSON data
          const validation = validateQRData(jsonData);
          if (!validation.isValid) {
            Alert.alert(
              'Invalid QR Code',
              validation.errorMessage || 'This QR code does not contain valid data.',
              [{ text: 'OK', onPress: resetScan }]
            );
            return;
          }
          
          // Handle based on the type of data
          if (validation.type === 'issuer') {
            await handleAddIssuerFromQR(jsonData);
          } else {
            await handleCredentialImportFromQR(jsonData);
          }
          
        } catch (fetchError) {
          console.error('Error fetching URL data:', fetchError);
          // Fallback to treating it as credential URL
          Alert.alert(
            'Credential URL Detected',
            'Do you want to fetch the credential from this URL?',
            [
              { text: 'Cancel', onPress: resetScan },
              { text: 'Fetch', onPress: () => fetchCredentialFromUrl(data) },
            ]
          );
        }
      } else {
        // Try to parse as JSON directly
        try {
          const jsonData = JSON.parse(data);
          
          // Validate the JSON data
          const validation = validateQRData(jsonData);
          if (!validation.isValid) {
            Alert.alert(
              'Invalid QR Code',
              validation.errorMessage || 'This QR code does not contain valid data.',
              [{ text: 'OK', onPress: resetScan }]
            );
            return;
          }
          
          // Handle based on the type of data
          if (validation.type === 'issuer') {
            await handleAddIssuerFromQR(jsonData);
          } else {
            await handleCredentialImportFromQR(jsonData);
          }
          if (!validation.isValid) {
            Alert.alert(
              'Invalid QR Code',
              validation.errorMessage || 'This QR code does not contain valid data.',
              [{ text: 'OK', onPress: resetScan }]
            );
            return;
          }
          
          // Handle as Add Issuer flow
          await handleAddIssuerFromQR(jsonData);
          
        } catch (parseError) {
          // If it's not JSON, try importing as credential
          try {
            await importCredential(data);
          } catch (importError) {
            Alert.alert(
              'Invalid QR Code',
              'This QR code does not contain valid credential or issuer data.',
              [{ text: 'OK', onPress: resetScan }]
            );
          }
        }
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert(
        'Error',
        'Failed to process the QR code data.',
        [{ text: 'OK', onPress: resetScan }]
      );
    } finally {
      // Always release the processing lock
      setIsProcessing(false);
      console.log('QR code processing completed');
    }
  }, [scanned, isProcessing, resetScan, fetchCredentialFromUrl, importCredential, handleAddIssuerFromQR, handleCredentialImportFromQR]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Header 
          title="Scan QR Code"
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centerContainer}>
          <Icon name="camera-alt" size={80} color="#ccc" />
          <Text style={styles.title}>Camera Permission Required</Text>
          <Text style={styles.subtitle}>
            Please grant camera permission to scan QR codes
          </Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            buttonStyle={styles.permissionButton}
          />
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Header 
          title="Scan QR Code"
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centerContainer}>
          <Icon name="camera-alt" size={80} color="#ccc" />
          <Text style={styles.title}>No Camera Available</Text>
          <Text style={styles.subtitle}>
            Cannot access camera device
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Scan QR Code"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Point your camera at a QR code to import credentials or add trusted issuers
        </Text>
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          style={styles.camera}
          device={device}
          isActive={scanning && !isProcessing}
          codeScanner={codeScanner}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            
            {/* Processing Overlay */}
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <View style={styles.processingContainer}>
                  <Icon name="hourglass-empty" size={40} color="#2196F3" />
                  <Text style={styles.processingText}>Processing QR Code...</Text>
                  <Text style={styles.processingSubtext}>Please wait</Text>
                </View>
              </View>
            )}
          </View>
        </Camera>
      </View>

      <View style={styles.footer}>
        {(scanned || isProcessing) && !isProcessing && (
          <Button
            title="Scan Again"
            onPress={resetScan}
            buttonStyle={styles.scanButton}
            icon={<Icon name="refresh" size={20} color="white" />}
          />
        )}
        {isProcessing && (
          <Text style={styles.subtitle}>Processing QR Code...</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanArea: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#2196F3',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#2196F3',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#2196F3',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#2196F3',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  scanButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 30,
  },
  permissionButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 30,
    marginTop: 20,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    minWidth: 200,
  },
  processingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default ScanScreen;
