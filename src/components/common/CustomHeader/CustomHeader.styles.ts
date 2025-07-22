import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f8f9fa',
  } as ViewStyle,
  
  headerContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  } as ViewStyle,
  
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  } as ViewStyle,
  
  centerSection: {
    flex: 2,
    alignItems: 'center',
  } as ViewStyle,
  
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  } as ViewStyle,
  
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
  } as ViewStyle,
  
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  } as ViewStyle,
  
  logoIcon: {
    marginRight: 8,
  } as ViewStyle,
  
  titleContainer: {
    alignItems: 'flex-start',
  } as ViewStyle,
  
  centerTitleContainer: {
    alignItems: 'center',
  } as ViewStyle,
  
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  } as TextStyle,

  perpetualTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B5CF6',
  } as TextStyle,

  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  } as TextStyle,

  perpetualSubtitle: {
    fontSize: 10,
    marginTop: 2,
  } as TextStyle,  rightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  } as ViewStyle,
  
  rightButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  } as TextStyle,
  
  placeholder: {
    width: 40,
  } as ViewStyle,
});

export default styles;
