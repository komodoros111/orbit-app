import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { C } from '../theme';
import { api } from '../api';
import { getApiBase, setApiBase } from '../config';
import { Logo } from '../components/Logo';
import { useAuth } from '../../App';

export default function LoginScreen() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [apiUrl, setApiUrl] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showApi, setShowApi] = useState(false);

  useEffect(() => { getApiBase().then(setApiUrl); }, []);

  async function submit() {
    setErr(''); setBusy(true);
    try {
      await setApiBase(apiUrl);
      const res = mode === 'login'
        ? await api.login({ email, password })
        : await api.register({ username, email, password });
      await login(res.token, res.user);
    } catch (e) {
      setErr(e.message || 'Falha ao entrar');
    } finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Logo name="orbit" size={44} color={C.white} />
          <Text style={styles.brandText}>ORBIT</Text>
        </View>
        <Text style={styles.title}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>
        <Text style={styles.sub}>A órbita gamer das suas conversas.</Text>

        {!!err && <Text style={styles.err}>{err}</Text>}

        {mode === 'register' && (
          <Field label="Nome de usuário" value={username} onChangeText={setUsername} placeholder="seunome" />
        )}
        <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Senha" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

        <TouchableOpacity style={[styles.btn, styles.btnPrimary, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          <Text style={styles.btnPrimaryText}>{busy ? '...' : (mode === 'login' ? 'Entrar' : 'Criar conta')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <Text style={styles.switch}>{mode === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowApi(!showApi)} style={{ marginTop: 24 }}>
          <Text style={styles.apiToggle}>{showApi ? 'Ocultar servidor' : 'Configurar servidor'}</Text>
        </TouchableOpacity>
        {showApi && (
          <View>
            <Field label="URL do backend Orbit" value={apiUrl} onChangeText={setApiUrl} placeholder="http://10.0.2.2:4317" autoCapitalize="none" />
            <Text style={styles.hint}>Emulador: http://10.0.2.2:4317 · Celular: http://IP-DO-PC:4317</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={C.muted2} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 26, paddingTop: 80, flexGrow: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30 },
  brandText: { color: C.text, fontSize: 24, fontWeight: '800', letterSpacing: 4 },
  title: { color: C.text, fontSize: 30, fontWeight: '800' },
  sub: { color: C.muted, marginTop: 4, marginBottom: 24 },
  err: { color: C.white, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: C.line2, borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 14 },
  field: { marginBottom: 14 },
  label: { color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: C.bg2, borderColor: C.line, borderWidth: 1, borderRadius: 8, color: C.text, padding: 13, fontSize: 15 },
  btn: { padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  btnPrimary: { backgroundColor: C.white },
  btnPrimaryText: { color: C.black, fontWeight: '800', letterSpacing: 0.5 },
  switch: { color: C.text, textAlign: 'center', marginTop: 18, fontWeight: '600' },
  apiToggle: { color: C.muted, textAlign: 'center', fontSize: 13 },
  hint: { color: C.muted2, fontSize: 11, marginTop: -6 },
});
