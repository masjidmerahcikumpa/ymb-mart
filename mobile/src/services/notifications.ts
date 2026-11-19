import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { registerPushToken } from './api';

let cachedPushToken: string | null = null;

/**
 * Get Expo Push Token safely, asking for permission if necessary.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (cachedPushToken) return cachedPushToken;

  if (!Device.isDevice) {
    console.log('[Notification] Push notifications are not supported on simulator/emulator.');
    return null;
  }

  try {
    // Dynamic import to support environments with or without native notification module
    const Notifications = await import('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notification] Permission not granted for push notifications.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    cachedPushToken = tokenData.data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Status Pesanan',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#16a34a',
      });
    }

    return cachedPushToken;
  } catch (err) {
    console.warn('[Notification] Could not obtain Expo push token:', err);
    return null;
  }
}

/**
 * Register push token to the POS backend server for order status updates.
 */
export async function syncPushTokenWithBackend(customerPhone: string): Promise<boolean> {
  try {
    const token = await getExpoPushToken();
    if (!token) return false;

    const deviceName = `${Device.manufacturer || ''} ${Device.modelName || ''}`.trim() || Platform.OS;
    const res = await registerPushToken(customerPhone, token, deviceName);
    return res.success;
  } catch (err) {
    console.warn('[Notification] Failed to sync push token with backend:', err);
    return false;
  }
}
