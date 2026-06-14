import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      Alert.alert('Login Failed', error.response?.data?.detail || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.primary }]}>FinTrack</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>Your money. Understood.</Text>
        </View>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} placeholder="you@email.com" placeholderTextColor={colors.textSecondary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} placeholder="Your password" placeholderTextColor={colors.textSecondary} value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Register')}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>Don't have an account? <Text style={[styles.linkBold, { color: colors.primary }]}>Register</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  tagline: { fontSize: 16, marginTop: 8 },
  label: { fontSize: 13, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15 },
  button: { borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBtn: { alignItems: 'center', marginTop: 20 },
  linkText: { fontSize: 14 },
  linkBold: { fontWeight: '600' },
});