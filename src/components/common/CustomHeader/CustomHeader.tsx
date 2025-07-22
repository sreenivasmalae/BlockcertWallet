import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import styles from './CustomHeader.styles';

export interface CustomHeaderProps {
  // Basic header content
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showLogo?: boolean;
  
  // Right side customization
  showRightButton?: boolean;
  rightButtonIcon?: string | React.ReactNode;
  rightButtonText?: string;
  onRightButtonPress?: () => void;
  
  // Styling options
  backgroundColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  headerStyle?: ViewStyle;
  
  // Custom content
  customLeftContent?: React.ReactNode;
  customRightContent?: React.ReactNode;
  customHeaderContent?: React.ReactNode; // Replace entire header content
  
  // Navigation
  onBackPress?: () => void;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  showLogo = false,
  showRightButton = false,
  rightButtonIcon,
  rightButtonText,
  onRightButtonPress,
  backgroundColor = '#f8f9fa',
  titleColor = '#333',
  subtitleColor = '#666',
  headerStyle,
  customLeftContent,
  customRightContent,
  customHeaderContent,
  onBackPress,
}) => {
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      console.warn('No onBackPress handler provided for CustomHeader back button');
    }
  };
  
  const renderLeftSection = () => {
    if (customLeftContent) {
      return customLeftContent;
    }
    
    return (
      <View style={styles.leftSection}>
        {showBackButton && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackPress}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="arrow-back" size={24} color={titleColor} />
          </TouchableOpacity>
        )}
        
        {showLogo && (
          <View style={styles.logoContainer}>
            <Icon 
              name="all-inclusive" 
              size={32} 
              color="#8B5CF6" 
              style={styles.logoIcon}
            />
            <View style={styles.titleContainer}>
              <Text style={styles.perpetualTitle}>
                Perpetual
              </Text>
              {subtitle && (
                <Text style={[styles.perpetualSubtitle, { color: subtitleColor }]}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
        )}
        
        {!showLogo && title && !showBackButton && (
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: titleColor }]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: subtitleColor }]}>
                {subtitle}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };
  
  const renderCenterSection = () => {
    if (showBackButton && title && !showLogo) {
      return (
        <View style={styles.centerSection}>
          <View style={styles.centerTitleContainer}>
            <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      );
    }
    return <View style={styles.centerSection} />;
  };
  
  const renderRightSection = () => {
    if (customRightContent) {
      return (
        <View style={styles.rightSection}>
          {customRightContent}
        </View>
      );
    }
    
    if (showRightButton && onRightButtonPress) {
      return (
        <View style={styles.rightSection}>
          <TouchableOpacity 
            style={styles.rightButton} 
            onPress={onRightButtonPress}
            accessibilityRole="button"
          >
            {typeof rightButtonIcon === 'string' ? (
              <Icon name={rightButtonIcon} size={16} color="#fff" />
            ) : (
              rightButtonIcon
            )}
            {rightButtonText && (
              <Text style={styles.rightButtonText}>{rightButtonText}</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }
    
    return <View style={styles.rightSection}><View style={styles.placeholder} /></View>;
  };
  
  return (
    <>
      <StatusBar backgroundColor={backgroundColor} barStyle="dark-content" />
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <View style={[
          styles.headerContainer, 
          { backgroundColor },
          headerStyle
        ]}>
          {customHeaderContent ? (
            customHeaderContent
          ) : (
            <View style={styles.headerContent}>
              {renderLeftSection()}
              {renderCenterSection()}
              {renderRightSection()}
            </View>
          )}
        </View>
      </SafeAreaView>
    </>
  );
};

export default CustomHeader;
