// RegisterScreen.js — updated to send OTP after registration
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import api from '../api/client';

export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('ETB');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters'); return;
    }
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address'); return;
    }

    setLoading(true);
    try {
      // 1. Register the user
      await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        default_currency: currency,
      });

      // 2. Send OTP to their email
      await api.post('/auth/send-otp', {
        email: email.trim().toLowerCase(),
        name: name.trim(),
      });

      // 3. Go to OTP verification screen
      navigation.replace('OTPVerification', {
        email: email.trim().toLowerCase(),
        name: name.trim(),
      });

    } catch (e) {
      Alert.alert(
        'Registration Failed',
        e.response?.data?.detail || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.primary }]}>FinTrack</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>Create your account</Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Your name" placeholderTextColor={colors.textSecondary}
          value={name} onChangeText={setName}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="you@email.com" placeholderTextColor={colors.textSecondary}
          value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none"
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Min 6 characters" placeholderTextColor={colors.textSecondary}
          value={password} onChangeText={setPassword} secureTextEntry
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Default Currency</Text>
        <View style={styles.currencyRow}>
          {['ETB', 'USD'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.currencyBtn, { backgroundColor: colors.card, borderColor: colors.border },
                currency === c && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setCurrency(c)}
            >
              <Text style={[styles.currencyText, { color: colors.textSecondary },
                currency === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleRegister} disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Create Account</Text>
          }
        </TouchableOpacity>

        {loading && (
          <Text style={[styles.loadingHint, { color: colors.textSecondary }]}>
            Sending verification code to your email...
          </Text>
        )}

        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
            <Text style={[styles.linkBold, { color: colors.primary }]}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  tagline: { fontSize: 16, marginTop: 8 },
  label: { fontSize: 13, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15 },
  currencyRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  currencyBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  currencyText: { fontSize: 15, fontWeight: '600' },
  button: { borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingHint: { fontSize: 13, textAlign: 'center', marginTop: 12 },
  linkBtn: { alignItems: 'center', marginTop: 20 },
  linkText: { fontSize: 14 },
  linkBold: { fontWeight: '600' },
});