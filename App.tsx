/**
 * Blockcerts Wallet App
 * A secure wallet for managing Blockcerts digital credentials
 */

import React, { useState, useEffect, createContext, useRef, useCallback } from 'react';
import { StatusBar, useColorScheme, View, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { ThemeProvider } from '@rneui/themed';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import WalletSetupScreen from './src/screens/WalletSetupScreen';
import { WalletService } from './src/services/WalletService';
import { PdfCleanupService } from './src/services/PdfCleanupService';

// Create context for wallet state management
export const WalletContext = createContext<{
  resetWallet: () => void;
}>({
  resetWallet: () => {},
});

const theme = {
  lightColors: {
    primary: '#2196F3',
    secondary: '#03DAC6',
    background: '#f5f5f5',
    surface: '#ffffff',
    error: '#F44336',
    text: '#333333',
  },
  darkColors: {
    primary: '#2196F3',
    secondary: '#03DAC6',
    background: '#121212',
    surface: '#1e1e1e',
    error: '#F44336',
    text: '#ffffff',
  },
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  const performInitialCleanup = async () => {
    try {
      console.log('Performing initial PDF cleanup on app start...');
      // Clean up old PDFs (older than 1 hour) on app start
      await PdfCleanupService.cleanupOldPdfs(1);
      
      // Get storage stats for logging
      const stats = await PdfCleanupService.getPdfStorageStats();
      console.log('PDF Storage Stats:', {
        totalFiles: stats.totalFiles,
        totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2) + ' MB'
      });
    } catch (error) {
      console.error('Error during initial cleanup:', error);
    }
  };

  const performExitCleanup = useCallback(async () => {
    try {
      console.log('Performing PDF cleanup on app exit/background...');
      // Clean up all temporary PDFs when app goes to background or exits
      await PdfCleanupService.cleanupAllTempPdfs();
    } catch (error) {
      console.error('Error during exit cleanup:', error);
    }
  }, []);

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    console.log('App state changed:', appState.current, '->', nextAppState);
    
    // If app is coming from background to active, perform cleanup
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App came to foreground, performing periodic cleanup...');
      PdfCleanupService.performPeriodicCleanup();
    }
    
    // If app is going to background, perform cleanup
    if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      console.log('App going to background, performing cleanup...');
      performExitCleanup();
    }
    
    appState.current = nextAppState;
  }, [performExitCleanup]);

  useEffect(() => {
    checkWalletExists();
    performInitialCleanup();
    
    // Set up app state change listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      performExitCleanup();
    };
  }, [handleAppStateChange, performExitCleanup]);

  const checkWalletExists = async () => {
    try {
      const walletExists = await WalletService.walletExists();
      setHasWallet(walletExists);
    } catch (error) {
      console.error('Error checking wallet existence:', error);
      setHasWallet(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletCreated = () => {
    setHasWallet(true);
  };

  const resetWallet = () => {
    setHasWallet(false);
  };

  const loadingStyle = {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: isDarkMode ? '#121212' : '#f5f5f5'
  };

  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <SafeAreaProvider>
          <View style={loadingStyle}>
            <ActivityIndicator size="large" color="#2196F3" />
          </View>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <SafeAreaProvider>
        <WalletContext.Provider value={{ resetWallet }}>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          {hasWallet ? (
            <AppNavigator />
          ) : (
            <WalletSetupScreen onWalletCreated={handleWalletCreated} />
          )}
        </WalletContext.Provider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default App;
