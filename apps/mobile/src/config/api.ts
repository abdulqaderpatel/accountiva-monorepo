import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureApi } from '@accountiva/api';

// For physical devices or Android emulator:
// Android Emulator uses 10.0.2.2 to access host machine localhost.
// Web / iOS Simulator uses localhost.
const getDevApiBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getDevApiBaseUrl();

export async function setupMobileApi() {
  configureApi({
    baseURL: API_BASE_URL,
    getOrganizationId: async () => {
      try {
        return await AsyncStorage.getItem('accountiva_org_id');
      } catch {
        return null;
      }
    },
    getAuthToken: async () => {
      try {
        return await AsyncStorage.getItem('accountiva_token');
      } catch {
        return null;
      }
    },
    onUnauthorized: async () => {
      try {
        await AsyncStorage.removeItem('accountiva_token');
        await AsyncStorage.removeItem('accountiva_user');
      } catch (err) {
        console.error('Error clearing mobile session:', err);
      }
    },
  });
}

