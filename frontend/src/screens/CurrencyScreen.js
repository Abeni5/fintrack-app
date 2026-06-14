import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import api from '../api/client';

export default function CurrencyScreen() {
  const { colors } = useTheme();
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blackMarketRate, setBlackMarketRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [rateType, setRateType] = useState('bank');
  const [convertResult, setConvertResult] = useState(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => { loadRates(); }, []);

  const loadRates = async () => {
    try {
      const res = await api.get('/currency/rates');
      setRates(res.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const saveBlackMarketRate = async () => {
    if (!blackMarketRate || isNaN(blackMarketRate)) { Alert.alert('Error', 'Please enter a valid rate'); return; }
    setSaving(true);
    try {
      await api.post('/currency/black-market', { usd_to_etb: parseFloat(blackMarketRate) });
      Alert.alert('Saved', 'Black market rate updated!');
      setBlackMarketRate(''); loadRates();
    } catch (e) { Alert.alert('Error', 'Could not save rate'); }
    finally { setSaving(false); }
  };

  const convertCurrency = async () => {
    if (!amount || isNaN(amount)) { Alert.alert('Error', 'Please enter a valid amount'); return; }
    if (rateType === 'black_market' && !rates?.black_market_rate) { Alert.alert('Error', 'Set a black market rate first'); return; }
    setConverting(true);
    try {
      const res = await api.get('/currency/convert', { params: { amount: parseFloat(amount), from_currency: fromCurrency, rate_type: rateType } });
      setConvertResult(res.data);
    } catch (e) { Alert.alert('Error', e.response?.data?.detail || 'Conversion failed'); }
    finally { setConverting(false); }
  };

  if (loading) return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.background }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRates(); }} tintColor={colors.primary} />}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Currency</Text>
        <Text style={[s.sub, { color: colors.textSecondary }]}>USD ↔ ETB exchange rates</Text>
      </View>

      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Current Rates</Text>
        <View style={[s.rateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.rateRow}>
            <View>
              <Text style={[s.rateLabel, { color: colors.text }]}>🏦 Bank Rate</Text>
              <Text style={[s.rateNote, { color: colors.textSecondary }]}>Auto-updated daily</Text>
            </View>
            <Text style={[s.rateValue, { color: colors.primary }]}>{rates?.bank_rate ? `${rates.bank_rate.toFixed(2)} ETB` : '— ETB'}</Text>
          </View>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <View style={s.rateRow}>
            <View>
              <Text style={[s.rateLabel, { color: colors.text }]}>🌍 Black Market</Text>
              <Text style={[s.rateNote, { color: colors.textSecondary }]}>{rates?.black_market_updated ? `Updated: ${rates.black_market_updated.slice(0, 10)}` : 'Not set yet'}</Text>
            </View>
            <Text style={[s.rateValue, { color: rates?.black_market_rate ? '#EF9F27' : colors.textSecondary }]}>
              {rates?.black_market_rate ? `${rates.black_market_rate.toFixed(2)} ETB` : '— ETB'}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Set Black Market Rate</Text>
        <Text style={[s.hint, { color: colors.textSecondary }]}>Enter today's real market rate for 1 USD in ETB</Text>
        <View style={s.inputRow}>
          <Text style={[s.inputLabel, { color: colors.textSecondary }]}>1 USD =</Text>
          <TextInput style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} placeholder="e.g. 145.50" placeholderTextColor={colors.textSecondary} value={blackMarketRate} onChangeText={setBlackMarketRate} keyboardType="decimal-pad" />
          <Text style={[s.inputLabel, { color: colors.textSecondary }]}>ETB</Text>
        </View>
        <TouchableOpacity style={[s.saveBtn, { backgroundColor: '#1D9E75' }]} onPress={saveBlackMarketRate} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save Rate</Text>}
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>Currency Converter</Text>
        <View style={[s.converterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Amount</Text>
          <TextInput style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholder="Enter amount" placeholderTextColor={colors.textSecondary} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

          <Text style={[s.label, { color: colors.textSecondary }]}>From</Text>
          <View style={s.toggleRow}>
            {['USD', 'ETB'].map(c => (
              <TouchableOpacity key={c} style={[s.toggleBtn, { backgroundColor: colors.background, borderColor: colors.border }, fromCurrency === c && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFromCurrency(c)}>
                <Text style={[s.toggleText, { color: colors.textSecondary }, fromCurrency === c && { color: '#fff' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.label, { color: colors.textSecondary }]}>Use Rate</Text>
          <View style={s.toggleRow}>
            {[{ value: 'bank', label: '🏦 Bank' }, { value: 'black_market', label: '🌍 Market' }].map(r => (
              <TouchableOpacity key={r.value} style={[s.toggleBtn, { backgroundColor: colors.background, borderColor: colors.border }, rateType === r.value && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setRateType(r.value)}>
                <Text style={[s.toggleText, { color: colors.textSecondary }, rateType === r.value && { color: '#fff' }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[s.convertBtn, { backgroundColor: colors.primary }]} onPress={convertCurrency} disabled={converting}>
            {converting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.convertBtnText}>Convert ⇄</Text>}
          </TouchableOpacity>

          {convertResult && (
            <View style={[s.resultCard, { backgroundColor: colors.background, borderColor: colors.primary + '33' }]}>
              <Text style={[s.resultFrom, { color: colors.textSecondary }]}>{convertResult.from?.toLocaleString()} {convertResult.from_currency}</Text>
              <Text style={[s.resultArrow, { color: colors.primary }]}>⇓</Text>
              <Text style={[s.resultTo, { color: colors.primary }]}>{convertResult.to?.toLocaleString()} {convertResult.to_currency}</Text>
              <Text style={[s.resultRate, { color: colors.textSecondary }]}>Rate: {convertResult.rate?.toFixed(2)} ({convertResult.rate_type})</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700' },
  sub: { fontSize: 14, marginTop: 4 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 13, marginBottom: 12 },
  rateCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rateLabel: { fontSize: 15, fontWeight: '500' },
  rateNote: { fontSize: 12, marginTop: 2 },
  rateValue: { fontSize: 18, fontWeight: '700' },
  divider: { height: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  inputLabel: { fontSize: 15, fontWeight: '500' },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  saveBtn: { borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  converterCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  label: { fontSize: 13, marginBottom: 6, marginTop: 12 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  toggleText: { fontSize: 14, fontWeight: '500' },
  convertBtn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  convertBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resultCard: { marginTop: 16, borderRadius: 10, padding: 16, alignItems: 'center', borderWidth: 1 },
  resultFrom: { fontSize: 20, fontWeight: '600' },
  resultArrow: { fontSize: 20, marginVertical: 4 },
  resultTo: { fontSize: 28, fontWeight: '800' },
  resultRate: { fontSize: 12, marginTop: 8 },
});