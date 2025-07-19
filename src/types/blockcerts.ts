export interface BlockcertCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string | IssuerProfile;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: CredentialSubject;
  proof?: Proof;
  // Blockcerts specific fields
  recipientProfile?: RecipientProfile;
  assertion?: Assertion;
  badge?: Badge;
  verify?: VerificationInfo;
  signature?: Signature;
  // Local metadata
  metadata?: CertificateMetadata;
}

export interface IssuerProfile {
  id: string;
  name: string;
  url?: string;
  email?: string;
  image?: string;
  publicKey?: PublicKey[];
  revocationList?: string;
  introductionUrl?: string;
}

export interface CredentialSubject {
  id?: string;
  name?: string;
  publicKey?: string;
  [key: string]: any;
}

export interface RecipientProfile {
  name: string;
  publicKey: string;
  identity?: string;
}

export interface Assertion {
  id: string;
  uid: string;
  recipient: RecipientProfile;
  badge: Badge;
  image?: string;
  evidence?: string;
  issuedOn: string;
  expires?: string;
}

export interface Badge {
  name: string;
  description: string;
  image: string;
  issuer: IssuerProfile;
  criteria?: string;
}

export interface Proof {
  type: string;
  created: string;
  creator: string;
  nonce?: string;
  signatureValue?: string;
  merkleRoot?: string;
  targetHash?: string;
  proof?: any[];
  anchors?: Anchor[];
}

export interface Signature {
  type: string[];
  merkleRoot: string;
  targetHash: string;
  proof: any[];
  anchors: Anchor[];
}

export interface Anchor {
  sourceId: string;
  type: string;
  chain?: string;
}

export interface PublicKey {
  id: string;
  owner: string;
  publicKeyPem?: string;
  publicKeyBase58?: string;
}

export interface VerificationInfo {
  status: 'valid' | 'invalid' | 'expired' | 'revoked' | 'pending';
  message?: string;
  verifiedOn?: string;
  transactionId?: string;
  blockchainExplorers?: BlockchainExplorer[];
}

export interface BlockchainExplorer {
  chain: 'bitcoin' | 'ethereum';
  url: string;
}

export interface LocalCredential extends BlockcertCredential {
  localId: string;
  importedAt: string;
  lastVerified?: string;
  verification?: VerificationInfo;
  favorite?: boolean;
  tags?: string[];
}

export interface HandshakeRequest {
  url: string;
  nonce: string;
  bitcoinAddress: string;
}

export interface HandshakeResponse {
  success: boolean;
  credential?: BlockcertCredential;
  message?: string;
}

export interface VerificationResult {
  isValid: boolean;
  checks: {
    format: boolean;
    signature: boolean;
    issuer: boolean;
    expiration: boolean;
    revocation: boolean;
  };
  errors: string[];
  verifiedAt: string;
}

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
  issuerId?: string; // ID of the issuer this credential belongs to
  rawJson?: string; // Store the complete credential JSON for detailed view and re-verification
}
