import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import CryptoJS from 'crypto-js';
import { BlockcertCredential, VerificationResult, CertificateMetadata } from '../types/blockcerts';

const CREDENTIALS_STORAGE_KEY = 'blockcerts_credentials';
const CERTIFICATES_FOLDER = `${RNFS.DocumentDirectoryPath}/certificates`;

export class CredentialService {
  private static instance: CredentialService;
  private credentials: BlockcertCredential[] = [];

  static getInstance(): CredentialService {
    if (!CredentialService.instance) {
      CredentialService.instance = new CredentialService();
    }
    return CredentialService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Create certificates folder if it doesn't exist
      const folderExists = await RNFS.exists(CERTIFICATES_FOLDER);
      if (!folderExists) {
        await RNFS.mkdir(CERTIFICATES_FOLDER);
      }

      // Load credentials from storage
      await this.loadCredentials();
    } catch (error) {
      console.error('Error initializing CredentialService:', error);
    }
  }

  private async loadCredentials(): Promise<void> {
    try {
      const storedCredentials = await AsyncStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (storedCredentials) {
        this.credentials = JSON.parse(storedCredentials);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      this.credentials = [];
    }
  }

  private async saveCredentials(): Promise<void> {
    try {
      await AsyncStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(this.credentials));
    } catch (error) {
      console.error('Error saving credentials:', error);
      throw new Error('Failed to save credentials');
    }
  }

  async importCredential(credentialData: string, source: 'file' | 'url' | 'qr'): Promise<BlockcertCredential> {
    try {
      // Parse credential data
      const credential: BlockcertCredential = JSON.parse(credentialData);

      // Validate basic structure
      if (!credential.id || !credential.type || !credential.issuer) {
        throw new Error('Invalid credential format');
      }

      // Check for duplicate credentials
      const existingCredential = this.credentials.find(cred => cred.id === credential.id);
      if (existingCredential) {
        throw new Error(`Credential with ID "${credential.id}" already exists in your wallet`);
      }

      // Generate unique ID if not present
      if (!credential.id) {
        credential.id = CryptoJS.SHA256(credentialData + Date.now().toString()).toString();
      }

      // Add metadata
      const metadata: CertificateMetadata = {
        importedAt: new Date().toISOString(),
        source,
        fileSize: new Blob([credentialData]).size,
        isVerified: false,
        verificationStatus: 'pending',
      };

      credential.metadata = metadata;

      // Save credential file
      const fileName = `${credential.id}.json`;
      const filePath = `${CERTIFICATES_FOLDER}/${fileName}`;
      await RNFS.writeFile(filePath, credentialData, 'utf8');

      // Add to credentials list
      this.credentials.push(credential);
      await this.saveCredentials();

      return credential;
    } catch (error) {
      console.error('Error importing credential:', error);
      throw error; // Re-throw to preserve the error message
    }
  }

  async getCredentials(): Promise<BlockcertCredential[]> {
    return [...this.credentials];
  }

  async getCredential(id: string): Promise<BlockcertCredential | null> {
    return this.credentials.find(cred => cred.id === id) || null;
  }

  async deleteCredential(id: string): Promise<void> {
    try {
      // Remove from array
      const index = this.credentials.findIndex(cred => cred.id === id);
      if (index === -1) {
        throw new Error('Credential not found');
      }

      this.credentials.splice(index, 1);

      // Delete file
      const fileName = `${id}.json`;
      const filePath = `${CERTIFICATES_FOLDER}/${fileName}`;
      const fileExists = await RNFS.exists(filePath);
      if (fileExists) {
        await RNFS.unlink(filePath);
      }

      // Save updated list
      await this.saveCredentials();
    } catch (error) {
      console.error('Error deleting credential:', error);
      throw new Error('Failed to delete credential');
    }
  }

  async verifyCredential(id: string): Promise<VerificationResult> {
    try {
      const credential = await this.getCredential(id);
      if (!credential) {
        throw new Error('Credential not found');
      }

      // Basic verification checks
      const result: VerificationResult = {
        isValid: false,
        checks: {
          format: false,
          signature: false,
          issuer: false,
          expiration: false,
          revocation: false,
        },
        errors: [],
        verifiedAt: new Date().toISOString(),
      };

      // Format check
      if (credential.type && credential.issuer && credential.credentialSubject) {
        result.checks.format = true;
      } else {
        result.errors.push('Invalid credential format');
      }

      // Expiration check
      if (!credential.expirationDate || new Date(credential.expirationDate) > new Date()) {
        result.checks.expiration = true;
      } else {
        result.errors.push('Credential has expired');
      }

      // Issuer check (basic validation)
      if (typeof credential.issuer === 'object' && credential.issuer?.id) {
        result.checks.issuer = true;
      } else {
        result.errors.push('Invalid issuer information');
      }

      // Signature verification (placeholder - would need actual blockchain verification)
      if (credential.proof?.type && credential.proof?.signatureValue) {
        result.checks.signature = true;
      } else {
        result.errors.push('Invalid or missing proof');
      }

      // Revocation check (placeholder - would check revocation lists)
      result.checks.revocation = true;

      // Overall validity
      result.isValid = Object.values(result.checks).every(check => check);

      // Update credential metadata
      if (credential.metadata) {
        credential.metadata.isVerified = result.isValid;
        credential.metadata.verificationStatus = result.isValid ? 'verified' : 'failed';
        credential.metadata.lastVerifiedAt = result.verifiedAt;
        await this.saveCredentials();
      }

      return result;
    } catch (error) {
      console.error('Error verifying credential:', error);
      return {
        isValid: false,
        checks: {
          format: false,
          signature: false,
          issuer: false,
          expiration: false,
          revocation: false,
        },
        errors: [error instanceof Error ? error.message : 'Verification failed'],
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  async shareCredential(id: string): Promise<string> {
    try {
      const credential = await this.getCredential(id);
      if (!credential) {
        throw new Error('Credential not found');
      }

      // Read credential file
      const fileName = `${id}.json`;
      const filePath = `${CERTIFICATES_FOLDER}/${fileName}`;
      const credentialData = await RNFS.readFile(filePath, 'utf8');

      return credentialData;
    } catch (error) {
      console.error('Error sharing credential:', error);
      throw new Error('Failed to share credential');
    }
  }

  async searchCredentials(query: string): Promise<BlockcertCredential[]> {
    const lowerQuery = query.toLowerCase();
    return this.credentials.filter(credential => 
      credential.credentialSubject?.name?.toLowerCase().includes(lowerQuery) ||
      (typeof credential.issuer === 'object' && credential.issuer?.name?.toLowerCase().includes(lowerQuery)) ||
      credential.type?.some((type: string) => type.toLowerCase().includes(lowerQuery)) ||
      credential.credentialSubject?.degree?.name?.toLowerCase().includes(lowerQuery)
    );
  }

  async getCredentialsByIssuer(issuerId: string): Promise<BlockcertCredential[]> {
    return this.credentials.filter(credential => 
      typeof credential.issuer === 'object' && credential.issuer?.id === issuerId
    );
  }

  async getCredentialsByType(type: string): Promise<BlockcertCredential[]> {
    return this.credentials.filter(credential => 
      credential.type?.includes(type)
    );
  }

  async exportCredentials(): Promise<string> {
    try {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        credentials: this.credentials,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting credentials:', error);
      throw new Error('Failed to export credentials');
    }
  }

  async importCredentialsFromBackup(backupData: string): Promise<number> {
    try {
      const data = JSON.parse(backupData);
      
      if (!data.credentials || !Array.isArray(data.credentials)) {
        throw new Error('Invalid backup format');
      }

      let importedCount = 0;
      
      for (const credential of data.credentials) {
        try {
          // Check if credential already exists
          const existingCredential = this.credentials.find(cred => cred.id === credential.id);
          if (!existingCredential) {
            // Save credential file
            const fileName = `${credential.id}.json`;
            const filePath = `${CERTIFICATES_FOLDER}/${fileName}`;
            await RNFS.writeFile(filePath, JSON.stringify(credential), 'utf8');

            this.credentials.push(credential);
            importedCount++;
          }
        } catch (error) {
          console.warn('Failed to import credential:', credential.id, error);
        }
      }

      await this.saveCredentials();
      return importedCount;
    } catch (error) {
      console.error('Error importing credentials from backup:', error);
      throw new Error('Failed to import credentials');
    }
  }
}
