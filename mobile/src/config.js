import AsyncStorage from '@react-native-async-storage/async-storage';

// URL padrão do backend Orbit.
//  - Emulador Android: http://10.0.2.2:4317 (mapeia pro localhost do PC)
//  - Celular físico (Samsung): use o IP do PC na rede, ex.: http://192.168.0.10:4317
//  - Produção: a URL do seu backend hospedado
export const DEFAULT_API = 'http://10.0.2.2:4317';

export async function getApiBase() {
  return (await AsyncStorage.getItem('orbit.api')) || DEFAULT_API;
}
export async function setApiBase(url) {
  await AsyncStorage.setItem('orbit.api', String(url || '').replace(/\/$/, ''));
}
export async function getToken() {
  return AsyncStorage.getItem('orbit.token');
}
export async function setToken(t) {
  if (t) await AsyncStorage.setItem('orbit.token', t);
  else await AsyncStorage.removeItem('orbit.token');
}
