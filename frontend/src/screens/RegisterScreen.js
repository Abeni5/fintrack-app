import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('ETB');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password) { Alert.alert('Error', 'Please fill in all fields'); return; }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, currency);
    } catch (error) {
      Alert.alert('Registration Failed', error.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.logo}>FinTrack</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} placeholder="Your name" placeholderTextColor="#888" value={name} onChangeText={setName} />
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="you@email.com" placeholderTextColor="#888" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="Min 6 characters" placeholderTextColor="#888" value={password} onChangeText={setPassword} secureTextEntry />
        <Text style={styles.label}>Default Currency</Text>
        <View style={styles.currencyRow}>
          {['ETB', 'USD'].map((c) => (
            <TouchableOpacity key={c} style={[styles.currencyBtn, currency === c && styles.currencyBtnActive]} onPress={() => setCurrency(c)}>
              <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 48, fontWeight: '800', color: '#378ADD', letterSpacing: -1 },
  tagline: { fontSize: 16, color: '#8B949E', marginTop: 8 },
  label: { fontSize: 13, color: '#8B949E', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D', borderRadius: 10, padding: 14, fontSize: 15, color: '#E6EDF3' },
  currencyRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  currencyBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D' },
  currencyBtnActive: { backgroundColor: '#378ADD', borderColor: '#378ADD' },
  currencyText: { fontSize: 15, color: '#8B949E', fontWeight: '600' },
  currencyTextActive: { color: '#fff' },
  button: { backgroundColor: '#378ADD', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBtn: { alignItems: 'center', marginTop: 20 },
  linkText: { color: '#8B949E', fontSize: 14 },
  linkBold: { color: '#378ADD', fontWeight: '600' },
});