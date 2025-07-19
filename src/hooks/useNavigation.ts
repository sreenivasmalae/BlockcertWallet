import { useNavigation as useRNNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  MainTabs: undefined;
  CreateWallet: undefined;
  ImportWallet: undefined;
  BackupWallet: { mnemonic: string };
  CredentialDetail: { credentialId: string };
  Verification: { credentialId: string };
  IssuerList: undefined;
  AddIssuer: undefined;
  AddCredential: undefined;
  IssuerDetails: { issuerId: string };
  PdfThumbnailTest: undefined;
  PdfTestScreen: undefined;
};

export type MainTabParamList = {
  Credentials: undefined;
  Scan: undefined;
  Settings: undefined;
};

export type RootStackNavigationProp = StackNavigationProp<RootStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;

export const useNavigation = () => useRNNavigation<RootStackNavigationProp>();
