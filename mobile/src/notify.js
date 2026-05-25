import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerNotifications() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Orbit',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 120, 80, 120],
        lightColor: '#FFFFFF',
      });
    }
    const { status } = await Notifications.getPermissionsAsync();
    let final = status;
    if (status !== 'granted') {
      const res = await Notifications.requestPermissionsAsync();
      final = res.status;
    }
    return final === 'granted';
  } catch {
    return false;
  }
}

export async function localNotify(title, body) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {}
}
