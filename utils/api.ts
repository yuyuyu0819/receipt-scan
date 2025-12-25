import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })?.manifest2?.extra
      ?.expoClient?.hostUri ??
    Constants.manifest?.debuggerHost;
  const host = hostUri?.split(':')[0];
  if (host) {
    return `http://${host}:8080`;
  }

  return Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();
