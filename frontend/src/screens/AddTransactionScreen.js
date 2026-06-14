import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import api from '../api/client';
import { notifyTransactionAdded, notifyBudgetWarning } from '../notifications/notificationService';

const CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Utilities', 'Health',
  'Education', 'Entertainment', 'Shopping', 'Salary',
  'Freelance', 'Business', 'Other'
];

export default function AddTransactionScreen({ navigation }) {
  const { colors } = useTheme();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ETB');
  const [type, setType] = useState('expense');
  const [costType, setCostType] = useState('variable');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !category) {
      Alert.alert('Error', 'Please enter amount and select a category');
      return;
    }
    setLoading(true);
    try {
      await api.post('/transactions/', {
        amount: parseFloat(amount),
        currency,
        type,
        cost_type: costType,
        category,
        note: note || null,
        transaction_date: new Date().toISOString().split('T')[0],
      });

      // ── Notification 1: transaction added ──────────────────────────────
      await notifyTransactionAdded({
        amount: parseFloat(amount),
        currency,
        type,
        category,
      });

      // ── Notification 2: check budget after expense ─────────────────────
      if (type === 'expense') {
        try {
          const budgetRes = await api.get('/budget/status');
          const budgets = budgetRes.data?.budgets || [];
          const match = budgets.find(b => b.category.toLowerCase() === category.toLowerCase());
          if (match) {
            await notifyBudgetWarning({
              category: match.category,
              percentUsed: match.percent_used,
              spent: match.spent_this_month,
              limit: match.monthly_limit,
              currency: match.currency,
            });
          }
        } catch (_) {
          // Budget check failing should not block the transaction success
        }
      }

      Alert.alert('Success', 'Transaction added!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  const OptionRow = ({ label, options, value, onChange, accentColors }) => (
    <View style={s.optionGroup}>
      <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={s.optionRow}>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.optionBtn, { backgroundColor: colors.card, borderColor: colors.border },
              value === opt.value && { backgroundColor: accentColors[i], borderColor: accentColors[i] }]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[s.optionText, { color: colors.textSecondary }, value === opt.value && { color: '#fff' }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[s.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll}>

        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={[s.backText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.text }]}>Add Transaction</Text>
        </View>

        <OptionRow
          label="Type"
          options={[{ label: '↑ Income', value: 'income' }, { label: '↓ Expense', value: 'expense' }]}
          value={type} onChange={setType} accentColors={['#1D9E75', '#F0997B']}
        />

        <View style={s.optionGroup}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Amount</Text>
          <View style={s.amountRow}>
            <TextInput
              style={[s.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="0.00" placeholderTextColor={colors.textSecondary}
              value={amount} onChangeText={setAmount} keyboardType="decimal-pad"
            />
            <View style={s.currencyRow}>
              {['ETB', 'USD'].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.currencyBtn, { backgroundColor: colors.card, borderColor: colors.border },
                    currency === c && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[s.currencyText, { color: colors.textSecondary }, currency === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <OptionRow
          label="Cost Type"
          options={[{ label: 'Fixed', value: 'fixed' }, { label: 'Variable', value: 'variable' }, { label: 'Accidental', value: 'accidental' }]}
          value={costType} onChange={setCostType} accentColors={['#378ADD', '#8B949E', '#EF9F27']}
        />

        <View style={s.optionGroup}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Category</Text>
          <View style={s.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.categoryBtn, { backgroundColor: colors.card, borderColor: colors.border },
                  category === cat && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[s.categoryText, { color: colors.textSecondary }, category === cat && { color: '#fff' }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.optionGroup}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Note (optional)</Text>
          <TextInput
            style={[s.input, { height: 80, textAlignVertical: 'top', backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Add a note..." placeholderTextColor={colors.textSecondary}
            value={note} onChangeText={setNote} multiline
          />
        </View>

        <TouchableOpacity style={[s.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.submitText}>{type === 'income' ? '↑ Add Income' : '↓ Add Expense'}</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingTop: 40 },
  backBtn: { marginRight: 16 },
  backText: { fontSize: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  optionGroup: { marginBottom: 20 },
  label: { fontSize: 13, marginBottom: 8 },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  optionText: { fontSize: 14, fontWeight: '500' },
  amountRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
  currencyRow: { flexDirection: 'row', gap: 8 },
  currencyBtn: { padding: 12, borderRadius: 10, borderWidth: 1, minWidth: 56, alignItems: 'center' },
  currencyText: { fontSize: 13, fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryText: { fontSize: 13 },
  submitBtn: { borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});