import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [s, r] = await Promise.all([api.get('/transactions/summary'), api.get('/currency/rates')]);
      setSummary(s.data);
      setRates(r.data);
    } catch (e) { console.log('Dashboard error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#378ADD" /></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#378ADD" />}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
        <Text style={styles.subGreeting}>Here's your financial overview</Text>
      </View>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceAmount}>{user?.default_currency} {summary?.balance?.toLocaleString() || '0'}</Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>↑ Income</Text>
            <Text style={[styles.balanceItemAmount, { color: '#1D9E75' }]}>{summary?.total_income?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>↓ Expenses</Text>
            <Text style={[styles.balanceItemAmount, { color: '#F0997B' }]}>{summary?.total_expense?.toLocaleString() || '0'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cost Breakdown</Text>
        <View style={styles.breakdownRow}>
          <View style={[styles.breakdownCard, { borderColor: '#378ADD' }]}>
            <Text style={styles.breakdownLabel}>Fixed</Text>
            <Text style={[styles.breakdownAmount, { color: '#378ADD' }]}>{summary?.fixed_costs?.toLocaleString() || '0'}</Text>
          </View>
          <View style={[styles.breakdownCard, { borderColor: '#EF9F27' }]}>
            <Text style={styles.breakdownLabel}>Accidental</Text>
            <Text style={[styles.breakdownAmount, { color: '#EF9F27' }]}>{summary?.accidental_costs?.toLocaleString() || '0'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exchange Rates</Text>
        <View style={styles.ratesCard}>
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>🏦 Bank Rate</Text>
            <Text style={styles.rateValue}>1 USD = {rates?.bank_rate?.toFixed(2) || '—'} ETB</Text>
          </View>
          <View style={styles.rateDivider} />
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>🌍 Black Market</Text>
            <Text style={styles.rateValue}>1 USD = {rates?.black_market_rate?.toFixed(2) || 'Not set'} ETB</Text>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddTransaction')}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionLabel}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Reports')}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Advisor')}>
            <Text style={styles.actionIcon}>🧠</Text>
            <Text style={styles.actionLabel}>Advisor</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1117' },
  header: { padding: 24, paddingTop: 56 },
  greeting: { fontSize: 24, fontWeight: '700', color: '#E6EDF3' },
  subGreeting: { fontSize: 14, color: '#8B949E', marginTop: 4 },
  balanceCard: { margin: 16, padding: 24, backgroundColor: '#161B22', borderRadius: 16, borderWidth: 1, borderColor: '#21262D' },
  balanceLabel: { fontSize: 13, color: '#8B949E', marginBottom: 8 },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#E6EDF3', marginBottom: 20 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceItemLabel: { fontSize: 12, color: '#8B949E', marginBottom: 4 },
  balanceItemAmount: { fontSize: 18, fontWeight: '600' },
  balanceDivider: { width: 1, height: 40, backgroundColor: '#21262D' },
  section: { padding: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#E6EDF3', marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', gap: 12 },
  breakdownCard: { flex: 1, padding: 16, backgroundColor: '#161B22', borderRadius: 12, borderWidth: 1 },
  breakdownLabel: { fontSize: 12, color: '#8B949E', marginBottom: 6 },
  breakdownAmount: { fontSize: 20, fontWeight: '700' },
  ratesCard: { backgroundColor: '#161B22', borderRadius: 12, borderWidth: 1, borderColor: '#21262D', padding: 16 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rateLabel: { fontSize: 14, color: '#8B949E' },
  rateValue: { fontSize: 14, color: '#E6EDF3', fontWeight: '600' },
  rateDivider: { height: 1, backgroundColor: '#21262D' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: '#161B22', borderRadius: 12, borderWidth: 1, borderColor: '#21262D', padding: 16, alignItems: 'center' },
  actionIcon: { fontSize: 24, marginBottom: 6 },
  actionLabel: { fontSize: 12, color: '#8B949E' },
});