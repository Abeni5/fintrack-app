// ─────────────────────────────────────────────────────────────────────────────
// OTPVerificationScreen.js
// Place at: src/screens/OTPVerificationScreen.js
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import api from '../api/client';

export default function OTPVerificationScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { email, name } = route.params;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60); // 60s cooldown
  const [canResend, setCanResend] = useState(false);

  const inputs = useRef([]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => inputs.current[0]?.focus(), 400);
  }, []);

  const handleChange = (text, index) => {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5) {
      const full = [...newOtp.slice(0, 5), digit].join('');
      if (full.length === 6) handleVerify(full);
    }
  };

  const handleKeyPress = (e, index) => {
    // Go back on backspace if field is empty
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code) => {
    const finalCode = code || otp.join('');
    if (finalCode.length < 6) {
      Alert.alert('Error', 'Please enter all 6 digits');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, code: finalCode });
      Alert.alert(
        '✅ Email Verified!',
        'Your account is now verified. You can log in.',
        [{ text: 'Login', onPress: () => navigation.replace('Login') }]
      );
    } catch (e) {
      const msg = e.response?.data?.detail || 'Invalid code. Please try again.';
      Alert.alert('Verification Failed', msg);
      // Clear inputs on failure
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email, name });
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputs.current[0]?.focus(), 100);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (e) {
      const msg = e.response?.data?.detail || 'Could not resend. Try again.';
      Alert.alert('Error', msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.inner}>

        {/* Header */}
        <View style={s.header}>
          <Text style={[s.logo, { color: colors.primary }]}>FinTrack</Text>
          <Text style={[s.title, { color: colors.text }]}>Verify your email</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            We sent a 6-digit code to
          </Text>
          <Text style={[s.email, { color: colors.primary }]}>{email}</Text>
        </View>

        {/* OTP Input boxes */}
        <View style={s.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => inputs.current[index] = ref}
              style={[
                s.otpBox,
                {
                  backgroundColor: colors.card,
                  borderColor: digit ? colors.primary : colors.border,
                  color: colors.text,
                }
              ]}
              value={digit}
              onChangeText={text => handleChange(text, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify button */}
        <TouchableOpacity
          style={[s.verifyBtn, { backgroundColor: colors.primary },
            loading && { opacity: 0.7 }]}
          onPress={() => handleVerify()}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.verifyText}>Verify Email</Text>
          }
        </TouchableOpacity>

        {/* Resend */}
        <View style={s.resendRow}>
          <Text style={[s.resendLabel, { color: colors.textSecondary }]}>
            Didn't receive it?{' '}
          </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              {resending
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.resendBtn, { color: colors.primary }]}>Resend code</Text>
              }
            </TouchableOpacity>
          ) : (
            <Text style={[s.resendTimer, { color: colors.textSecondary }]}>
              Resend in {countdown}s
            </Text>
          )}
        </View>

        {/* Back to register */}
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.replace('Register')}
        >
          <Text style={[s.backText, { color: colors.textSecondary }]}>
            ← Wrong email? Go back
          </Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 10 },
  subtitle: { fontSize: 15, marginBottom: 4 },
  email: { fontSize: 15, fontWeight: '600' },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 32 },
  otpBox: {
    width: 46, height: 56, borderRadius: 12,
    borderWidth: 2, fontSize: 24, fontWeight: '700',
  },
  verifyBtn: {
    borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 24,
  },
  verifyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  resendLabel: { fontSize: 14 },
  resendBtn: { fontSize: 14, fontWeight: '600' },
  resendTimer: { fontSize: 14 },
  backBtn: { alignItems: 'center', marginTop: 8 },
  backText: { fontSize: 13 },
});