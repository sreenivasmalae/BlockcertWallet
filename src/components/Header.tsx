import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  rightComponent,
  backgroundColor = '#2196F3',
  textColor = '#FFFFFF',
}) => {
  return (
    <>
      <StatusBar backgroundColor={backgroundColor} barStyle="light-content" />
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <View style={[styles.header, { backgroundColor }]}>
          {/* Left Section - Back Button or Logo */}
          <View style={styles.leftSection}>
            {showBackButton ? (
              <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color={textColor} />
              </TouchableOpacity>
            ) : (
              <View style={styles.logoContainer}>
                <Icon name="verified" size={28} color={textColor} />
                <Text style={[styles.appName, { color: textColor }]}>
                  Blockcerts
                </Text>
              </View>
            )}
          </View>

          {/* Center Section - Title */}
          <View style={styles.centerSection}>
            {title && (
              <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                {title}
              </Text>
            )}
          </View>

          {/* Right Section - Custom Component */}
          <View style={styles.rightSection}>
            {rightComponent || <View style={styles.placeholder} />}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#2196F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 56,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  placeholder: {
    width: 40,
  },
});

export default Header;
