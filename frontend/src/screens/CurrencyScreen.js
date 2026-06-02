import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, RefreshControl } from 'react-native';
import api from '../api/client';

export default function CurrencyScreen() {
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
    if (!blackMarketRate || isNaN(blackMarketRate)) {
      Alert.alert('Error', 'Please enter a valid rate');
      return;
    }
    setSaving(true);
    try {
      await api.post('/currency/black-market', { usd_to_etb: parseFloat(blackMarketRate) });
      Alert.alert('Saved', 'Black market rate updated!');
      setBlackMarketRate('');
      loadRates();
    } catch (e) {
      Alert.alert('Error', 'Could not save rate');
    } finally { setSaving(false); }
  };

  const convertCurrency = async () => {
    if (!amount || isNaN(amount)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (rateType === 'black_market' && !rates?.black_market_rate) {
      Alert.alert('Error', 'Set a black market rate first');
      return;
    }
    setConverting(true);
    try {
      const res = await api.get('/currency/convert', {
        params: { amount: parseFloat(amount), from_currency: fromCurrency, rate_type: rateType }
      });
      setConvertResult(res.data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Conversion failed');
    } finally { setConverting(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#378ADD" /></View>;

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRates(); }} tintColor="#378ADD" />}
    >
      <View style={s.header}>
        <Text style={s.title}>Currency</Text>
        <Text style={s.sub}>USD ↔ ETB exchange rates</Text>
      </View>

      {/* Current Rates */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Current Rates</Text>
        <View style={s.rateCard}>
          <View style={s.rateRow}>
            <View>
              <Text style={s.rateLabel}>🏦 Bank Rate</Text>
              <Text style={s.rateNote}>Auto-updated daily</Text>
            </View>
            <Text style={s.rateValue}>
              {rates?.bank_rate ? `${rates.bank_rate.toFixed(2)} ETB` : '— ETB'}
            </Text>
          </View>
          <View style={s.divider} />
          <View style={s.rateRow}>
            <View>
              <Text style={s.rateLabel}>🌍 Black Market</Text>
              <Text style={s.rateNote}>
                {rates?.black_market_updated
                  ? `Updated: ${rates.black_market_updated.slice(0, 10)}`
                  : 'Not set yet'}
              </Text>
            </View>
            <Text style={[s.rateValue, { color: rates?.black_market_rate ? '#EF9F27' : '#8B949E' }]}>
              {rates?.black_market_rate ? `${rates.black_market_rate.toFixed(2)} ETB` : '— ETB'}
            </Text>
          </View>
        </View>
      </View>

      {/* Set Black Market Rate */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Set Black Market Rate</Text>
        <Text style={s.hint}>Enter today's real market rate for 1 USD in ETB</Text>
        <View style={s.inputRow}>
          <Text style={s.inputLabel}>1 USD =</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. 145.50"
            placeholderTextColor="#888"
            value={blackMarketRate}
            onChangeText={setBlackMarketRate}
            keyboardType="decimal-pad"
          />
          <Text style={s.inputLabel}>ETB</Text>
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={saveBlackMarketRate} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save Rate</Text>}
        </TouchableOpacity>
      </View>

      {/* Converter */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Currency Converter</Text>
        <View style={s.converterCard}>
          <Text style={s.label}>Amount</Text>
          <TextInput
            style={s.input}
            placeholder="Enter amount"
            placeholderTextColor="#888"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          <Text style={s.label}>From</Text>
          <View style={s.toggleRow}>
            {['USD', 'ETB'].map(c => (
              <TouchableOpacity
                key={c}
                style={[s.toggleBtn, fromCurrency === c && s.toggleActive]}
                onPress={() => setFromCurrency(c)}
              >
                <Text style={[s.toggleText, fromCurrency === c && { color: '#fff' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Use Rate</Text>
          <View style={s.toggleRow}>
            {[
              { value: 'bank', label: '🏦 Bank' },
              { value: 'black_market', label: '🌍 Market' }
            ].map(r => (
              <TouchableOpacity
                key={r.value}
                style={[s.toggleBtn, rateType === r.value && s.toggleActive]}
                onPress={() => setRateType(r.value)}
              >
                <Text style={[s.toggleText, rateType === r.value && { color: '#fff' }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.convertBtn} onPress={convertCurrency} disabled={converting}>
            {converting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.convertBtnText}>Convert ⇄</Text>}
          </TouchableOpacity>

          {convertResult && (
            <View style={s.resultCard}>
              <Text style={s.resultFrom}>{convertResult.from?.toLocaleString()} {convertResult.from_currency}</Text>
              <Text style={s.resultArrow}>⇓</Text>
              <Text style={s.resultTo}>{convertResult.to?.toLocaleString()} {convertResult.to_currency}</Text>
              <Text style={s.resultRate}>Rate: {convertResult.rate?.toFixed(2)} ({convertResult.rate_type})</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1117' },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: '#E6EDF3' },
  sub: { fontSize: 14, color: '#8B949E', marginTop: 4 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#E6EDF3', marginBottom: 8 },
  hint: { fontSize: 13, color: '#8B949E', marginBottom: 12 },
  rateCard: { backgroundColor: '#161B22', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#21262D' },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rateLabel: { fontSize: 15, color: '#E6EDF3', fontWeight: '500' },
  rateNote: { fontSize: 12, color: '#8B949E', marginTop: 2 },
  rateValue: { fontSize: 18, fontWeight: '700', color: '#378ADD' },
  divider: { height: 1, backgroundColor: '#21262D' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  inputLabel: { fontSize: 15, color: '#8B949E', fontWeight: '500' },
  input: { flex: 1, backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D', borderRadius: 10, padding: 12, fontSize: 15, color: '#E6EDF3' },
  saveBtn: { backgroundColor: '#1D9E75', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  converterCard: { backgroundColor: '#161B22', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#21262D' },
  label: { fontSize: 13, color: '#8B949E', marginBottom: 6, marginTop: 12 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#0D1117', borderWidth: 1, borderColor: '#21262D' },
  toggleActive: { backgroundColor: '#378ADD', borderColor: '#378ADD' },
  toggleText: { fontSize: 14, color: '#8B949E', fontWeight: '500' },
  convertBtn: { backgroundColor: '#378ADD', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  convertBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resultCard: { marginTop: 16, backgroundColor: '#0D1117', borderRadius: 10, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#378ADD33' },
  resultFrom: { fontSize: 20, color: '#8B949E', fontWeight: '600' },
  resultArrow: { fontSize: 20, color: '#378ADD', marginVertical: 4 },
  resultTo: { fontSize: 28, color: '#378ADD', fontWeight: '800' },
  resultRate: { fontSize: 12, color: '#8B949E', marginTop: 8 },
});