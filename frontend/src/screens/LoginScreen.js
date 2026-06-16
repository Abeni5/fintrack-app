// LoginScreen.js — updated to check email verification before login
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    setLoading(true);
    try {
      // 1. Check if email is verified first
      const verifyCheck = await api.get(
        `/auth/check-verified/${encodeURIComponent(email.trim().toLowerCase())}`
      );

      if (!verifyCheck.data.is_verified) {
        // Not verified — send fresh OTP and go to verification screen
        setLoading(false);
        Alert.alert(
          '📧 Email Not Verified',
          'You need to verify your email before logging in. We\'ll send you a new code now.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send Code',
              onPress: async () => {
                try {
                  await api.post('/auth/resend-otp', {
                    email: email.trim().toLowerCase(),
                    name: 'User',
                  });
                  navigation.navigate('OTPVerification', {
                    email: email.trim().toLowerCase(),
                    name: 'User',
                  });
                } catch (e) {
                  Alert.alert('Error', 'Could not send verification code. Try again.');
                }
              }
            }
          ]
        );
        return;
      }

      // 2. Email is verified — proceed with login
      await login(email.trim().toLowerCase(), password);

    } catch (e) {
      // 404 means user not found — show generic message
      if (e.response?.status === 404) {
        Alert.alert('Login Failed', 'No account found with this email.');
      } else {
        Alert.alert(
          'Login Failed',
          e.response?.data?.detail || 'Invalid email or password'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.primary }]}>FinTrack</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>Your money. Understood.</Text>
        </View>

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
          placeholder="Your password" placeholderTextColor={colors.textSecondary}
          value={password} onChangeText={setPassword} secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleLogin} disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Login</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Register')}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>
            Don't have an account?{' '}
            <Text style={[styles.linkBold, { color: colors.primary }]}>Register</Text>
          </Text>
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