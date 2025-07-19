export interface WalletData {
  id: string;
  name: string;
  address: string;
  publicKey: string;
  privateKey: string;
  mnemonic: string;
  createdAt: Date;
  isBackedUp: boolean;
}

export interface WalletSettings {
  biometricEnabled: boolean;
  autoLockTimeout: number;
  currency: string;
  network: string;
}

export interface Wallet {
  id: string;
  name: string;
  publicKey: string;
  bitcoinAddress: string;
  ethereumAddress: string;
  createdAt: string;
  isBackedUp: boolean;
}

export interface WalletKeyPair {
  privateKey: string;
  publicKey: string;
  mnemonic: string;
}

export interface BiometricConfig {
  enabled: boolean;
  type: 'fingerprint' | 'face' | 'none';
}

export interface AppSettings {
  biometric: BiometricConfig;
  darkMode: boolean;
  autoVerify: boolean;
  defaultChain: 'bitcoin' | 'ethereum';
}
