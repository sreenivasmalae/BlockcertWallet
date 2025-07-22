import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  } as ViewStyle,
  
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  } as ViewStyle,
  
  // Main Title Section
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  } as ViewStyle,
  
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  } as TextStyle,
  
  // Form Section
  formSection: {
    marginBottom: 32,
  } as ViewStyle,
  
  inputContainer: {
    marginBottom: 20,
  } as ViewStyle,
  
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  } as TextStyle,
  
  inputWrapper: {
    position: 'relative',
  } as ViewStyle,
  
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    paddingRight: 50,
  } as ViewStyle,
  
  textInputFocused: {
    borderColor: '#8B5CF6',
    backgroundColor: '#ffffff',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,
  
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
    padding: 4,
  } as ViewStyle,
  
  // Password Strength
  passwordStrengthContainer: {
    marginTop: 8,
  } as ViewStyle,
  
  passwordStrengthBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  } as ViewStyle,
  
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  } as ViewStyle,
  
  passwordStrengthText: {
    fontSize: 12,
    marginTop: 4,
  } as TextStyle,
  
  // Info Section
  infoSection: {
    backgroundColor: '#EBF8FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#93C5FD',
  } as ViewStyle,
  
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,
  
  infoIcon: {
    marginRight: 12,
  } as ViewStyle,
  
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  } as TextStyle,
  
  infoDescription: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  } as TextStyle,
  
  // Buttons
  buttonSection: {
    marginBottom: 24,
  } as ViewStyle,
  
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  
  primaryButtonGradient: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  } as TextStyle,
  
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8B5CF6',
    marginLeft: 8,
  } as TextStyle,
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  } as ViewStyle,
  
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  } as TextStyle,
  
  footerLink: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  } as TextStyle,
  
  // Loading State
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  } as ViewStyle,
  
  loadingContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  
  loadingText: {
    fontSize: 16,
    color: '#374151',
    marginTop: 12,
  } as TextStyle,
});

export default styles;
