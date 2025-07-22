// Pre-load polyfills with enhanced global variable handling
import '../utils/preloadPolyfill';

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  Modal,
  Share,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { convert } from 'react-native-pdf-to-image';
import PdfThumbnail, { type ThumbnailResult } from 'react-native-pdf-thumbnail';
// Import polyfills before blockcerts library
import '../utils/blockcertsPolyfill';
import { PdfCleanupService } from '../services/PdfCleanupService';
import Header from '../components/Header';

import RNFS from 'react-native-fs';




// Additional inline polyfill as safety measure
(() => {
  const locationObj = {
    host: 'localhost',
    hostname: 'localhost',
    href: 'https://localhost',
    origin: 'https://localhost',
    pathname: '/',
    port: '',
    protocol: 'https:',
    search: '',
    hash: ''
  };

  const documentObj = {
    createElement: (tagName: string) => ({
      tagName,
      style: {},
      setAttribute: () => {},
      getAttribute: () => null,
      removeAttribute: () => {},
      appendChild: () => {},
      removeChild: () => {},
      innerHTML: '',
      textContent: '',
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    getElementById: (id: string) => {
      console.log(`Inline polyfill - document.getElementById called with id: ${id}`);
      return null;
    },
    getElementsByTagName: (_tagName: string) => [],
    getElementsByClassName: (_className: string) => [],
    querySelector: (_selector: string) => null,
    querySelectorAll: (_selector: string) => [],
    createTextNode: (text: string) => ({ textContent: text }),
    documentElement: { style: {}, appendChild: () => {}, removeChild: () => {} },
    head: { appendChild: () => {}, removeChild: () => {} },
    body: { appendChild: () => {}, removeChild: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    cookie: ''
  };

  // Ensure location exists on all possible global references
  if (!(global as any).location) (global as any).location = locationObj;
  if (!(global as any).document) (global as any).document = documentObj;
  if ((global as any).window && !(global as any).window.location) (global as any).window.location = locationObj;
  if ((global as any).window && !(global as any).window.document) (global as any).window.document = documentObj;
  
  // Handle bundler global variables
  ['global$1', 'global$2', 'global$3'].forEach(varName => {
    if ((global as any)[varName] && !(global as any)[varName].location) {
      (global as any)[varName].location = locationObj;
    }
    if ((global as any)[varName] && !(global as any)[varName].document) {
      (global as any)[varName].document = documentObj;
    }
  });
})();

import { Certificate } from '@blockcerts/cert-verifier-js';
import { StorageService } from '../services/StorageService';
import { BlockcertCredential } from '../types/blockcerts';

type CredentialDetailsScreenRouteProp = RouteProp<{
  CredentialDetail: { credentialId: string };
}, 'CredentialDetail'>;

const CredentialDetailsScreen: React.FC = () => {
  const route = useRoute<CredentialDetailsScreenRouteProp>();
  const navigation = useNavigation();
  const { credentialId } = route.params;

  const [thumbnail, setThumbnail] = React.useState<
    ThumbnailResult | undefined
  >();


  const [credential, setCredential] = useState<BlockcertCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState<Array<{
    code: string;
    status: string;
    message?: string;
    timestamp: Date;
    errorMessage?: string;
  }>>([]);
  const [currentVerificationStep, setCurrentVerificationStep] = useState<number>(-1);
  const [finalVerificationResult, setFinalVerificationResult] = useState<any>(null);
  
  // Certificate content states
  const [certificateImageUrl, setCertificateImageUrl] = useState<string | null>(null);
  const [certificateContentType, setCertificateContentType] = useState<'image' | null>(null);
  const [certificateContentLoading, setCertificateContentLoading] = useState(false); // Start as false
  const [certificateContentError, setCertificateContentError] = useState<string | null>(null);
  const [issuerName, setIssuerName] = useState<string>('Loading...');
  const [originalArweaveUrl, setOriginalArweaveUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadCredential = async () => {
      try {
        console.log('Loading credential with ID:', credentialId);
        const credentialData = await StorageService.getCredentialById(credentialId);
        console.log('Credential data loaded:', !!credentialData);
        
        if (!credentialData) {
          console.error('Credential not found for ID:', credentialId);
          Alert.alert('Error', 'Credential not found');
          navigation.goBack();
          return;
        }
        console.log('Setting credential data');
        setCredential(credentialData);
      } catch (error) {
        console.error('Error loading credential:', error);
        Alert.alert('Error', 'Failed to load credential');
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };
    
    loadCredential();
  }, [credentialId, navigation]);

  // Cleanup effect - clean up any temporary files when component unmounts
  useEffect(() => {
    return () => {
      console.log('CredentialDetailsScreen unmounting, performing cleanup...');
      // Clean up any old PDFs that might be left over
      PdfCleanupService.cleanupOldPdfs(0.5) // Clean files older than 30 minutes
        .catch(error => console.error('Error during component cleanup:', error));
    };
  }, []);

  // Function to extract salt (transaction ID) from credential JSON
  const extractSaltFromCredential = (rawJson: string): string | null => {
    try {
      const jsonData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      return jsonData.salt || null;
    } catch (error) {
      console.error('Error parsing credential JSON for salt:', error);
      return null;
    }
  };

  // Function to fetch certificate content from Arweave
  const fetchCertificateContent = useCallback(async (transactionId: string): Promise<void> => {
    try {
      setCertificateContentLoading(true);
      setCertificateContentError(null);
      setCertificateImageUrl(null);
      setCertificateContentType(null);

      // Try multiple Arweave gateways for better compatibility
      const arweaveGateways = [
        `https://arweave.net/${transactionId}`
      ];

      // Store the original Arweave URL for browser opening
      setOriginalArweaveUrl(arweaveGateways[0]);

      let successfulUrl: string | null = null;
      let contentType = '';

      console.log('Trying multiple Arweave gateways for transaction:', transactionId);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000); // 15 second timeout
      });

      // Try each gateway until one works
      for (const arweaveUrl of arweaveGateways) {
        try {
          console.log('Trying gateway:', arweaveUrl);

          // First try to get content type with HEAD request
          try {
            const headRequest = fetch(arweaveUrl, { 
              method: 'HEAD',
              headers: {
                'Accept': 'image/*,*/*',
                'User-Agent': 'BlockcertsWallet/1.0'
              }
            });
            
            const response = await Promise.race([headRequest, timeoutPromise]) as Response;
            
            if (response.ok) {
              contentType = response.headers.get('content-type') || '';
              console.log('Content type from HEAD:', contentType, 'Gateway:', arweaveUrl);
              successfulUrl = arweaveUrl;
              break;
            } else {
              console.warn(`HEAD request failed for ${arweaveUrl} with status ${response.status}`);
            }
          } catch (headError) {
            console.warn(`HEAD request failed for ${arweaveUrl}:`, headError);
          }

          // If HEAD failed, try GET request
          if (!successfulUrl) {
            console.log('Trying GET request for:', arweaveUrl);
            const getRequest = fetch(arweaveUrl, {
              headers: {
                'Accept': 'image/*,*/*',
                'User-Agent': 'BlockcertsWallet/1.0'
              }
            });
            const fullResponse = await Promise.race([getRequest, timeoutPromise]) as Response;
            
            if (fullResponse.ok) {
              contentType = fullResponse.headers.get('content-type') || '';
              console.log('Content type from GET:', contentType, 'Gateway:', arweaveUrl);
              
              // If we still don't have content type, try to determine from the response
              if (!contentType) {
                const arrayBuffer = await fullResponse.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // Check for common image formats
                if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
                  contentType = 'image/jpeg';
                  console.log('Detected JPEG from file signature');
                }
                else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && 
                         uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
                  contentType = 'image/png';
                  console.log('Detected PNG from file signature');
                }
                // Check for PDF format
                else if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && 
                         uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
                  contentType = 'application/pdf';
                  console.log('Detected PDF from file signature');
                }
              }
              
              successfulUrl = arweaveUrl;
              
              break;
            } else {
              console.warn(`GET request failed for ${arweaveUrl} with status ${fullResponse.status}`);
            }
          }
        } catch (gatewayError) {
          console.warn(`Gateway ${arweaveUrl} failed:`, gatewayError);
          continue; // Try next gateway
        }
      }

      if (!successfulUrl) {
        throw new Error('All Arweave gateways failed to respond');
      }

      console.log('Successfully found content at:', successfulUrl);
      console.log('Final content type determined:', contentType);

      // Handle different content types
      if (contentType.includes('image/')) {
        console.log('Setting content as image');
        setCertificateImageUrl(successfulUrl);
        setCertificateContentType('image');
      } else if (contentType.includes('application/pdf') || contentType.includes('pdf')) {
        console.log('PDF detected, converting to thumbnail...');
        
        // For iOS, provide additional PDF handling options
        if (Platform.OS === 'ios') {
          console.log('iOS PDF detected - implementing iOS-specific handling...');
          
          // Store the PDF URL for direct viewing option
          setOriginalArweaveUrl(successfulUrl);
          
          // Try thumbnail generation first, but with iOS-specific error handling
          try {
            await convertArweavePdfToThumbnail(successfulUrl);
          } catch (iosError) {
            console.log('iOS PDF thumbnail failed, offering browser alternative...');
            
            // Instead of showing error immediately, offer browser option
            setCertificateContentError(null);
            setCertificateImageUrl(null);
            setCertificateContentType(null);
            
            // Show iOS-specific PDF message
            Alert.alert(
              'PDF Certificate - iOS',
              'This PDF certificate can be viewed in Safari for better compatibility. Would you like to open it now?',
              [
                {
                  text: 'Open in Safari',
                  onPress: async () => {
                    try {
                      const canOpen = await Linking.canOpenURL(successfulUrl!);
                      if (canOpen) {
                        await Linking.openURL(successfulUrl!);
                        // Set a placeholder message
                        setCertificateContentError('PDF opened in Safari. Return here to verify the certificate.');
                      } else {
                        setCertificateContentError('Cannot open PDF in Safari. Please use verification instead.');
                      }
                    } catch (linkError) {
                      console.error('Failed to open PDF in Safari:', linkError);
                      setCertificateContentError('PDF viewing not available. Please use verification feature.');
                    }
                  }
                },
                {
                  text: 'Try Thumbnail',
                  onPress: async () => {
                    // Force retry thumbnail generation
                    try {
                      await convertArweavePdfToThumbnail(successfulUrl!);
                    } catch (retryError) {
                      setCertificateContentError('PDF thumbnail generation failed. Use verification feature instead.');
                    }
                  }
                },
                {
                  text: 'Skip PDF',
                  style: 'cancel',
                  onPress: () => {
                    setCertificateContentError('PDF display skipped. You can still verify this certificate.');
                  }
                }
              ]
            );
          }
        } else {
          // Android or other platforms - use existing logic
          await convertArweavePdfToThumbnail(successfulUrl);
        }
      } else {
        // Fallback: try to determine from URL
        const urlLower = successfulUrl.toLowerCase();
        if (urlLower.includes('.jpg') || urlLower.includes('.jpeg') || 
            urlLower.includes('.png') || urlLower.includes('.gif')) {
          console.log('Assuming image based on URL');
          setCertificateImageUrl(successfulUrl);
          setCertificateContentType('image');
        } else if (urlLower.includes('.pdf')) {
          console.log('Assuming PDF based on URL, converting to thumbnail...');
          await convertArweavePdfToThumbnail(successfulUrl);
        } else {
          console.log('Unknown content type detected, skipping display');
          setCertificateContentError('Certificate content format is not supported. Only image and PDF certificates can be displayed.');
        }
      }
    } catch (error) {
      console.error('Error fetching certificate content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load certificate content';
      setCertificateContentError(errorMessage);
    } finally {
      setCertificateContentLoading(false);
    }
  }, []);

  // Helper function to check and request permissions
  const checkAndRequestPermissions = async (): Promise<boolean> => {
    try {
      console.log('Checking device platform and permissions for PDF processing...');
      
      if (Platform.OS === 'ios') {
        console.log('iOS platform - no storage permissions required for app documents');
        return true;
      }
      
      // For Android - we're only writing to app's private directory
      // No permissions needed for DocumentDirectoryPath since Android 4.4
      console.log('Android platform - using app private directory, no permissions needed');
      return true;
      
    } catch (error) {
      console.error('Error checking permissions:', error);
      // Even if there's an error, we can still proceed since we're using app's private directory
      console.log('Proceeding without permission check for app private directory');
      return true;
    }
  };

  // Helper function to verify PDF file
  const verifyPdfFile = async (filePath: string): Promise<{isValid: boolean; error?: string; size?: number}> => {
    try {
      console.log('Verifying PDF file at:', filePath);
      
      // Check if file exists
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        return { isValid: false, error: 'File does not exist' };
      }
      
      // Get file stats
      const fileStats = await RNFS.stat(filePath);
      console.log('File stats:', {
        size: fileStats.size,
        isFile: fileStats.isFile(),
        isDirectory: fileStats.isDirectory(),
        mtime: fileStats.mtime,
      });
      
      if (fileStats.size === 0) {
        return { isValid: false, error: 'File is empty' };
      }
      
      if (fileStats.size < 100) {
        return { isValid: false, error: 'File too small to be a valid PDF' };
      }
      
      // Try to read first few bytes to verify it's a PDF
      try {
        const firstBytes = await RNFS.read(filePath, 4, 0, 'ascii');
        console.log('First bytes of file:', firstBytes);
        
        if (!firstBytes.startsWith('%PDF')) {
          return { isValid: false, error: 'File is not a valid PDF (missing PDF header)' };
        }
      } catch (readError) {
        console.warn('Could not read file header:', readError);
        // Continue anyway, the file might still be valid
      }
      
      return { isValid: true, size: fileStats.size };
      
    } catch (error) {
      console.error('Error verifying PDF file:', error);
      return { isValid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Alternative PDF to image conversion using react-native-pdf-to-image
  const convertPdfToImageAsFallback = async (filePath: string): Promise<any> => {
    try {
      console.log('Attempting PDF to image conversion as fallback:', filePath);
      
      const result = await convert(filePath);
      
      if (result && result.outputFiles && result.outputFiles.length > 0) {
        const imagePath = result.outputFiles[0];
        console.log('PDF to image conversion successful:', imagePath);
        
        // Return in the same format as PdfThumbnail.generate
        return {
          uri: `file://${imagePath}`,
          width: 800, // Default width
          height: 600 // Default height
        };
      } else {
        throw new Error('PDF to image conversion returned no output files');
      }
    } catch (error) {
      console.error('PDF to image conversion failed:', error);
      throw error;
    }
  };

  // iOS-specific PDF thumbnail generation using correct API
  const generateiOSPdfThumbnail = async (filePath: string): Promise<any> => {
    try {
      console.log('Attempting iOS-specific PDF thumbnail generation for:', filePath);
      
      // Ensure we have the correct file:// prefix for iOS
      const iOSFilePath = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
      console.log('iOS file path:', iOSFilePath);
      
      // For iOS, try with different quality settings progressively
      const iosAttempts = [
        { quality: 85, name: 'High Quality (85%)' },
        { quality: 70, name: 'Medium Quality (70%)' },
        { quality: 50, name: 'Low Quality (50%)' },
        { quality: 30, name: 'Basic Quality (30%)' },
      ];

      for (const attempt of iosAttempts) {
        try {
          console.log(`Trying iOS PDF generation with ${attempt.name}...`);
          
          // Use page 0 (first page) with specific quality
          const result = await Promise.race([
            PdfThumbnail.generate(iOSFilePath, 0, attempt.quality),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`iOS PDF timeout for ${attempt.name}`)), 15000)
            )
          ]);
          
          if (result && (result as any).uri) {
            console.log(`✅ iOS PDF thumbnail successful with ${attempt.name}:`, {
              uri: (result as any).uri,
              width: (result as any).width,
              height: (result as any).height,
              quality: attempt.quality
            });
            return result;
          } else {
            console.log(`❌ iOS PDF ${attempt.name} returned invalid result:`, result);
            continue;
          }
        } catch (attemptError) {
          const errorMsg = attemptError instanceof Error ? attemptError.message : 'Unknown error';
          console.log(`❌ iOS PDF ${attempt.name} failed:`, errorMsg);
          
          // If it's a timeout or native module error, continue to next quality
          if (errorMsg.includes('timeout') || errorMsg.includes('native')) {
            continue;
          }
          
          // For other errors, still try next quality but log the specific error
          console.warn(`iOS PDF generation error with ${attempt.name}:`, attemptError);
          continue;
        }
      }
      
      throw new Error('All iOS PDF generation quality attempts failed');
    } catch (error) {
      console.error('iOS PDF thumbnail generation completely failed:', error);
      throw error;
    }
  };

  // Alternative iOS PDF handling - try to open in browser instead or use generateAllPages
  const handleiOSPdfFallback = async (): Promise<void> => {
    try {
      console.log('Attempting iOS PDF browser fallback...');
      
      if (originalArweaveUrl) {
        // For iOS, we can try to open the PDF directly in Safari
        const canOpen = await Linking.canOpenURL(originalArweaveUrl);
        if (canOpen) {
          Alert.alert(
            'PDF Display Alternative',
            'Would you like to open this certificate in Safari for better PDF viewing? Safari has excellent PDF support on iOS.',
            [
              {
                text: 'Open in Safari',
                onPress: async () => {
                  try {
                    await Linking.openURL(originalArweaveUrl);
                    setCertificateContentError('PDF opened in Safari. Return here to verify the certificate.');
                  } catch (linkError) {
                    console.error('Failed to open in Safari:', linkError);
                    setCertificateContentError('PDF display not available - please verify certificate instead');
                  }
                }
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setCertificateContentError('PDF display not available on this device - please use verification instead');
                }
              }
            ]
          );
          return;
        }
      }
      
      // If we can't open in browser, show error
      setCertificateContentError('PDF display not supported on this iOS device');
      
    } catch (error) {
      console.error('iOS PDF fallback failed:', error);
      setCertificateContentError('PDF display not available - please verify certificate instead');
    }
  };

  // Helper function to generate thumbnail with fallback methods
  const generateThumbnailWithFallbacks = async (filePath: string): Promise<any> => {
    console.log('Attempting to generate thumbnail for:', filePath);
    
    // First, let's verify the file exists and get its stats
    try {
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error(`PDF file does not exist: ${filePath}`);
      }
      
      const fileStats = await RNFS.stat(filePath);
      console.log('PDF file stats for thumbnail generation:', {
        size: fileStats.size,
        isFile: fileStats.isFile(),
        path: filePath
      });
      
      if (fileStats.size === 0) {
        throw new Error('PDF file is empty');
      }
    } catch (statError) {
      console.error('Error checking PDF file for thumbnail generation:', statError);
      throw new Error(`Cannot access PDF file: ${statError instanceof Error ? statError.message : 'Unknown error'}`);
    }
    
    // Define methods with iOS-specific optimizations using correct API
    const methods = Platform.OS === 'ios' ? [
      { name: 'iOS Optimized', call: () => generateiOSPdfThumbnail(filePath) },
      { name: 'iOS High Quality', call: () => PdfThumbnail.generate(`file://${filePath}`, 0, 85) },
      { name: 'iOS Medium Quality', call: () => PdfThumbnail.generate(`file://${filePath}`, 0, 70) },
      { name: 'iOS Basic Quality', call: () => PdfThumbnail.generate(`file://${filePath}`, 0, 50) },
      { name: 'iOS Default', call: () => PdfThumbnail.generate(`file://${filePath}`, 0) },
      { name: 'PDF to Image Fallback', call: () => convertPdfToImageAsFallback(filePath) },
    ] : [
      { name: 'Android High Quality', call: () => PdfThumbnail.generate(filePath, 0, 85) },
      { name: 'Android Medium Quality', call: () => PdfThumbnail.generate(filePath, 0, 70) },
      { name: 'Android Basic Quality', call: () => PdfThumbnail.generate(filePath, 0, 50) },
      { name: 'Android Default', call: () => PdfThumbnail.generate(filePath, 0) },
      { name: 'PDF to Image Fallback', call: () => convertPdfToImageAsFallback(filePath) },
    ];
    
    let lastError: Error | null = null;
    
    for (const method of methods) {
      try {
        console.log(`Trying ${method.name} method...`);
        
        // Add timeout to prevent hanging - shorter timeout for iOS
        const timeoutDuration = Platform.OS === 'ios' ? 20000 : 30000;
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Thumbnail generation timeout')), timeoutDuration);
        });
        
        const result: any = await Promise.race([method.call(), timeoutPromise]);
        
        if (result && result.uri) {
          console.log(`✅ ${method.name} method succeeded:`, {
            uri: result.uri,
            width: result.width,
            height: result.height
          });
          return result;
        } else {
          console.log(`❌ ${method.name} method returned invalid result:`, result);
          lastError = new Error(`Invalid result from ${method.name}: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ ${method.name} method failed:`, errorMessage);
        lastError = error instanceof Error ? error : new Error(errorMessage);
        
        // Log more details for debugging
        if (errorMessage.includes('native')) {
          console.error(`Native module error in ${method.name}:`, error);
        }
        continue;
      }
    }
    
    // If we're on iOS and all methods failed, try the browser fallback
    if (Platform.OS === 'ios') {
      console.log('All iOS thumbnail methods failed, attempting browser fallback...');
      try {
        await handleiOSPdfFallback();
        // This won't return a thumbnail, but will handle the user experience
        throw new Error('iOS PDF fallback initiated - no thumbnail generated');
      } catch (fallbackError) {
        console.error('iOS fallback also failed:', fallbackError);
      }
    }
    
    // Provide more detailed error message
    const detailedError = new Error(
      `All thumbnail generation methods failed. Last error: ${lastError?.message || 'Unknown'}. ` +
      `File: ${filePath}. This might be due to: 1) Corrupted PDF file, 2) Unsupported PDF format, ` +
      `3) Native module issue, or 4) Memory constraints.`
    );
    
    console.error('Detailed thumbnail generation error:', detailedError.message);
    throw detailedError;
  };

  // Helper function to process thumbnail for display
  const processThumbnailForDisplay = async (thumbnailResult: any): Promise<void> => {
    try {
      console.log('Processing thumbnail for display:', thumbnailResult);
      
      const { uri, width, height } = thumbnailResult;
      
      // Clean the URI (remove file:// prefix if present)
      const cleanUri = uri.replace('file://', '');
      
      // Verify thumbnail file exists
      const thumbnailExists = await RNFS.exists(cleanUri);
      if (!thumbnailExists) {
        throw new Error('Generated thumbnail file does not exist');
      }
      
      // Get thumbnail file stats
      const thumbnailStats = await RNFS.stat(cleanUri);
      console.log('Thumbnail file stats:', {
        size: thumbnailStats.size,
        dimensions: `${width}x${height}`,
        path: cleanUri
      });
      
      // Convert to base64 for display
      const base64Data = await RNFS.readFile(cleanUri, 'base64');
      const imageDataUri = `data:image/jpeg;base64,${base64Data}`;
      
      console.log('Thumbnail converted to base64, length:', base64Data.length);
      
      // Update UI state
      setCertificateImageUrl(imageDataUri);
      setCertificateContentType('image');
      setCertificateContentError(null);
      
      
      // Clean up thumbnail file after a delay
      setTimeout(async () => {
        try {
          await RNFS.unlink(cleanUri);
          console.log('Thumbnail file cleaned up');
        } catch (cleanupError) {
          console.warn('Failed to cleanup thumbnail file:', cleanupError);
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error processing thumbnail for display:', error);
      
      // Fallback: try to use the URI directly
      try {
        setCertificateImageUrl(thumbnailResult.uri);
        setCertificateContentType('image');
        setCertificateContentError(null);
        
        Alert.alert(
          'Partial Success',
          'PDF thumbnail generated but base64 conversion failed. Displaying direct file URI.',
          [{ text: 'OK' }]
        );
      } catch (fallbackError) {
        console.error('Fallback display method also failed:', fallbackError);
        setCertificateContentError('PDF thumbnail generated but cannot be displayed');
      }
    }
  };

  // Helper function to delete files
  const deleteFile = async (filePath: string) => {
    try {
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
        console.log('File deleted:', filePath);
      } else {
        console.log('File does not exist:', filePath);
      }
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  // Function to convert Arweave PDF to thumbnail with caching
  const convertArweavePdfToThumbnail = useCallback(async (pdfUrl: string): Promise<void> => {
    try {
      console.log('Converting Arweave PDF to thumbnail:', pdfUrl);
      
      // iOS-specific pre-checks
      if (Platform.OS === 'ios') {
        console.log('iOS detected - using PDFKit for thumbnail generation (requires iOS 11+)');
      }
      
      // Check permissions first
      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error('Storage permissions required for PDF conversion');
      }

      // Create a more readable filename based on URL hash
      const urlHash = pdfUrl.split('/').pop() || 'unknown';
      const cachedFileName = `cached_pdf_${urlHash}.pdf`;
      const cachedFilePath = `${RNFS.DocumentDirectoryPath}/${cachedFileName}`;
      
      let finalFilePath: string | null = null;
      
      // Check if we already have this PDF cached
      const cachedFileExists = await RNFS.exists(cachedFilePath);
      if (cachedFileExists) {
        console.log('Found cached PDF file:', cachedFilePath);
        
        // Verify the cached file is still valid
        const fileVerification = await verifyPdfFile(cachedFilePath);
        if (fileVerification.isValid) {
          console.log('Cached PDF is valid, using it for thumbnail generation');
          finalFilePath = cachedFilePath;
        } else {
          console.log('Cached PDF is invalid, will re-download');
          await PdfCleanupService.cleanupSpecificPdf(cachedFileName);
          finalFilePath = null;
        }
      } else {
        console.log('No cached PDF file found at:', cachedFilePath);
        finalFilePath = null;
      }
      
      // If we don't have a valid cached file, download it
      if (!finalFilePath) {
        console.log('Downloading PDF from URL:', pdfUrl);
        console.log('Saving to cached path:', cachedFilePath);
        
        try {
          const downloadResult = await RNFS.downloadFile({
            fromUrl: pdfUrl,
            toFile: cachedFilePath,
            headers: {
              'Accept': 'application/pdf,*/*',
              'User-Agent': 'BlockcertsWallet/1.0'
            }
          }).promise;

          console.log('Download completed with status code:', downloadResult.statusCode);
          console.log('Downloaded bytes:', downloadResult.bytesWritten);

          if (downloadResult.statusCode !== 200) {
            throw new Error(`Failed to download PDF: HTTP ${downloadResult.statusCode}`);
          }

          if (downloadResult.bytesWritten === 0) {
            throw new Error('Downloaded file is empty (0 bytes)');
          }

          // Verify the downloaded file exists
          const downloadedFileExists = await RNFS.exists(cachedFilePath);
          if (!downloadedFileExists) {
            throw new Error('Downloaded file does not exist after download completion');
          }

          // Verify the downloaded file
          console.log('Verifying downloaded PDF file...');
          const fileVerification = await verifyPdfFile(cachedFilePath);
          if (!fileVerification.isValid) {
            throw new Error(`Invalid downloaded PDF file: ${fileVerification.error}`);
          }
          
          console.log('Downloaded PDF file is valid:', {
            path: cachedFilePath,
            size: fileVerification.size,
            isValid: fileVerification.isValid
          });
          
          finalFilePath = cachedFilePath;
          
        } catch (downloadError) {
          console.error('PDF download error:', downloadError);
          
          // Clean up partial download if it exists
          try {
            const partialFileExists = await RNFS.exists(cachedFilePath);
            if (partialFileExists) {
              await RNFS.unlink(cachedFilePath);
              console.log('Cleaned up partial download');
            }
          } catch (cleanupError) {
            console.warn('Failed to clean up partial download:', cleanupError);
          }
          
          throw downloadError;
        }
      }

      // Final validation before thumbnail generation
      if (!finalFilePath) {
        throw new Error('PDF file path is not available');
      }

      // Double-check that the final file exists
      const finalFileExists = await RNFS.exists(finalFilePath);
      if (!finalFileExists) {
        throw new Error(`PDF file does not exist: ${finalFilePath}`);
      }

      console.log('PDF ready for thumbnail generation:', finalFilePath);

      // Generate thumbnail using PdfThumbnail
      const thumbnailResult = await generateThumbnailWithFallbacks(finalFilePath);
      if (!thumbnailResult) {
        throw new Error('Failed to generate thumbnail from PDF');
      }

      console.log('Thumbnail generated successfully:', thumbnailResult);

      // Process thumbnail for display
      await processThumbnailForDisplay(thumbnailResult);

      // Note: We keep the cached PDF file for reuse, cleanup will be handled by PdfCleanupService

    } catch (error) {
      console.error('Error converting Arweave PDF to thumbnail:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to convert PDF to thumbnail';
      
      // Show different error messages based on the error type
      if (errorMessage.includes('All thumbnail generation methods failed')) {
        // Check if this is an iOS-specific issue
        if (Platform.OS === 'ios') {
          setCertificateContentError(
            'Unable to display PDF certificate on iOS. This could be due to: (1) PDF compatibility issues with iOS, (2) Memory constraints, or (3) Native module configuration. You can still verify the certificate using the "Verify" button.'
          );
          
          // Show iOS-specific alert with additional options
          Alert.alert(
            'PDF Display Issue on iOS',
            'We encountered an issue displaying this PDF certificate on iOS. This is a known limitation with certain PDF formats.\n\nWould you like to:\n• Open the certificate in browser for viewing\n• Or verify its authenticity instead?',
            [
              { 
                text: 'Open in Browser', 
                onPress: async () => {
                  try {
                    if (originalArweaveUrl) {
                      const canOpen = await Linking.canOpenURL(originalArweaveUrl);
                      if (canOpen) {
                        await Linking.openURL(originalArweaveUrl);
                      } else {
                        Alert.alert('Error', 'Cannot open browser');
                      }
                    } else {
                      Alert.alert('Error', 'Certificate URL not available');
                    }
                  } catch (linkError) {
                    console.error('Error opening browser:', linkError);
                    Alert.alert('Error', 'Failed to open certificate in browser');
                  }
                }
              },
              { text: 'Verify Certificate', onPress: () => handleVerifyCredential() },
              { text: 'OK' }
            ]
          );
        } else {
          setCertificateContentError(
            'Unable to display PDF certificate. The PDF format may not be supported or the file may be corrupted. ' +
            'This could be due to: (1) An unsupported PDF version, (2) Password protection, or (3) Corrupted file data.'
          );
          
          // Show user-friendly alert
          Alert.alert(
            'PDF Display Issue',
            'We encountered an issue displaying this PDF certificate. The PDF might be using an unsupported format or could be corrupted.\n\n' +
            'You can still verify the certificate validity using the "Verify" button.',
            [{ text: 'OK' }]
          );
        }
      } else {
        setCertificateContentError(`PDF conversion failed: ${errorMessage}`);
      }
    }
  }, []);

  // Load certificate content when credential is loaded
  useEffect(() => {
    const loadCertificateContent = async () => {
      try {
        if (credential?.metadata?.rawJson) {
          const salt = extractSaltFromCredential(credential.metadata.rawJson);
          if (salt) {
            console.log('Found salt (transaction ID):', salt);
            // Don't await this - let it load in the background
            fetchCertificateContent(salt).catch(error => {
              console.error('Background certificate content loading failed:', error);
              setCertificateContentError('Certificate content unavailable');
              setCertificateContentLoading(false);
            });
          } else {
            console.log('No salt found in credential JSON');
            // Clear loading state even if no salt found
            setCertificateContentLoading(false);
          }
        } else {
          console.log('No raw JSON found in credential metadata');
          setCertificateContentLoading(false);
        }
      } catch (error) {
        console.error('Error in loadCertificateContent:', error);
        setCertificateContentError('Failed to load certificate content');
        setCertificateContentLoading(false);
      }
    };

    if (credential) {
      loadCertificateContent();
    }
  }, [credential, fetchCertificateContent]);

  // Helper function to get issuer name from URL
  const getIssuerName = useCallback(async (rawJson: string): Promise<string> => {
    try {
      console.log('Parsing raw JSON for issuer name:', rawJson);
      
      // Convert rawJson to JSON object
      const jsonData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      console.log('Parsed JSON data for issuer extraction:', jsonData);
      
      if (jsonData.issuer) {
        let issuerUrl: string | null = null;
        
        // Extract issuer URL
        if (typeof jsonData.issuer === 'string') {
          issuerUrl = jsonData.issuer;
        } else if (jsonData.issuer.id) {
          issuerUrl = jsonData.issuer.id;
        } else if (jsonData.issuer.name) {
          // If we already have the name, return it directly
          return jsonData.issuer.name;
        }
        
        // If we have an issuer URL, fetch the data from it
        if (issuerUrl) {
          console.log('Fetching issuer data from URL:', issuerUrl);
          
          try {
            const response = await fetch(issuerUrl);
            if (!response.ok) {
              console.warn(`Failed to fetch issuer data: HTTP ${response.status}`);
              return issuerUrl; // Return the URL as fallback
            }
            
            const issuerText = await response.text();
            console.log('Received issuer text:', issuerText);
            
            // Convert the text response to JSON
            const issuerData = JSON.parse(issuerText);
            console.log('Parsed issuer data:', issuerData);
            
            // Extract and return the name from issuer data
            if (issuerData.name) {
              console.log('Found issuer name:', issuerData.name);
              return issuerData.name;
            } else if (issuerData.publicKey && issuerData.publicKey.name) {
              console.log('Found issuer name in publicKey:', issuerData.publicKey.name);
              return issuerData.publicKey.name;
            } else if (issuerData.displayName) {
              console.log('Found issuer displayName:', issuerData.displayName);
              return issuerData.displayName;
            } else {
              console.warn('No name found in issuer data, returning URL');
              return issuerUrl;
            }
          } catch (fetchError) {
            console.error('Error fetching issuer data from URL:', fetchError);
            return issuerUrl; // Return the URL as fallback
          }
        }
      }
      
      // Fallback to credential issuer if available
      return (credential && typeof credential.issuer === 'object') ? credential.issuer.name : 'Unknown Issuer';
    } catch (error) {
      console.error('Error parsing certificate JSON for issuer:', error);
      return (credential && typeof credential.issuer === 'object') ? credential.issuer.name : 'Unknown Issuer';
    }
  }, [credential]);

  // Load issuer name when credential is loaded
  useEffect(() => {
    const loadIssuerName = async () => {
      if (credential?.metadata?.rawJson) {
        try {
          const name = await getIssuerName(credential.metadata.rawJson);
          setIssuerName(name);
        } catch (error) {
          console.error('Error loading issuer name:', error);
          setIssuerName('Unknown Issuer');
        }
      } else {
        setIssuerName('Unknown Issuer');
      }
    };

    loadIssuerName();
  }, [credential, getIssuerName]);

  const handleVerifyCredential = async () => {
    if (!credential?.metadata?.rawJson) {
      Alert.alert('Error', 'Cannot verify: Raw credential data not available');
      return;
    }

    // Runtime check: Ensure polyfills are working
    console.log('Pre-verification global check:', {
      location: typeof (global as any).location,
      'location.host': (global as any).location?.host,
      document: typeof (global as any).document,
      navigator: typeof (global as any).navigator,
      window: typeof (global as any).window,
      'window.location': typeof (global as any).window?.location,
    });

    // Ensure location is available on global and all possible references
    const locationObj = {
      host: 'localhost',
      hostname: 'localhost',
      href: 'https://localhost',
      origin: 'https://localhost',
      pathname: '/',
      port: '',
      protocol: 'https:',
      search: '',
      hash: ''
    };

    // Force set location on all possible global references
    ['global', 'global$1', 'global$2', 'global$3'].forEach(varName => {
      if (typeof (global as any)[varName] === 'object' && (global as any)[varName]) {
        (global as any)[varName].location = locationObj;
      }
    });

    // Ensure location is set on global itself
    (global as any).location = locationObj;
    if ((global as any).window) {
      (global as any).window.location = locationObj;
    }

    // Comprehensive debugging: Check all possible global references
    const debugGlobals = () => {
      const globalChecks: { [key: string]: any } = {
        'global': (global as any),
        'global.location': (global as any).location,
        'global.window': (global as any).window,
        'global.window.location': (global as any).window?.location,
      };

      // Check for bundler globals
      for (let i = 1; i <= 5; i++) {
        const varName = `global$${i}`;
        if ((global as any)[varName]) {
          globalChecks[varName] = (global as any)[varName];
          globalChecks[`${varName}.location`] = (global as any)[varName].location;
        }
      }

      console.log('=== GLOBAL DEBUG START ===');
      Object.entries(globalChecks).forEach(([key, value]) => {
        if (value) {
          console.log(`${key}:`, {
            exists: !!value,
            type: typeof value,
            host: value?.host,
            keys: typeof value === 'object' ? Object.keys(value).slice(0, 10) : 'N/A'
          });
        }
      });
      console.log('=== GLOBAL DEBUG END ===');
    };

    debugGlobals();

    console.log('Post-polyfill global check:', {
      'global.location.host': (global as any).location?.host,
      'window.location.host': (global as any).window?.location?.host,
    });

    // Reset verification state and show modal
    setVerificationSteps([]);
    setCurrentVerificationStep(-1);
    setFinalVerificationResult(null);
    setShowVerificationModal(true);
    setVerifying(true);

    try {
      // Check basic network connectivity
      try {
        const response = await fetch('https://www.google.com', { 
          method: 'HEAD'
        });
        console.log('Network connectivity check:', response.ok ? 'OK' : 'Failed');
      } catch (networkError) {
        console.warn('Network connectivity warning:', networkError);
        // Continue anyway as the certificate might be verifiable offline
      }

      // Parse the certificate data
      let jsonData;
      try {
        jsonData = typeof credential.metadata.rawJson === 'string' 
          ? JSON.parse(credential.metadata.rawJson) 
          : credential.metadata.rawJson;
      } catch (parseError) {
        throw new Error('Invalid certificate JSON format');
      }
      
      console.log('Initializing certificate verification...');
      console.log('Certificate data structure:', Object.keys(jsonData));
      
      // Run diagnostic on certificate
      const isValidStructure = diagnoseCertificate(jsonData);
      if (!isValidStructure) {
        console.warn('Certificate structure validation failed, but continuing...');
      }
      
      console.log('Creating Certificate with simplified configuration...');
      
      // Apply polyfills immediately before Certificate creation
      const immediateLocationObj = {
        host: 'localhost',
        hostname: 'localhost',
        href: 'https://localhost',
        origin: 'https://localhost',
        pathname: '/',
        port: '',
        protocol: 'https:',
        search: '',
        hash: ''
      };

      // Force apply to ALL possible global references
      (global as any).location = immediateLocationObj;
      if ((global as any).window) (global as any).window.location = immediateLocationObj;
      if ((global as any).globalThis) (global as any).globalThis.location = immediateLocationObj;
      
      // Apply to numbered global variables that bundlers might create
      for (let i = 1; i <= 10; i++) {
        const varName = `global$${i}`;
        if ((global as any)[varName]) {
          (global as any)[varName].location = immediateLocationObj;
        }
      }

      // EMERGENCY POLYFILL: Patch ALL possible global references right now
      try {
        const emergencyLocation = {
          host: 'localhost',
          hostname: 'localhost',
          href: 'https://localhost',
          origin: 'https://localhost',
          pathname: '/',
          port: '',
          protocol: 'https:',
          search: '',
          hash: ''
        };

        const emergencyDocument = {
          createElement: (tagName: string) => ({
            tagName,
            style: {},
            setAttribute: () => {},
            getAttribute: () => null,
            removeAttribute: () => {},
            appendChild: () => {},
            removeChild: () => {},
            innerHTML: '',
            textContent: '',
            addEventListener: () => {},
            removeEventListener: () => {},
          }),
          getElementById: (id: string) => {
            console.log(`Emergency polyfill - document.getElementById called with id: ${id}`);
            return null;
          },
          getElementsByTagName: (_tagName: string) => [],
          getElementsByClassName: (_className: string) => [],
          querySelector: (_selector: string) => null,
          querySelectorAll: (_selector: string) => [],
          createTextNode: (text: string) => ({ textContent: text }),
          documentElement: { style: {}, appendChild: () => {}, removeChild: () => {} },
          head: { appendChild: () => {}, removeChild: () => {} },
          body: { appendChild: () => {}, removeChild: () => {} },
          addEventListener: () => {},
          removeEventListener: () => {},
          cookie: ''
        };

        // Get all properties of global and look for global$ patterns
        const globalKeys = Object.getOwnPropertyNames(global);
        globalKeys.forEach(key => {
          if (key.match(/^global\$?\d*$/)) {
            const globalVar = (global as any)[key];
            if (globalVar && typeof globalVar === 'object') {
              console.log(`Patching ${key}:`, !!globalVar.location, !!globalVar.document);
              globalVar.location = emergencyLocation;
              globalVar.document = emergencyDocument;
            }
          }
        });

        // Also patch any global variables that might be added dynamically
        ['global', 'global$1', 'global$2', 'global$3', 'global$4', 'global$5'].forEach(varName => {
          if ((global as any)[varName] && typeof (global as any)[varName] === 'object') {
            (global as any)[varName].location = emergencyLocation;
            (global as any)[varName].document = emergencyDocument;
            console.log(`Patched ${varName} with location and document`);
          }
        });

      } catch (emergencyError) {
        console.warn('Emergency polyfill failed:', emergencyError);
      }
      
      // Create Certificate with just the JSON data (no additional options)
      const certificate = new Certificate(jsonData);
      
      try {
        await certificate.init();
        console.log('Certificate initialized successfully');
      } catch (initError: any) {
        console.error('Certificate initialization error:', initError);
        throw new Error(`Failed to initialize certificate: ${initError.message || 'Unknown error'}`);
      }

      console.log('Certificate initialized, format valid:', certificate.isFormatValid);

      // Check if the certificate format is valid
      if (!certificate.isFormatValid) {
        throw new Error('This is not a valid Blockcerts certificate');
      }

      // Enhanced step mapping based on actual Blockcerts verification steps
      const stepMapping: Record<string, { label: string; order: number }> = {
        // Format validation steps
        'getTransactionId': { label: 'Get transaction ID', order: 0 },
        'formatValidation': { label: 'Format validation', order: 0 },
        
        // Hash computation steps
        'computeLocalHash': { label: 'Compute local hash', order: 1 },
        'hashComparison': { label: 'Compute local hash', order: 1 },
        
        // Remote data fetching
        'fetchRemoteHash': { label: 'Fetch remote hash', order: 2 },
        'remoteHashRequest': { label: 'Fetch remote hash', order: 2 },
        
        // Hash comparison
        'compareHashes': { label: 'Compare hashes', order: 3 },
        'merkleProofVerification': { label: 'Compare hashes', order: 3 },
        
        // Merkle root verification
        'merkleRootVerification': { label: 'Check Merkle Root', order: 4 },
        'merkleRoot': { label: 'Check Merkle Root', order: 4 },
        
        // Receipt verification
        'receiptVerification': { label: 'Check Receipt', order: 5 },
        'blockchainVerification': { label: 'Check Receipt', order: 5 },
        
        // Issuer verification
        'issuerVerification': { label: 'Parse issuer keys', order: 6 },
        'issuerIdentity': { label: 'Parse issuer keys', order: 6 },
        
        // Signature verification
        'signatureVerification': { label: 'Check Authenticity', order: 7 },
        'proofVerification': { label: 'Check Authenticity', order: 7 },
        
        // Status checks
        'revocationVerification': { label: 'Check Revoked Status', order: 8 },
        'expirationVerification': { label: 'Check Expiration Date', order: 9 }
      };

      let currentStepOrder = -1;

      // Verify the certificate and capture all steps
      console.log('Starting certificate verification...');
      console.log('Certificate properties:', {
        name: certificate.name,
        issuer: certificate.issuer,
        id: certificate.id,
        isFormatValid: certificate.isFormatValid
      });
      
      const verificationResult = await certificate.verify(({code, label, status, errorMessage}: {
        code: string;
        label: string;
        status: string;
        errorMessage?: string;
      }) => {
        console.log('Verification step received:', { code, label, status, errorMessage });
        
        // Handle network-related errors
        if (errorMessage && errorMessage.includes('host')) {
          console.warn('Network connectivity issue detected:', errorMessage);
        }
        
        // Map the code to our step order
        const mappedStep = stepMapping[code] || { label: label || code, order: currentStepOrder + 1 };
        
        // Update current step order if we have a mapping
        if (stepMapping[code] && mappedStep.order > currentStepOrder) {
          currentStepOrder = mappedStep.order;
          setCurrentVerificationStep(currentStepOrder);
        }
        
        // Add step to our tracking array
        const stepData = {
          code: code,
          status: status,
          message: mappedStep.label,
          timestamp: new Date(),
          errorMessage: errorMessage || undefined
        };
        
        console.log('Adding verification step:', stepData);
        
        setVerificationSteps(prev => {
          // Avoid duplicating the same step
          const existingIndex = prev.findIndex(s => s.code === code);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = stepData;
            return updated;
          }
          return [...prev, stepData];
        });

        // Small delay to show progress animation
        return new Promise(resolve => setTimeout(resolve, 200));
      }).catch((verifyError: any) => {
        console.error('Certificate verification error:', verifyError);
        
        // Handle specific network errors
        if (verifyError.message && verifyError.message.includes('host')) {
          throw new Error('Network connectivity issue. Please check your internet connection and try again.');
        }
        
        // Handle other verification errors
        throw new Error(`Verification failed: ${verifyError.message || 'Unknown verification error'}`);
      });

      console.log('Verification completed:', verificationResult);

      // Store final verification result
      setFinalVerificationResult(verificationResult);

      // Update credential with new verification status
      const updatedMetadata = {
        ...credential.metadata,
        isVerified: verificationResult?.status === 'success',
        verificationStatus: (verificationResult?.status === 'success' ? 'verified' : 'failed') as 'pending' | 'verified' | 'failed',
        lastVerifiedAt: new Date().toISOString(),
      };

      await StorageService.updateCredential(credentialId, {
        metadata: updatedMetadata,
      });

      // Reload credential to show updated status
      const updatedCredential = await StorageService.getCredentialById(credentialId);
      if (updatedCredential) {
        setCredential(updatedCredential);
      }

    } catch (error: any) {
      console.error('Verification error:', error);
      const errorResult = {
        status: 'failure',
        message: error.message || 'An error occurred during verification',
        code: 'error'
      };
      setFinalVerificationResult(errorResult);
      
      // Add error step to verification steps
      setVerificationSteps(prev => [...prev, {
        code: 'error',
        status: 'failure',
        message: 'Verification failed',
        timestamp: new Date(),
        errorMessage: error.message
      }]);
    } finally {
      setVerifying(false);
    }
  };

  const handleShare = async () => {
    if (!credential?.metadata?.rawJson) {
      Alert.alert('Error', 'Cannot share: Credential data not available');
      return;
    }

    try {
      // Show action sheet for sharing options
      Alert.alert(
        'Share Certificate',
        'Choose how you would like to share this certificate:',
        [
          {
            text: 'LinkedIn (Add to Profile)',
            onPress: () => handleLinkedInShare(),
          },
          {
            text: 'Share as Image',
            onPress: () => handleImageShare(),
          },
          {
            text: 'Share Details',
            onPress: () => handleTextShare(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error in share options:', error);
    }
  };

  const handleLinkedInShare = async () => {
    if (!credential?.metadata?.rawJson) {
      Alert.alert('Error', 'Certificate data not available for LinkedIn sharing');
      return;
    }

    try {
      // Extract certificate details
      const certificateName = getCertificateName(credential.metadata.rawJson);
      const issuerName = await getIssuerName(credential.metadata.rawJson);
      const issueDate = new Date(credential.issuanceDate);
      const credentialUrl = originalArweaveUrl || `https://arweave.net/${extractSaltFromCredential(credential.metadata.rawJson)}`;

      // Parse expiry date if available
      let expiryDate = null;
      try {
        const jsonData = typeof credential.metadata.rawJson === 'string' 
          ? JSON.parse(credential.metadata.rawJson) 
          : credential.metadata.rawJson;
        if (jsonData.expirationDate) {
          expiryDate = new Date(jsonData.expirationDate);
        }
      } catch (error) {
        console.warn('Could not parse expiry date:', error);
      }

      // Format issue date (month and year)
      const issueMonthYear = issueDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });

      // Format expiry date if available
      const expiryMonthYear = expiryDate ? expiryDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      }) : null;

      // Construct LinkedIn certificate URL
      const linkedInParams = new URLSearchParams({
        name: certificateName,
        organizationName: issuerName,
        issueYear: issueDate.getFullYear().toString(),
        issueMonth: (issueDate.getMonth() + 1).toString(), // LinkedIn expects 1-12
        certUrl: credentialUrl,
      });

      // Add expiry date if available
      if (expiryDate) {
        linkedInParams.append('expirationYear', expiryDate.getFullYear().toString());
        linkedInParams.append('expirationMonth', (expiryDate.getMonth() + 1).toString());
      }

      const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&${linkedInParams.toString()}`;

      console.log('Opening LinkedIn certificate URL:', linkedInUrl);

      // Check if LinkedIn URL can be opened
      const canOpen = await Linking.canOpenURL(linkedInUrl);
      if (canOpen) {
        await Linking.openURL(linkedInUrl);
        
        Alert.alert(
          'Opening LinkedIn',
          'LinkedIn will open where you can add this certificate to your profile.',
          [{ text: 'OK' }]
        );
      } else {
        // Fallback: Copy URL to clipboard and show manual instructions
        throw new Error('Cannot open LinkedIn app');
      }
    } catch (error) {
      console.error('Error sharing to LinkedIn:', error);
      
      // Fallback: Show manual instructions
      Alert.alert(
        'LinkedIn Sharing',
        `To add this certificate to LinkedIn manually:\n\n1. Go to your LinkedIn profile\n2. Click "Add profile section" → "Licenses & certifications"\n3. Fill in the details:\n\nName: ${getCertificateName(credential.metadata.rawJson)}\nIssuer: ${issuerName}\nIssue Date: ${new Date(credential.issuanceDate).toLocaleDateString()}\nCredential URL: ${originalArweaveUrl || 'Available after opening certificate'}`,
        [
          { text: 'Copy URL', onPress: () => copyCredentialUrl() },
          { text: 'OK' }
        ]
      );
    }
  };

  const handleImageShare = async () => {
    if (!credential?.metadata?.rawJson) {
      Alert.alert('Error', 'Certificate data not available for sharing');
      return;
    }

    try {
      if (certificateImageUrl) {
        // If we have a certificate image, share it
        if (certificateImageUrl.startsWith('data:image')) {
          // Base64 image - create a temporary file
          const base64Data = certificateImageUrl.split(',')[1];
          const tempFilePath = `${RNFS.CachesDirectoryPath}/certificate_share_${Date.now()}.jpg`;
          
          await RNFS.writeFile(tempFilePath, base64Data, 'base64');
          
          await Share.share({
            url: `file://${tempFilePath}`,
            title: `Certificate: ${getCertificateName(credential.metadata.rawJson)}`,
            message: `${getCertificateName(credential.metadata.rawJson)}\nIssued by: ${issuerName}\nDate: ${new Date(credential.issuanceDate).toLocaleDateString()}`,
          });
          
          // Clean up temp file after sharing
          setTimeout(async () => {
            try {
              await RNFS.unlink(tempFilePath);
            } catch (cleanupError) {
              console.warn('Failed to cleanup temp share file:', cleanupError);
            }
          }, 5000);
        } else {
          // URL image
          await Share.share({
            url: certificateImageUrl,
            title: `Certificate: ${getCertificateName(credential.metadata.rawJson)}`,
            message: `${getCertificateName(credential.metadata.rawJson)}\nIssued by: ${issuerName}\nDate: ${new Date(credential.issuanceDate).toLocaleDateString()}`,
          });
        }
      } else {
        Alert.alert(
          'No Image Available',
          'Certificate image is not available for sharing. Would you like to share the certificate details instead?',
          [
            { text: 'Share Details', onPress: () => handleTextShare() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'Failed to share certificate image');
    }
  };

  const handleTextShare = async () => {
    if (!credential?.metadata?.rawJson) {
      Alert.alert('Error', 'Certificate data not available for sharing');
      return;
    }

    try {
      const certificateName = getCertificateName(credential.metadata.rawJson);
      const credentialUrl = originalArweaveUrl || `https://arweave.net/${extractSaltFromCredential(credential.metadata.rawJson)}`;
      
      const shareMessage = `🎓 Certificate Achievement\n\n` +
        `Certificate: ${certificateName}\n` +
        `Recipient: ${credential.metadata?.recipient || 'N/A'}\n` +
        `Issuer: ${issuerName}\n` +
        `Issue Date: ${new Date(credential.issuanceDate).toLocaleDateString()}\n\n` +
        `Verify this certificate: ${credentialUrl}`;

      await Share.share({
        message: shareMessage,
        title: `Certificate: ${certificateName}`,
      });
    } catch (error) {
      console.error('Error sharing text:', error);
      Alert.alert('Error', 'Failed to share certificate details');
    }
  };

  const copyCredentialUrl = async () => {
    if (!credential?.metadata?.rawJson) {
      Alert.alert('Error', 'Certificate data not available');
      return;
    }

    try {
      const credentialUrl = originalArweaveUrl || `https://arweave.net/${extractSaltFromCredential(credential.metadata.rawJson)}`;
      
      // For React Native, we would need react-native-clipboard or @react-native-clipboard/clipboard
      // For now, we'll show the URL in an alert
      Alert.alert(
        'Credential URL',
        credentialUrl,
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error copying URL:', error);
      Alert.alert('Error', 'Failed to get credential URL');
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getVerificationDotStyle = () => {
    const isVerified = credential?.metadata?.verificationStatus === 'verified';
    return [
      styles.verificationDot,
      { backgroundColor: isVerified ? '#10B981' : '#F59E0B' }
    ];
  };

  const renderVerificationModal = () => (
    <Modal
      visible={showVerificationModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowVerificationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.verificationPopup}>
          {/* Header */}
          <View style={styles.verificationHeader}>
            <Text style={styles.verificationHeaderTitle}>Proof Verification</Text>
          </View>

          <ScrollView style={styles.verificationScrollContainer} showsVerticalScrollIndicator={false}>
            {/* Verification Timeline */}
            <View style={styles.verificationTimeline}>
              {/* Dynamic Timeline Steps based on actual verification progress */}
              {[
                { label: "Get transaction ID", order: 0 },
                { label: "Compute local hash", order: 1 }, 
                { label: "Fetch remote hash", order: 2 },
                { label: "Compare hashes", order: 3 },
                { label: "Check Merkle Root", order: 4 },
                { label: "Check Receipt", order: 5 },
                { label: "Parse issuer keys", order: 6 },
                { label: "Check Authenticity", order: 7 }
              ].map((stepInfo, index) => {
                // Find step with matching order or label
                const step = verificationSteps.find(s => {
                  return s.message === stepInfo.label || 
                         s.message?.toLowerCase().includes(stepInfo.label.toLowerCase());
                });
                
                const isCompleted = step?.status === 'success';
                const isFailed = step?.status === 'failure' || step?.status === 'error';
                const isInProgress = verifying && !step && currentVerificationStep === stepInfo.order;
                const isPending = !step && !isInProgress && (verifying ? currentVerificationStep < stepInfo.order : true);
                
                return (
                  <View key={index} style={styles.timelineItem}>
                    {/* Timeline Line */}
                    {index < 7 && (
                      <View style={[
                        styles.timelineLine,
                        (isCompleted || (verifying && currentVerificationStep > stepInfo.order)) && styles.timelineLineCompleted
                      ]} />
                    )}
                    
                    {/* Checkpoint */}
                    <View style={[
                      styles.timelineCheckpoint,
                      isCompleted && styles.timelineCheckpointCompleted,
                      isFailed && styles.timelineCheckpointFailed,
                      isInProgress && styles.timelineCheckpointInProgress,
                      isPending && styles.timelineCheckpointPending
                    ]}>
                      {isCompleted && <Icon name="check" size={16} color="#FFFFFF" />}
                      {isFailed && <Icon name="close" size={16} color="#FFFFFF" />}
                      {isInProgress && (
                        <View style={styles.loadingSpinner}>
                          <View style={styles.spinnerDot} />
                        </View>
                      )}
                    </View>
                    
                    {/* Step Label */}
                    <Text style={[
                      styles.timelineLabel,
                      isCompleted && styles.timelineLabelCompleted,
                      isFailed && styles.timelineLabelFailed,
                      isInProgress && styles.timelineLabelInProgress
                    ]}>
                      {stepInfo.label}
                      {step?.errorMessage && (
                        <Text style={styles.errorMessageText}>{`\n${step.errorMessage}`}</Text>
                      )}
                    </Text>
                  </View>
                );
              })}

              {/* Status Check Section */}
              <View style={styles.statusCheckSection}>
                <View style={styles.timelineItem}>
                  <View style={[
                    styles.timelineLine,
                    (verificationSteps.some(s => s.code.includes('revocation') || s.code.includes('expiration') || s.message?.includes('Status')) || currentVerificationStep >= 8) && styles.timelineLineCompleted
                  ]} />
                  <View style={[
                    styles.timelineCheckpoint,
                    verificationSteps.some(s => s.code.includes('revocation') || s.code.includes('expiration')) && styles.timelineCheckpointCompleted,
                    !verificationSteps.some(s => s.code.includes('revocation') || s.code.includes('expiration')) && verifying && currentVerificationStep === 8 && styles.timelineCheckpointInProgress
                  ]}>
                    {verificationSteps.some(s => s.code.includes('revocation') || s.code.includes('expiration')) && 
                      <Icon name="check" size={16} color="#FFFFFF" />
                    }
                    {!verificationSteps.some(s => s.code.includes('revocation') || s.code.includes('expiration')) && verifying && currentVerificationStep === 8 && (
                      <View style={styles.loadingSpinner}>
                        <View style={styles.spinnerDot} />
                      </View>
                    )}
                  </View>
                  <Text style={[
                    styles.timelineLabel,
                    styles.statusCheckLabel,
                    verificationSteps.some(s => s.code.includes('revocation') || s.code.includes('expiration')) && styles.timelineLabelCompleted,
                    !verificationSteps.some(s => s.code.includes('revocation') || s.code.includes('expiration')) && verifying && currentVerificationStep === 8 && styles.timelineLabelInProgress
                  ]}>
                    Status check
                  </Text>
                </View>

                {/* Status Check Steps - Only show if we have them */}
                {verificationSteps.filter(s => s.code.includes('revocation') || s.code.includes('expiration')).map((step, _index) => {
                  const isCompleted = step.status === 'success';
                  const isFailed = step.status === 'failure';
                  const isInProgress = verifying && step.status === 'starting';
                  
                  return (
                    <View key={`status-${step.code}`} style={[styles.timelineItem, styles.statusCheckItem]}>
                      <View style={[
                        styles.timelineCheckpoint,
                        styles.statusCheckCheckpoint,
                        isCompleted && styles.timelineCheckpointCompleted,
                        isFailed && styles.timelineCheckpointFailed,
                        isInProgress && styles.timelineCheckpointInProgress
                      ]}>
                        {isCompleted && <Icon name="check" size={12} color="#FFFFFF" />}
                        {isFailed && <Icon name="close" size={12} color="#FFFFFF" />}
                        {isInProgress && (
                          <View style={styles.loadingSpinner}>
                            <View style={styles.spinnerDot} />
                          </View>
                        )}
                      </View>
                      
                      <Text style={[
                        styles.timelineLabel,
                        styles.statusCheckStepLabel,
                        isCompleted && styles.timelineLabelCompleted,
                        isFailed && styles.timelineLabelFailed,
                        isInProgress && styles.timelineLabelInProgress
                      ]}>
                        {step.message || step.code}
                        {step.errorMessage && (
                          <Text style={styles.errorMessageText}>{`\n${step.errorMessage}`}</Text>
                        )}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Completion Section */}
              {finalVerificationResult && (
                <View style={styles.completionSection}>
                  <View style={styles.completionItem}>
                    <View style={[
                      styles.completionShield,
                      finalVerificationResult.status === 'success' ? styles.completionShieldSuccess : styles.completionShieldFailed
                    ]}>
                      <Icon 
                        name={finalVerificationResult.status === 'success' ? "verified" : "error"} 
                        size={32} 
                        color="#FFFFFF" 
                      />
                    </View>
                    
                    <Text style={[
                      styles.completionText,
                      finalVerificationResult.status === 'success' ? styles.completionTextSuccess : styles.completionTextFailed
                    ]}>
                      {finalVerificationResult.status === 'success' ? 'Verified!' : 'Failed!'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Loading State */}
              {verifying && !finalVerificationResult && (
                <View style={styles.verificationLoading}>
                  <Icon name="hourglass-empty" size={24} color="#2196F3" />
                  <Text style={styles.verificationLoadingText}>Verification in progress...</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Action */}
          <View style={styles.verificationFooter}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowVerificationModal(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderRawJsonModal = () => (
    <Modal
      visible={showRawJson}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setShowRawJson(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <Header
          centerComponent={{
            text: 'Raw Certificate Data',
            style: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
          }}
          leftComponent={{
            icon: 'close',
            color: '#fff',
            onPress: () => setShowRawJson(false),
          }}
          rightComponent={{
            icon: 'content-copy',
            color: '#fff',
            onPress: () => {
              // Copy to clipboard functionality could be added here
              Alert.alert('Info', 'Copy to clipboard functionality can be implemented');
            },
          }}
          backgroundColor="#2196F3"
        />
        
        <ScrollView style={styles.jsonContainer}>
          <Text style={styles.jsonText}>
            {credential?.metadata?.rawJson ? JSON.stringify(JSON.parse(credential.metadata.rawJson), null, 2) : 'No data available'}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // Helper function to diagnose certificate issues
  const diagnoseCertificate = (jsonData: any) => {
    console.log('=== Certificate Diagnostic ===');
    
    // Check basic structure
    const requiredFields = ['@context', 'type', 'issuer', 'issuanceDate'];
    const hasAllFields = requiredFields.every(field => {
      const hasField = jsonData[field] !== undefined;
      console.log(`Field '${field}': ${hasField ? '✓' : '✗'}`);
      return hasField;
    });
    
    console.log('Has all required fields:', hasAllFields);
    
    // Check issuer URL
    if (jsonData.issuer) {
      const issuerUrl = typeof jsonData.issuer === 'string' ? jsonData.issuer : jsonData.issuer.id;
      console.log('Issuer URL:', issuerUrl);
      try {
        const url = new URL(issuerUrl);
        console.log('Issuer URL format: ✓ Valid -', url.origin);
      } catch {
        console.log('Issuer URL format: ✗ Invalid');
      }
    }
    
    // Check proof
    if (jsonData.proof) {
      console.log('Proof type:', jsonData.proof.type);
      console.log('Has anchors:', !!jsonData.proof.anchors);
    }
    
    // Check for blockchain-specific fields
    const blockchainFields = ['chainpoint_v2', 'merkleRoot', 'targetHash', 'anchors'];
    blockchainFields.forEach(field => {
      const hasField = jsonData.proof && jsonData.proof[field];
      console.log(`Blockchain field '${field}': ${hasField ? '✓' : '✗'}`);
    });
    
    console.log('=== End Diagnostic ===');
    return hasAllFields;
  };

  // Preview modal handlers
  const openPreview = useCallback(async (type: 'image', url: string) => {
    try {
      console.log('Opening preview for:', type, 'URL:', url);
      
      // Use the original Arweave URL if available, otherwise use the provided URL
      const urlToOpen = originalArweaveUrl || url;
      
      console.log('Opening URL in browser:', urlToOpen);
      
      // Check if the URL can be opened
      const canOpen = await Linking.canOpenURL(urlToOpen);
      if (canOpen) {
        await Linking.openURL(urlToOpen);
      } else {
        Alert.alert(
          'Unable to Open URL',
          'Cannot open the certificate URL in browser. Please check if you have a browser installed.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening URL in browser:', error);
      Alert.alert(
        'Error',
        'Failed to open the certificate URL in browser.',
        [{ text: 'OK' }]
      );
    }
  }, [originalArweaveUrl]);

  // Helper functions to extract certificate details from JSON
  const getCertificateName = (rawJson: string): string => {
    try {
      const jsonData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      return jsonData.certificatename || jsonData.name || credential?.metadata?.title || 'Unnamed Certificate';
    } catch (error) {
      console.error('Error parsing certificate JSON for certificate name:', error);
      return credential?.metadata?.title || 'Unnamed Certificate';
    }
  };

  const getRecipientName = (rawJson: string): string => {
    try {
      const jsonData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      return jsonData.recipientname || 
             jsonData.credentialSubject?.name || 
             jsonData.recipient?.name ||
             credential?.metadata?.recipient || 
             'Unknown Recipient';
    } catch (error) {
      console.error('Error parsing certificate JSON for recipient name:', error);
      return credential?.metadata?.recipient || 'Unknown Recipient';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
        <Header
          centerComponent={{
            text: 'Loading...',
            style: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
          }}
          leftComponent={{
            icon: 'arrow-back',
            color: '#fff',
            onPress: () => navigation.goBack(),
          }}
          backgroundColor="#2196F3"
        />
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-empty" size={50} color="#2196F3" />
          <Text style={styles.loadingText}>Loading certificate...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!credential) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
        <Header
          centerComponent={{
            text: 'Certificate Not Found',
            style: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
          }}
          leftComponent={{
            icon: 'arrow-back',
            color: '#fff',
            onPress: () => navigation.goBack(),
          }}
          backgroundColor="#2196F3"
        />
        <View style={styles.errorContainer}>
          <Icon name="error" size={50} color="#EF4444" />
          <Text style={styles.errorText}>Certificate not found</Text>
        </View>
      </SafeAreaView>
    );
  }

// ...existing code...

  const downloadFile = async () => {
    const url = 'https://morth.nic.in/sites/default/files/dd12-13_0.pdf';
    // Use DocumentDirectoryPath instead of DownloadDirectoryPath for better access
    const destPath = `${RNFS.DocumentDirectoryPath}/temp_file.pdf`;

    try {
      // Check if file already exists and remove it
      const fileExists = await RNFS.exists(destPath);
      if (fileExists) {
        await RNFS.unlink(destPath);
        console.log('Existing file removed');
      }

      const result = await RNFS.downloadFile({
        fromUrl: url,
        toFile: destPath,
      }).promise;

      if (result.statusCode === 200) {
        console.log('File downloaded to:', destPath);
        
        // Verify file exists after download
        const downloadedFileExists = await RNFS.exists(destPath);
        if (!downloadedFileExists) {
          throw new Error('File was not created after download');
        }
        
        // Check file size
        const fileStats = await RNFS.stat(destPath);
        console.log('Downloaded file size:', fileStats.size);
        
        if (fileStats.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        return destPath;
      } else {
        throw new Error(`Failed to download file, status code: ${result.statusCode}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  };

  // async function convertPdfToImages() {
  //   let destPath: string | null = null;
    
  //   try {
  //     console.log('Starting PDF to image conversion...');
      
  //     // Download the PDF file
  //     destPath = await downloadFile();
  //     if (!destPath) {
  //       console.error('Failed to download file for conversion');
  //       return;
  //     }
      
  //     console.log('PDF downloaded successfully, converting to images...');
      
  //     // Convert PDF to images
  //     const result = await convert(destPath);
      
  //     if (result.outputFiles && result.outputFiles.length > 0) {
  //       console.log('PDF converted successfully!');
  //       console.log('Number of pages converted:', result.outputFiles.length);
  //       console.log('Output files:', result.outputFiles);
        
  //       // You can now use these image files
  //       result.outputFiles.forEach((imagePath, index) => {
  //         console.log(`Page ${index + 1} image path:`, imagePath);
  //       });
        
  //       return result.outputFiles;
  //     } else {
  //       console.error('No output files generated from PDF conversion');
  //       return null;
  //     }
  //   } catch (error) {
  //     console.error('Error converting PDF:', error);
      
  //     // Provide more specific error handling
  //     if (error instanceof Error) {
  //       if (error.message.includes('FileNotFoundException')) {
  //         console.error('File not found - the PDF file path may be incorrect');
  //       } else if (error.message.includes('No content provider')) {
  //         console.error('Content provider error - file access permissions issue');
  //       } else {
  //         console.error('Conversion error:', error.message);
  //       }
  //     }
      
  //     return null;
  //   } finally {
  //     // Clean up the downloaded PDF file
  //     if (destPath) {
  //       await deleteFile(destPath);
  //     }
  //   }
  // }

  // Simple test function to verify permissions
  const testPermissions = async () => {
    console.log('🧪 Testing permissions...');
    
    try {
      const hasPermissions = await checkAndRequestPermissions();
      
      if (hasPermissions) {
        Alert.alert(
          'Permissions Test',
          '✅ All required permissions are granted!\n\nYou can now use PDF conversion features.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Permissions Test',
          '❌ Some permissions are missing.\n\nPlease grant the required permissions to use PDF conversion.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Permission test error:', error);
      Alert.alert(
        'Permissions Test',
        '❌ Error testing permissions.\n\nPlease check your device settings.',
        [{ text: 'OK' }]
      );
    }
  };

  // Updated convertPdfToImages function with comprehensive error handling
  async function convertPdfToImages() {
    try {
      console.log('=== Starting PDF Conversion Process ===');
      
      // Step 1: Check platform and permissions
      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        console.error('❌ Permissions not granted, cannot proceed');
        Alert.alert(
          'Permission Error',
          'Unable to process PDF files. Please ensure the app has necessary permissions.',
          [{ text: 'OK' }]
        );
        return null;
      }
      
      console.log('✅ Permissions granted, proceeding...');
      
      // Step 2: Download PDF with enhanced error handling
      let destPath = null;
      try {
        destPath = await downloadFile();
        if (!destPath) {
          throw new Error('Failed to download PDF file');
        }
        console.log('✅ PDF downloaded successfully:', destPath);
      } catch (downloadError) {
        console.error('❌ PDF download failed:', downloadError);
        Alert.alert('Download Error', 'Failed to download PDF file. Please check your internet connection.');
        return null;
      }
      
      // Step 3: Verify PDF file integrity
      const fileVerification = await verifyPdfFile(destPath);
      if (!fileVerification.isValid) {
        console.error('❌ PDF file verification failed:', fileVerification.error);
        Alert.alert('File Error', `PDF file is invalid: ${fileVerification.error}`);
        await deleteFile(destPath);
        return null;
      }
      
      console.log('✅ PDF file verified:', fileVerification);
      
      // Step 4: Generate thumbnail with multiple fallback methods
      try {
        const thumbnailResult = await generateThumbnailWithFallbacks(destPath);
        if (!thumbnailResult) {
          throw new Error('All thumbnail generation methods failed');
        }
        
        console.log('✅ Thumbnail generated successfully:', thumbnailResult);
        
        // Step 5: Process thumbnail for display
        await processThumbnailForDisplay(thumbnailResult);
        
        console.log('✅ PDF conversion process completed successfully');
        return thumbnailResult;
        
      } catch (thumbnailError) {
        console.error('❌ Thumbnail generation failed:', thumbnailError);
        Alert.alert(
          'Conversion Error',
          `Failed to generate thumbnail from PDF: ${thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error'}`,
          [{ text: 'OK' }]
        );
        return null;
      } finally {
        // Clean up downloaded PDF file
        if (destPath) {
          await deleteFile(destPath);
        }
      }
      
    } catch (error) {
      console.error('❌ PDF conversion process failed:', error);
      Alert.alert(
        'PDF Conversion Failed',
        `Unable to convert PDF to image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
      return null;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credential Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Content Section */}
        <View style={styles.mainSection}>
          {/* Certificate Content Display */}
          {certificateContentLoading && (
            <View style={styles.certificateContentContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.certificateContentLoadingText}>Loading certificate...</Text>
            </View>
          )}

          {certificateContentType === 'image' && certificateImageUrl && !certificateContentLoading && (
            <TouchableOpacity
              style={styles.certificateContentContainer}
              onPress={() => openPreview('image', certificateImageUrl)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: certificateImageUrl }}
                style={styles.certificateImage}
                resizeMode="contain"
                onError={(error) => {
                  console.error('Error loading certificate image:', error);
                  setCertificateContentError('Failed to load certificate image');
                  setCertificateImageUrl(null);
                }}
              />
              <View style={styles.previewOverlay}>
                <Icon name="open-in-browser" size={24} color="#FFFFFF" />
                <Text style={styles.previewOverlayText}>Tap to open in browser</Text>
              </View>
            </TouchableOpacity>
          )}

          {certificateContentError && !certificateContentLoading && (
            // <Pdf
            //         source={pdfsource}
            //         onLoadComplete={(numberOfPages,filePath) => {
            //             console.log(`Number of pages: ${numberOfPages}`);
            //         }}
            //         onPageChanged={(page,numberOfPages) => {
            //             console.log(`Current page: ${page}`);
            //         }}
            //         onError={(error) => {
            //             console.log(error);
            //         }}
            //         onPressLink={(uri) => {
            //             console.log(`Link pressed: ${uri}`);
            //         }}
            //         style={styles.pdf}/>
            <View style={styles.certificateContentContainer}>
              <View style={styles.certificateContentError}>
                <Icon name="error" size={24} color="#EF4444" />
                <Text style={styles.certificateContentErrorText}>{certificateContentError}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    if (credential?.metadata?.rawJson) {
                      const salt = extractSaltFromCredential(credential.metadata.rawJson);
                      if (salt) {
                        console.log('Retrying certificate content fetch...');
                        fetchCertificateContent(salt);
                      }
                    }
                  }}
                >
                  <Icon name="refresh" size={20} color="#2196F3" />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Certificate Name */}
          <Text style={styles.credentialTitle}>
            {credential?.metadata?.rawJson ? getCertificateName(credential.metadata.rawJson) : 'Unnamed Certificate'}
          </Text>
          
          {/* Verification Badge */}
          <View style={styles.verificationBadge}>
            <View style={getVerificationDotStyle()} />
            <Text style={styles.verificationText}>
              {credential.metadata?.verificationStatus === 'verified' 
                ? 'Verified on Blockchain' 
                : 'Verification Pending'}
            </Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Issued by</Text>
            <Text style={styles.detailValue}>
              {issuerName}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Issued to</Text>
            <Text style={styles.detailValue}>
              {credential?.metadata?.rawJson ? getRecipientName(credential.metadata.rawJson) : 'Unknown Recipient'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Issue date</Text>
            <Text style={styles.detailValue}>
              {formatDate(credential.issuanceDate)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expiry date</Text>
            <Text style={styles.detailValue}>
              {credential.expirationDate ? formatDate(credential.expirationDate) : 'No expiry'}
            </Text>
          </View>
        </View>

        {/* Description Section */}
        {credential.metadata?.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {credential.metadata.description}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, verifying && styles.disabledButton]}
            onPress={handleVerifyCredential}
            disabled={verifying || !credential.metadata?.rawJson}
          >
            <Icon name="verified-user" size={20} color={verifying ? "#999" : "#2196F3"} />
            <Text style={[styles.actionButtonText, verifying && styles.disabledButtonText]}>
              {verifying ? 'Verifying...' : 'Re-verify'}
            </Text>
          </TouchableOpacity>
          
         
          
          <TouchableOpacity
            style={[styles.actionButton, !credential.metadata?.rawJson && styles.disabledButton]}
            onPress={handleShare}
            disabled={!credential.metadata?.rawJson}
          >
            <Icon name="share" size={20} color={credential.metadata?.rawJson ? "#2196F3" : "#999"} />
            <Text style={[styles.actionButtonText, !credential.metadata?.rawJson && styles.disabledButtonText]}>Share</Text>
          </TouchableOpacity>
          
          
        </View>
      </ScrollView>

      {renderVerificationModal()}
      {renderRawJsonModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  pdf: {
        flex:1,
        width:Dimensions.get('window').width,
        height:Dimensions.get('window').height,
    },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button to center title
  },
  // Content styles
  content: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  // Main section styles
  mainSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  credentialTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 16,
    lineHeight: 32,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  verificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  verificationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0369A1',
  },
  // Certificate content styles
  certificateContentContainer: {
    width: '100%',
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  certificateImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  certificateContentLoadingText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  certificateContentLoadingSubtext: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  certificateContentError: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  certificateContentErrorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    alignSelf: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 6,
    fontWeight: '500',
  },
  pdfInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7D7',
    marginBottom: 12,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    alignSelf: 'center',
  },
  debugButtonText: {
    fontSize: 14,
    color: '#FF9800',
    marginLeft: 6,
    fontWeight: '500',
  },
  debugInfo: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginHorizontal: 16,
  },
  debugInfoText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  debugButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  // Details section styles
  detailsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '400',
    lineHeight: 22,
  },
  // Description section styles
  descriptionSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#4A4A4A',
    lineHeight: 24,
  },
  // Button styles
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2196F3',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#F5F5F5',
    borderColor: '#D1D5DB',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
  },
  // Legacy styles (kept for compatibility)
  headerCard: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  certificateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  certificateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  certificateSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom:  8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
  },
  rawDataButton: {
    borderColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  outlineButtonText: {
    color: '#2196F3',
  },
  buttonIcon: {
    marginRight: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  jsonContainer: {
    flex: 1,
    padding: 16,
  },
  jsonText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Verification Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  verificationPopup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  verificationHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  verificationHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  verificationScrollContainer: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  verificationTimeline: {
    paddingVertical: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 8,
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    bottom: -24,
    width: 2,
    backgroundColor: '#10B981',
    zIndex: 0,
  },
  timelineLineCompleted: {
    backgroundColor: '#10B981',
  },
  timelineCheckpoint: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    zIndex: 1,
  },
  timelineCheckpointCompleted: {
    backgroundColor: '#FFFFFF',
    borderColor: '#2196F3',
  },
  timelineCheckpointFailed: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EF4444',
  },
  timelineCheckpointInProgress: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F59E0B',
  },
  timelineCheckpointPending: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  timelineLabel: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
    flex: 1,
  },
  timelineLabelCompleted: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  timelineLabelFailed: {
    color: '#EF4444',
    fontWeight: '600',
  },
  timelineLabelInProgress: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  errorMessageText: {
    fontSize: 12,
    color: '#EF4444',
    fontStyle: 'italic',
    marginTop: 4,
  },
  statusCheckSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusCheckLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  statusCheckItem: {
    paddingLeft: 20,
    marginTop: 8,
  },
  statusCheckCheckpoint: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  statusCheckStepLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  completionSection: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 20,
  },
  completionItem: {
    alignItems: 'center',
  },
  completionShield: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  completionShieldSuccess: {
    backgroundColor: '#10B981',
  },
  completionShieldFailed: {
    backgroundColor: '#EF4444',
  },
  completionText: {
    fontSize: 24,
    fontWeight: '700',
  },
  completionTextSuccess: {
    color: '#10B981',
  },
  completionTextFailed: {
    color: '#EF4444',
  },
  verificationFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  doneButton: {
    borderColor: '#10B981',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  verificationContainer: {
    flex: 1,
    padding: 16,
  },
  verificationResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  verificationResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationResultText: {
    flex: 1,
    marginLeft: 16,
  },
  verificationResultTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  verificationResultMessage: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  verificationStepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  verificationStepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  verificationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  verificationLoadingText: {
    fontSize: 16,
    color: '#2196F3',
    marginLeft: 12,
  },
  verificationStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  verificationStepIcon: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  verificationStepContent: {
    flex: 1,
  },
  verificationStepCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  verificationStepMessage: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 18,
    marginBottom: 4,
  },
  verificationStepTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  verificationStepStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  verificationStepStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  verificationInProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  verificationInProgressText: {
    fontSize: 16,
    color: '#2196F3',
    marginLeft: 12,
  },
  loadingSpinner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
  },
  
  // Preview overlay styles
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  previewOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  
});

export default CredentialDetailsScreen;
