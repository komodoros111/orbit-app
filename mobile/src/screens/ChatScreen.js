import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { C } from '../theme';
import { api } from '../api';
import { connectSocket, socket, emitS } from '../socket';
import { Logo } from '../components/Logo';

export default function ChatScreen({ route }) {
  const { channelId, channelName } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    let s; let handler;
    (async () => {
      try { const { messages } = await api.get('/api/channels/' + channelId + '/messages'); setMessages(messages); } catch {}
      s = await connectSocket();
      emitS('channel:join', channelId);
      handler = (m) => { if (m.channelId === channelId) setMessages((prev) => [...prev, m]); };
      s.on('message:new', handler);
    })();
    return () => { const sk = socket(); if (sk && handler) sk.off('message:new', handler); };
  }, [channelId]);

  function send() {
    const v = text.trim(); if (!v) return;
    emitS('message:send', { channelId, content: v });
    setText('');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 14 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={styles.msg}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(item.author?.username || '?').slice(0, 2).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <View style={styles.line1}>
                <Text style={styles.author}>{item.author?.username || 'desconhecido'}</Text>
                {item.author?.bot && <Text style={styles.botPill}>BOT</Text>}
                <Text style={styles.ts}>{new Date(item.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Text style={styles.content}>{item.content}</Text>
            </View>
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={'Conversar em #' + channelName}
          placeholderTextColor={C.muted2}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.send} onPress={send}><Logo name="send" size={20} color={C.white} /></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  msg: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.elev, borderColor: C.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.text, fontWeight: '800', fontSize: 13 },
  line1: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  author: { color: C.white, fontWeight: '700' },
  botPill: { color: C.black, backgroundColor: C.white, fontSize: 9, fontWeight: '800', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, overflow: 'hidden' },
  ts: { color: C.muted2, fontSize: 11 },
  content: { color: '#d8d8d8', marginTop: 2 },
  composer: { flexDirection: 'row', gap: 8, padding: 10, borderTopColor: C.line, borderTopWidth: 1, backgroundColor: C.bg1 },
  input: { flex: 1, backgroundColor: C.bg3, borderColor: C.line, borderWidth: 1, borderRadius: 10, color: C.text, paddingHorizontal: 14, paddingVertical: 10 },
  send: { width: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg3, borderRadius: 10, borderColor: C.line, borderWidth: 1 },
});
