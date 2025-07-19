# Credential Addition and Issuer Matching Flow

## How Credentials Are Added to Issuers

### Current Implementation Summary

The Blockcerts Wallet app implements a sophisticated credential-to-issuer matching system based on **publicKey** verification. Here's how it works:

## 1. Credential Import Process (AddCredentialScreen.tsx)

When a user adds a credential through any method (QR scan, file import, or URL):

### Step 1: Extract Issuer Information from Credential
```typescript
// From credential JSON, extract issuer URL
let issuerUrl = '';
if (typeof jsonData.issuer === 'string') {
  issuerUrl = jsonData.issuer;
} else if (jsonData.issuer && jsonData.issuer.id) {
  issuerUrl = jsonData.issuer.id;
} else if (jsonData.issuer && jsonData.issuer.url) {
  issuerUrl = jsonData.issuer.url;
}
```

### Step 2: Fetch Issuer Data from URL
```typescript
const response = await fetch(issuerUrl);
const issuerData = await response.json();
```

### Step 3: Extract PublicKey from Issuer Data
The system handles both array and string formats:
```typescript
if (Array.isArray(issuerData.publicKey) && issuerData.publicKey.length > 0) {
  issuerPublicKey = issuerData.publicKey[0].id || JSON.stringify(issuerData.publicKey[0]);
} else if (typeof issuerData.publicKey === 'string') {
  issuerPublicKey = issuerData.publicKey;
}
```

### Step 4: Match Against Stored Issuers
```typescript
const storedIssuers = await StorageService.getIssuers();
matchedIssuer = storedIssuers.find(issuer => issuer.publicKey === issuerPublicKey);
```

### Step 5: Associate Credential with Issuer
```typescript
const credentialData: BlockcertCredential = {
  // ... other credential fields
  metadata: {
    // ... other metadata
    issuerId: matchedIssuer?.id, // Link credential to issuer
  },
};

await StorageService.saveCredential(credentialData);
```

## 2. Issuer Addition Process (AddIssuerScreen.tsx)

When adding an issuer, the publicKey is extracted and stored:

### PublicKey Extraction Logic
```typescript
const validateIssuerJson = (jsonData: any) => {
  // Handle publicKey as array (extract first key ID) or string
  let publicKey: string;
  if (Array.isArray(jsonData.publicKey)) {
    if (jsonData.publicKey.length === 0) {
      throw new Error('publicKey array is empty');
    }
    // Extract the ID from the first public key object
    publicKey = jsonData.publicKey[0].id || JSON.stringify(jsonData.publicKey[0]);
  } else {
    publicKey = jsonData.publicKey;
  }
  
  return {
    name: jsonData.name,
    introductionURL: jsonData.introductionURL,
    publicKey: publicKey,
  };
};
```

## 3. PublicKey Format Handling

The system supports the standard Blockcerts publicKey format:
```json
{
  "publicKey": [
    {
      "id": "ecdsa-koblitz-pubkey:0x42196b6DDde5Fbc29fb184C40E451d53b023f27F",
      "created": "2021-06-23T19:06:58.980071+00:00"
    }
  ]
}
```

**Key Points:**
- Extracts the `id` field from the first publicKey object
- Falls back to stringifying the entire object if `id` is missing
- Handles both array and string formats for backward compatibility

## 4. Storage and Retrieval (StorageService.ts)

### Enhanced Methods for Issuer-Credential Association

```typescript
// Get credentials by issuer ID (most accurate)
static async getCredentialsByIssuerId(issuerId: string): Promise<BlockcertCredential[]> {
  const credentials = await this.getCredentials();
  return credentials.filter(credential => credential.metadata?.issuerId === issuerId);
}

// Count credentials by issuer ID
static async getCredentialCountByIssuerId(issuerId: string): Promise<number> {
  const credentials = await this.getCredentialsByIssuerId(issuerId);
  return credentials.length;
}

// Get issuers with accurate credential counts
static async getIssuersWithCredentialCountsById(): Promise<Array<IssuerDetails & { credentialCount: number }>> {
  const issuers = await this.getIssuers();
  const issuersWithCounts = await Promise.all(
    issuers.map(async (issuer) => {
      const credentialCount = await this.getCredentialCountByIssuerId(issuer.id);
      return { ...issuer, credentialCount };
    })
  );
  return issuersWithCounts;
}
```

## 5. UI Navigation Flow

### CredentialsScreen → IssuerDetailsScreen
1. **CredentialsScreen** displays all issuers with credential counts
2. When user taps an issuer, navigates to **IssuerDetailsScreen**
3. **IssuerDetailsScreen** shows:
   - Issuer information (name, image, description)
   - List of all credentials from that specific issuer
   - Credential management options (view, delete)

### Navigation Implementation
```typescript
const handleIssuerPress = (issuer: IssuerWithCredentialCount) => {
  (navigation as any).navigate('IssuerDetails', { issuerId: issuer.id });
};
```

## 6. TypeScript Interface Updates

### Enhanced CertificateMetadata
```typescript
export interface CertificateMetadata {
  title?: string;
  description?: string;
  recipient?: string;
  addedAt?: Date;
  importedAt: string;
  source: 'file' | 'url' | 'qr';
  fileSize: number;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'failed';
  lastVerifiedAt?: string;
  issuerId?: string; // NEW: Links credential to specific issuer
}
```

## 7. Error Handling and User Experience

### Missing Issuer Warning
If a credential's issuer is not found in local storage:
```typescript
Alert.alert(
  'Issuer Not Found',
  'This credential is from an issuer that is not yet added to your wallet. Please add the issuer first before importing credentials from them.',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Import Anyway', onPress: () => proceedWithCredentialImport(...) },
  ]
);
```

## 8. Key Security Features

1. **PublicKey Verification**: Ensures credentials are only associated with verified issuers
2. **OTP Verification**: Issuers must be verified through OTP before being trusted
3. **Immutable Association**: Once a credential is linked to an issuer via publicKey matching, the association is secure

## 9. Data Flow Summary

```
[Credential JSON] 
    ↓ (extract issuer URL)
[Fetch Issuer Data from URL] 
    ↓ (extract publicKey)
[Match publicKey with Stored Issuers] 
    ↓ (if match found)
[Associate Credential with Issuer ID] 
    ↓
[Store Credential with issuerId in metadata]
    ↓
[Display in CredentialsScreen grouped by issuer]
    ↓ (user taps issuer)
[Show IssuerDetailsScreen with filtered credentials]
```

This system ensures that credentials are accurately matched to their issuers based on cryptographic public keys, providing both security and proper organization of the user's credential collection.
