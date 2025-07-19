import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wallet, ethers } from 'ethers';
import { WalletData, WalletSettings } from '../types/wallet';
import CryptoJS from 'crypto-js';

export class WalletService {
  private static readonly WALLET_KEY = 'wallet_data';
  private static readonly SETTINGS_KEY = 'wallet_settings';
  private static readonly MNEMONIC_KEY = 'wallet_mnemonic';

  // Generate a new wallet with mnemonic phrase
  static async createWallet(password: string): Promise<WalletData> {
    try {
      // Create a random wallet
      const wallet = Wallet.createRandom();
      
      const walletData: WalletData = {
        id: Date.now().toString(),
        name: 'My Wallet',
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || '',
        createdAt: new Date(),
        isBackedUp: false,
      };

      // Encrypt and store the wallet data
      await this.saveWallet(walletData, password);
      
      return walletData;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw new Error('Failed to create wallet');
    }
  }

  // Import wallet from mnemonic phrase
  static async importWallet(mnemonic: string, password: string, name?: string): Promise<WalletData> {
    try {
      // Validate mnemonic
      if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Create wallet from mnemonic
      const wallet = Wallet.fromPhrase(mnemonic);
      
      const walletData: WalletData = {
        id: Date.now().toString(),
        name: name || 'Imported Wallet',
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || '',
        createdAt: new Date(),
        isBackedUp: true, // Imported wallets are considered backed up
      };

      // Encrypt and store the wallet data
      await this.saveWallet(walletData, password);
      
      return walletData;
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw new Error('Failed to import wallet or invalid mnemonic');
    }
  }

  // Save wallet data encrypted to AsyncStorage
  static async saveWallet(walletData: WalletData, password: string): Promise<void> {
    try {
      // Encrypt sensitive data
      const encryptedPrivateKey = CryptoJS.AES.encrypt(walletData.privateKey, password).toString();
      const encryptedMnemonic = CryptoJS.AES.encrypt(walletData.mnemonic, password).toString();

      // Store wallet data (without sensitive info)
      const safeWalletData = {
        ...walletData,
        privateKey: encryptedPrivateKey,
        mnemonic: encryptedMnemonic,
      };

      await AsyncStorage.setItem(this.WALLET_KEY, JSON.stringify(safeWalletData));
    } catch (error) {
      console.error('Error saving wallet:', error);
      throw new Error('Failed to save wallet');
    }
  }

  // Load wallet data from AsyncStorage
  static async loadWallet(password: string): Promise<WalletData | null> {
    try {
      const walletJson = await AsyncStorage.getItem(this.WALLET_KEY);
      if (!walletJson) {
        return null;
      }

      const encryptedWallet = JSON.parse(walletJson);
      
      // Decrypt sensitive data
      const privateKey = CryptoJS.AES.decrypt(encryptedWallet.privateKey, password).toString(CryptoJS.enc.Utf8);
      const mnemonic = CryptoJS.AES.decrypt(encryptedWallet.mnemonic, password).toString(CryptoJS.enc.Utf8);

      if (!privateKey || !mnemonic) {
        throw new Error('Invalid password');
      }

      return {
        ...encryptedWallet,
        privateKey,
        mnemonic,
        createdAt: new Date(encryptedWallet.createdAt),
      };
    } catch (error) {
      console.error('Error loading wallet:', error);
      throw new Error('Failed to load wallet or invalid password');
    }
  }

  // Check if wallet exists
  static async walletExists(): Promise<boolean> {
    try {
      const walletJson = await AsyncStorage.getItem(this.WALLET_KEY);
      return walletJson !== null;
    } catch (error) {
      console.error('Error checking wallet existence:', error);
      return false;
    }
  }

  // Delete wallet
  static async deleteWallet(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.WALLET_KEY, this.SETTINGS_KEY, this.MNEMONIC_KEY]);
    } catch (error) {
      console.error('Error deleting wallet:', error);
      throw new Error('Failed to delete wallet');
    }
  }

  // Get wallet address only (for display purposes)
  static async getWalletAddress(): Promise<string | null> {
    try {
      const walletJson = await AsyncStorage.getItem(this.WALLET_KEY);
      if (!walletJson) {
        return null;
      }
      const walletData = JSON.parse(walletJson);
      return walletData.address;
    } catch (error) {
      console.error('Error getting wallet address:', error);
      return null;
    }
  }

  // Export wallet for backup
  static async exportWallet(password: string): Promise<{ address: string; mnemonic: string }> {
    try {
      const wallet = await this.loadWallet(password);
      if (!wallet) {
        throw new Error('No wallet found');
      }
      
      return {
        address: wallet.address,
        mnemonic: wallet.mnemonic,
      };
    } catch (error) {
      console.error('Error exporting wallet:', error);
      throw new Error('Failed to export wallet');
    }
  }

  // Save wallet settings
  static async saveSettings(settings: WalletSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  // Load wallet settings
  static async loadSettings(): Promise<WalletSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(this.SETTINGS_KEY);
      if (!settingsJson) {
        return {
          biometricEnabled: false,
          autoLockTimeout: 300000, // 5 minutes
          currency: 'USD',
          network: 'mainnet',
        };
      }
      return JSON.parse(settingsJson);
    } catch (error) {
      console.error('Error loading settings:', error);
      return {
        biometricEnabled: false,
        autoLockTimeout: 300000,
        currency: 'USD',
        network: 'mainnet',
      };
    }
  }
}

export default WalletService;
