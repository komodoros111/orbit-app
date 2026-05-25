import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { C } from '../theme';
import { api } from '../api';
import { Logo } from '../components/Logo';
import { useAuth } from '../../App';

export default function ServersScreen({ navigation }) {
  const { logout } = useAuth();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { servers } = await api.get('/api/servers'); setServers(servers); } catch (e) {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function createServer() {
    Alert.prompt ? Alert.prompt('Novo servidor', 'Nome do servidor', async (name) => {
      if (name) { try { const { server } = await api.post('/api/servers', { name }); load(); } catch (e) { Alert.alert('Erro', e.message); } }
    }) : Alert.alert('Criar no desktop', 'Use o app para criar servidores, ou habilite Alert.prompt (iOS).');
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.h1}>Servidores</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.iconBtn} onPress={createServer}><Logo name="plus" size={20} color={C.text} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={logout}><Text style={{ color: C.muted, fontSize: 12 }}>Sair</Text></TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={servers}
        keyExtractor={(s) => s.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.white} />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum servidor ainda. Crie um pelo botão +.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Channels', { serverId: item.id, serverName: item.name })}>
            <View style={styles.badge}><Text style={styles.badgeText}>{item.name.slice(0, 2).toUpperCase()}</Text></View>
            <Text style={styles.rowText}>{item.name}</Text>
            <Logo name="hash" size={16} color={C.muted2} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 10 },
  h1: { color: C.text, fontSize: 26, fontWeight: '800' },
  iconBtn: { width: 40, height: 40, borderRadius: 8, borderColor: C.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 18, borderBottomColor: C.line, borderBottomWidth: 1 },
  badge: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: C.text, fontWeight: '800' },
  rowText: { color: C.text, fontSize: 16, fontWeight: '600', flex: 1 },
  empty: { color: C.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 30 },
});
