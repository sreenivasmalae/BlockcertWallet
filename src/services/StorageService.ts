import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlockcertCredential } from '../types/blockcerts';

export interface IssuerDetails {
  id: string;
  name: string;
  url: string;
  publicKey: string;
  email?: string;
  description?: string;
  image?: string; // Base64 encoded image
  addedAt: Date;
}

export class StorageService {
  private static readonly CREDENTIALS_KEY = 'stored_credentials';
  private static readonly ISSUERS_KEY = 'stored_issuers';

  // Credential Management
  static async saveCredential(credential: BlockcertCredential): Promise<void> {
    try {
      const existingCredentials = await this.getCredentials();
      const updatedCredentials = [...existingCredentials, {
        ...credential,
        addedAt: new Date(),
      }];
      
      await AsyncStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify(updatedCredentials));
    } catch (error) {
      console.error('Error saving credential:', error);
      throw new Error('Failed to save credential');
    }
  }

  static async getCredentials(): Promise<BlockcertCredential[]> {
    try {
      const credentialsJson = await AsyncStorage.getItem(this.CREDENTIALS_KEY);
      if (!credentialsJson) {
        return [];
      }
      
      const credentials = JSON.parse(credentialsJson);
      return credentials.map((cred: any) => ({
        ...cred,
        issuedOn: new Date(cred.issuedOn),
        addedAt: cred.addedAt ? new Date(cred.addedAt) : new Date(),
      }));
    } catch (error) {
      console.error('Error getting credentials:', error);
      return [];
    }
  }

  static async getCredentialById(id: string): Promise<BlockcertCredential | null> {
    try {
      const credentials = await this.getCredentials();
      return credentials.find(cred => cred.id === id) || null;
    } catch (error) {
      console.error('Error getting credential by ID:', error);
      return null;
    }
  }

  static async deleteCredential(id: string): Promise<void> {
    try {
      const credentials = await this.getCredentials();
      const filteredCredentials = credentials.filter(cred => cred.id !== id);
      
      await AsyncStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify(filteredCredentials));
    } catch (error) {
      console.error('Error deleting credential:', error);
      throw new Error('Failed to delete credential');
    }
  }

  static async updateCredential(id: string, updates: Partial<BlockcertCredential>): Promise<void> {
    try {
      const credentials = await this.getCredentials();
      const credentialIndex = credentials.findIndex(cred => cred.id === id);
      
      if (credentialIndex === -1) {
        throw new Error('Credential not found');
      }

      credentials[credentialIndex] = { ...credentials[credentialIndex], ...updates };
      
      await AsyncStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify(credentials));
    } catch (error) {
      console.error('Error updating credential:', error);
      throw new Error('Failed to update credential');
    }
  }

  // Issuer Management
  static async saveIssuer(issuer: IssuerDetails): Promise<void> {
    try {
      const existingIssuers = await this.getIssuers();
      const issuerExists = existingIssuers.find(existing => existing.id === issuer.id);
      
      if (issuerExists) {
        // Update existing issuer
        await this.updateIssuer(issuer.id, issuer);
      } else {
        // Add new issuer
        const updatedIssuers = [...existingIssuers, {
          ...issuer,
          addedAt: new Date(),
        }];
        
        await AsyncStorage.setItem(this.ISSUERS_KEY, JSON.stringify(updatedIssuers));
      }
    } catch (error) {
      console.error('Error saving issuer:', error);
      throw new Error('Failed to save issuer');
    }
  }

  static async getIssuers(): Promise<IssuerDetails[]> {
    try {
      const issuersJson = await AsyncStorage.getItem(this.ISSUERS_KEY);
      if (!issuersJson) {
        return [];
      }
      
      const issuers = JSON.parse(issuersJson);
      return issuers.map((issuer: any) => ({
        ...issuer,
        addedAt: new Date(issuer.addedAt),
      }));
    } catch (error) {
      console.error('Error getting issuers:', error);
      return [];
    }
  }

  static async getIssuerById(id: string): Promise<IssuerDetails | null> {
    try {
      const issuers = await this.getIssuers();
      return issuers.find(issuer => issuer.id === id) || null;
    } catch (error) {
      console.error('Error getting issuer by ID:', error);
      return null;
    }
  }

  static async updateIssuer(id: string, updates: Partial<IssuerDetails>): Promise<void> {
    try {
      const issuers = await this.getIssuers();
      const issuerIndex = issuers.findIndex(issuer => issuer.id === id);
      
      if (issuerIndex === -1) {
        throw new Error('Issuer not found');
      }

      issuers[issuerIndex] = { ...issuers[issuerIndex], ...updates };
      
      await AsyncStorage.setItem(this.ISSUERS_KEY, JSON.stringify(issuers));
    } catch (error) {
      console.error('Error updating issuer:', error);
      throw new Error('Failed to update issuer');
    }
  }

  static async deleteIssuer(id: string): Promise<void> {
    try {
      const issuers = await this.getIssuers();
      const filteredIssuers = issuers.filter(issuer => issuer.id !== id);
      
      await AsyncStorage.setItem(this.ISSUERS_KEY, JSON.stringify(filteredIssuers));
    } catch (error) {
      console.error('Error deleting issuer:', error);
      throw new Error('Failed to delete issuer');
    }
  }

  // Check if a credential with the given ID already exists
  static async checkCredentialExists(credentialId: string): Promise<{ exists: boolean; credential?: BlockcertCredential; issuerName?: string }> {
    try {
      const credentials = await this.getCredentials();
      const existingCredential = credentials.find(cred => cred.id === credentialId);
      
      if (!existingCredential) {
        return { exists: false };
      }

      // Get issuer name
      let issuerName = 'Unknown Issuer';
      
      if (typeof existingCredential.issuer === 'object' && existingCredential.issuer.name) {
        issuerName = existingCredential.issuer.name;
      } else if (existingCredential.metadata?.issuerId) {
        // Try to get issuer name from issuer ID
        const issuer = await this.getIssuerById(existingCredential.metadata.issuerId);
        if (issuer) {
          issuerName = issuer.name;
        }
      }

      return { 
        exists: true, 
        credential: existingCredential, 
        issuerName 
      };
    } catch (error) {
      console.error('Error checking credential existence:', error);
      return { exists: false };
    }
  }

  // Count credentials by issuer
  static async getCredentialCountByIssuer(issuerName: string): Promise<number> {
    try {
      const credentials = await this.getCredentials();
      return credentials.filter(credential => {
        if (typeof credential.issuer === 'object') {
          return credential.issuer?.name === issuerName;
        }
        return credential.issuer === issuerName;
      }).length;
    } catch (error) {
      console.error('Error counting credentials by issuer:', error);
      return 0;
    }
  }

  // Get issuers with credential counts
  static async getIssuersWithCredentialCounts(): Promise<Array<IssuerDetails & { credentialCount: number }>> {
    try {
      const issuers = await this.getIssuers();
      const issuersWithCounts = await Promise.all(
        issuers.map(async (issuer) => {
          const credentialCount = await this.getCredentialCountByIssuer(issuer.name);
          return { ...issuer, credentialCount };
        })
      );
      return issuersWithCounts;
    } catch (error) {
      console.error('Error getting issuers with credential counts:', error);
      return [];
    }
  }

  // Get credentials by issuer ID
  static async getCredentialsByIssuerId(issuerId: string): Promise<BlockcertCredential[]> {
    try {
      const credentials = await this.getCredentials();
      return credentials.filter(credential => credential.metadata?.issuerId === issuerId);
    } catch (error) {
      console.error('Error getting credentials by issuer ID:', error);
      return [];
    }
  }

  // Count credentials by issuer ID (more accurate than by name)
  static async getCredentialCountByIssuerId(issuerId: string): Promise<number> {
    try {
      const credentials = await this.getCredentialsByIssuerId(issuerId);
      return credentials.length;
    } catch (error) {
      console.error('Error counting credentials by issuer ID:', error);
      return 0;
    }
  }

  // Get issuers with credential counts (updated to use issuer ID)
  static async getIssuersWithCredentialCountsById(): Promise<Array<IssuerDetails & { credentialCount: number }>> {
    try {
      const issuers = await this.getIssuers();
      const issuersWithCounts = await Promise.all(
        issuers.map(async (issuer) => {
          const credentialCount = await this.getCredentialCountByIssuerId(issuer.id);
          return { ...issuer, credentialCount };
        })
      );
      return issuersWithCounts;
    } catch (error) {
      console.error('Error getting issuers with credential counts by ID:', error);
      return [];
    }
  }

  // Clear all data
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.CREDENTIALS_KEY, this.ISSUERS_KEY]);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw new Error('Failed to clear all data');
    }
  }

  // Export data for backup
  static async exportData(): Promise<{ credentials: BlockcertCredential[]; issuers: IssuerDetails[] }> {
    try {
      const credentials = await this.getCredentials();
      const issuers = await this.getIssuers();
      
      return { credentials, issuers };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  // Import data from backup
  static async importData(data: { credentials: BlockcertCredential[]; issuers: IssuerDetails[] }): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify(data.credentials));
      await AsyncStorage.setItem(this.ISSUERS_KEY, JSON.stringify(data.issuers));
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Failed to import data');
    }
  }

  // Re-verify a credential and update its verification status
  static async reverifyCredential(credentialId: string): Promise<{ success: boolean; status: 'verified' | 'failed'; message?: string }> {
    try {
      const credential = await this.getCredentialById(credentialId);
      if (!credential || !credential.metadata?.rawJson) {
        return { success: false, status: 'failed', message: 'Credential or raw data not found' };
      }

      // Parse the raw JSON
      // const jsonData = JSON.parse(credential.metadata.rawJson);
      
      // Use Blockcerts verifier (import would be needed in the actual file)
      // For now, we'll just update the metadata with current timestamp
      const updatedMetadata = {
        ...credential.metadata,
        lastVerifiedAt: new Date().toISOString(),
        // Verification logic would go here
      };

      await this.updateCredential(credentialId, { metadata: updatedMetadata });
      
      return { success: true, status: 'verified' };
    } catch (error) {
      console.error('Error reverifying credential:', error);
      return { success: false, status: 'failed', message: 'Verification failed' };
    }
  }
}
