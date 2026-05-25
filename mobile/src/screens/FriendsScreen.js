import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { C } from '../theme';
import { api } from '../api';
import { Logo } from '../components/Logo';

export default function FriendsScreen() {
  const [tab, setTab] = useState('all');
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [handle, setHandle] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const f = await api.get('/api/friends'); setFriends(f.friends);
      const r = await api.get('/api/friends/requests'); setIncoming(r.incoming); setOutgoing(r.outgoing);
    } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function sendRequest() {
    setMsg('');
    try { const r = await api.post('/api/friends/request', { username: handle }); setHandle(''); setMsg(r.status === 'accepted' ? 'Amizade criada!' : 'Pedido enviado!'); load(); }
    catch (e) { setMsg(e.message); }
  }
  async function accept(id) { await api.post(`/api/friends/requests/${id}/accept`); load(); }
  async function decline(id) { await api.post(`/api/friends/requests/${id}/decline`); load(); }

  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Amigos</Text>
      <View style={styles.tabs}>
        {[['all', 'Amigos'], ['pending', `Pendentes${incoming.length ? ' (' + incoming.length + ')' : ''}`], ['add', 'Adicionar']].map(([id, label]) => (
          <TouchableOpacity key={id} style={[styles.tab, tab === id && styles.tabActive]} onPress={() => setTab(id)}>
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'all' && (
        <FlatList
          data={friends}
          keyExtractor={(f) => f.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.white} />}
          ListEmptyComponent={<Text style={styles.empty}>Sem amigos ainda. Vá em "Adicionar".</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.username.slice(0, 2).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.username} <Text style={styles.tag}>#{item.tag}</Text></Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  {item.playing ? <Logo name="gamepad" size={12} color={C.muted} /> : null}
                  <Text style={styles.sub}>{item.playing ? 'Jogando ' + item.playing : (item.status === 'offline' ? 'Offline' : 'Online')}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {tab === 'pending' && (
        <FlatList
          data={incoming}
          keyExtractor={(r) => r.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.white} />}
          ListHeaderComponent={<Text style={styles.section}>RECEBIDOS</Text>}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum pedido recebido.</Text>}
          ListFooterComponent={
            <View>
              <Text style={styles.section}>ENVIADOS</Text>
              {outgoing.length === 0 && <Text style={styles.empty}>Nenhum pedido enviado.</Text>}
              {outgoing.map((r) => (
                <View key={r.id} style={styles.row}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{r.user.username.slice(0, 2).toUpperCase()}</Text></View>
                  <Text style={styles.name}>{r.user.username} <Text style={styles.tag}>#{r.user.tag}</Text></Text>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => decline(r.id)}><Text style={styles.smallBtnText}>Cancelar</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.user.username.slice(0, 2).toUpperCase()}</Text></View>
              <Text style={styles.name}>{item.user.username} <Text style={styles.tag}>#{item.user.tag}</Text></Text>
              <TouchableOpacity style={[styles.smallBtn, styles.smallBtnPrimary]} onPress={() => accept(item.id)}><Logo name="check" size={16} color={C.black} /></TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => decline(item.id)}><Logo name="close" size={16} color={C.text} /></TouchableOpacity>
            </View>
          )}
        />
      )}

      {tab === 'add' && (
        <View style={{ padding: 18 }}>
          <Text style={styles.label}>Nome de usuário</Text>
          <TextInput style={styles.input} value={handle} onChangeText={setHandle} placeholder="nome ou nome#0000" placeholderTextColor={C.muted2} autoCapitalize="none" />
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={sendRequest}><Text style={styles.btnPrimaryText}>Enviar pedido de amizade</Text></TouchableOpacity>
          {!!msg && <Text style={styles.msg}>{msg}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, paddingTop: 50 },
  h1: { color: C.text, fontSize: 26, fontWeight: '800', paddingHorizontal: 18, marginBottom: 10 },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, borderBottomColor: C.line, borderBottomWidth: 1 },
  tab: { paddingVertical: 10, paddingHorizontal: 12, borderBottomColor: 'transparent', borderBottomWidth: 2 },
  tabActive: { borderBottomColor: C.white },
  tabText: { color: C.muted, fontWeight: '700' },
  tabTextActive: { color: C.white },
  section: { color: C.muted2, fontSize: 11, letterSpacing: 1.2, fontWeight: '700', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 18, borderBottomColor: C.line, borderBottomWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.elev, borderColor: C.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.text, fontWeight: '800', fontSize: 13 },
  name: { color: C.text, fontSize: 15, fontWeight: '600', flex: 1 },
  tag: { color: C.muted, fontSize: 12, fontWeight: '400' },
  sub: { color: C.muted, fontSize: 12, marginTop: 2 },
  empty: { color: C.muted, textAlign: 'center', marginTop: 30, paddingHorizontal: 30 },
  smallBtn: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 7, borderColor: C.line2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  smallBtnPrimary: { backgroundColor: C.white, borderColor: C.white },
  smallBtnText: { color: C.text, fontSize: 12, fontWeight: '600' },
  label: { color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 8, color: C.text, padding: 13, fontSize: 15, marginBottom: 12 },
  btn: { padding: 14, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: C.white },
  btnPrimaryText: { color: C.black, fontWeight: '800' },
  msg: { color: C.text, marginTop: 12, textAlign: 'center' },
});
