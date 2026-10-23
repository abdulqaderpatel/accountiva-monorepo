import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { configureApi, setActiveOrganizationId } from '@accountiva/api';

// For physical devices or Android emulator:
// Android Emulator uses 10.0.2.2 to access host machine localhost.
// Web / iOS Simulator uses localhost.
// Detect API base URL:
// 1. If EXPO_PUBLIC_API_URL is provided in environment / .env, use it.
// 2. In __DEV__, use 10.0.2.2 for Android emulator or localhost for iOS/web.
// 3. In production, fallback to the hosted API URL.
const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api';
    }
    return 'http://localhost:5000/api';
  }

  return 'https://accountiva-api.netlify.app/api';
};

export const API_BASE_URL = getApiBaseUrl();

export async function setupMobileApi() {
  api.defaults.headers.common['Origin'] = 'https://accountiva.ai';

  try {
    const storedOrgId = await AsyncStorage.getItem('accountiva_org_id');
    if (storedOrgId) {
      setActiveOrganizationId(storedOrgId);
    }
  } catch {}

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
      console.warn('[Mobile API] Received 401 Unauthorized response');
    },
  });
}

