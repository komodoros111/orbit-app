import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { C } from '../theme';
import { api } from '../api';
import { Logo } from '../components/Logo';

const ICONS = { text: 'hash', voice: 'volume', forum: 'hash' };

export default function ChannelsScreen({ route, navigation }) {
  const { serverId, serverName } = route.params;
  const [server, setServer] = useState(null);

  const load = useCallback(async () => {
    try { const { server } = await api.get('/api/servers/' + serverId); setServer(server); } catch (e) {}
  }, [serverId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const channels = server ? server.channels : [];

  return (
    <View style={styles.wrap}>
      <FlatList
        data={channels}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={<Text style={styles.section}>CANAIS</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              if (item.type === 'text') navigation.navigate('Chat', { channelId: item.id, channelName: item.name, serverName });
            }}
          >
            <Logo name={ICONS[item.type] || 'hash'} size={18} color={C.muted} />
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.type}>{item.type}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, paddingTop: 8 },
  section: { color: C.muted2, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', paddingHorizontal: 18, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 18, borderBottomColor: C.line, borderBottomWidth: 1 },
  name: { color: C.text, fontSize: 16, flex: 1 },
  type: { color: C.muted2, fontSize: 11, fontFamily: 'monospace' },
});
