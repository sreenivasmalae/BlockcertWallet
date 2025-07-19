import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import CredentialsScreen from '../screens/CredentialsScreen';
import ScanScreen from '../screens/ScanScreen';
import SettingsScreen from '../screens/SettingsScreen';
import IssuerListScreen from '../screens/IssuerListScreen';
import AddIssuerScreen from '../screens/AddIssuerScreen';
import IssuerDetailsScreen from '../screens/IssuerDetailsScreen';
import CredentialDetailsScreen from '../screens/CredentialDetailsScreen';
import AddCredentialScreen from '../screens/AddCredentialScreen';


// Import types
import { RootStackParamList, MainTabParamList } from '../hooks/useNavigation';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Create tab bar icon component outside of render
const getTabBarIcon = (routeName: string) => {
  return ({ color, size }: { color: string; size: number }) => {
    let iconName: string;

    switch (routeName) {
      case 'Credentials':
        iconName = 'verified-user';
        break;
      case 'Scan':
        iconName = 'qr-code-scanner';
        break;
      case 'Settings':
        iconName = 'settings';
        break;
      default:
        iconName = 'circle';
    }

    return <Icon name={iconName} size={size} color={color} />;
  };
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: getTabBarIcon(route.name),
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Credentials" 
        component={CredentialsScreen}
        options={{ title: 'Credentials' }}
      />
      <Tab.Screen 
        name="Scan" 
        component={ScanScreen}
        options={{ title: 'Scan QR' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="MainTabs"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="IssuerList" component={IssuerListScreen} />
        <Stack.Screen name="AddIssuer" component={AddIssuerScreen} />
        <Stack.Screen name="AddCredential" component={AddCredentialScreen} />
        <Stack.Screen name="IssuerDetails" component={IssuerDetailsScreen} />
        <Stack.Screen name="CredentialDetail" component={CredentialDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
