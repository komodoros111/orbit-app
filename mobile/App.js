import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { C, navTheme } from './src/theme';
import { getToken, setToken as persistToken } from './src/config';
import { api } from './src/api';
import { connectSocket, disconnectSocket } from './src/socket';
import { registerNotifications, localNotify } from './src/notify';
import { Logo } from './src/components/Logo';

import LoginScreen from './src/screens/LoginScreen';
import ServersScreen from './src/screens/ServersScreen';
import ChannelsScreen from './src/screens/ChannelsScreen';
import ChatScreen from './src/screens/ChatScreen';
import FriendsScreen from './src/screens/FriendsScreen';

export const Auth = createContext(null);
export const useAuth = () => useContext(Auth);

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const navHeader = { headerStyle: { backgroundColor: C.bg1 }, headerTintColor: C.text, headerTitleStyle: { fontWeight: '700' } };

function ServersStack() {
  return (
    <Stack.Navigator screenOptions={navHeader}>
      <Stack.Screen name="Servers" component={ServersScreen} options={{ title: 'Servidores' }} />
      <Stack.Screen name="Channels" component={ChannelsScreen} options={({ route }) => ({ title: route.params?.serverName || 'Canais' })} />
      <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: '#' + (route.params?.channelName || '') })} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: C.bg1, borderTopColor: C.line, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: C.white,
        tabBarInactiveTintColor: C.muted,
        tabBarIcon: ({ color }) => <Logo name={route.name === 'Amigos' ? 'users' : 'hash'} size={22} color={color} />,
      })}
    >
      <Tabs.Screen name="Comunidades" component={ServersStack} />
      <Tabs.Screen name="Amigos" component={FriendsScreen} />
    </Tabs.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const meRef = useRef(null);

  const login = async (token, user) => { await persistToken(token); meRef.current = user; setAuthed(true); };
  const logout = async () => { await persistToken(null); disconnectSocket(); meRef.current = null; setAuthed(false); };

  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) {
        try { const { user } = await api.me(); meRef.current = user; setAuthed(true); }
        catch { await persistToken(null); }
      }
      setReady(true);
    })();
  }, []);

  // socket + notificações quando logado
  useEffect(() => {
    if (!authed) return;
    let s;
    (async () => {
      await registerNotifications();
      s = await connectSocket();
      s.on('notify', (n) => localNotify('Orbit', n.text || 'Nova notificação'));
      s.on('friend:request', () => localNotify('Orbit', 'Você recebeu um pedido de amizade'));
      s.on('friend:accepted', () => localNotify('Orbit', 'Seu pedido de amizade foi aceito'));
      s.on('message:new', (m) => {
        if (meRef.current && m.author && m.author.id !== meRef.current.id) {
          localNotify('#' + (m.author.username || 'Orbit'), String(m.content || '').slice(0, 120));
        }
      });
    })();
    return () => { if (s) { s.off('notify'); s.off('friend:request'); s.off('friend:accepted'); s.off('message:new'); } };
  }, [authed]);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <Logo name="orbit" size={64} color={C.white} />
        <ActivityIndicator color={C.white} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Auth.Provider value={{ authed, login, logout, me: meRef }}>
        <StatusBar style="light" />
        <NavigationContainer theme={navTheme}>
          {authed ? <MainTabs /> : <LoginScreen />}
        </NavigationContainer>
      </Auth.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
});
