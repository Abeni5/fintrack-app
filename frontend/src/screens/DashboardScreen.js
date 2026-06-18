import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import api from '../api/client';
import { checkAdvisorNotifications } from '../notifications/scheduledNotifications';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [summary, setSummary] = useState(null);
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Which currency the "Current Balance" headline number is shown in
  const [displayCurrency, setDisplayCurrency] = useState('ETB');

  useEffect(() => {
    if (user?.default_currency) setDisplayCurrency(user.default_currency);
    loadData();
    checkAdvisorNotifications();
  }, []);

  const loadData = async () => {
    try {
      const [s, r] = await Promise.all([
        api.get('/transactions/summary'),
        api.get('/currency/rates'),
      ]);
      setSummary(s.data);
      setRates(r.data);
    } catch (e) { console.log('Dashboard error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const getRate = () => rates?.black_market_rate || rates?.bank_rate || null;

  // ── Raw, separate balances per currency — NO conversion, exactly what's in each ──
  const getRawBalances = () => {
    if (!summary) return { etb: 0, usd: 0 };
    return {
      etb: summary.balance_etb ?? 0,
      usd: summary.balance_usd ?? 0,
    };
  };

  // ── TRUE total wealth — converts USD into ETB (or vice versa) and adds them ──
  // This is what "Current Balance" should show: one real combined number.
  const getTotalBalance = (inCurrency) => {
    const raw = getRawBalances();
    const rate = getRate(); // 1 USD = rate ETB
    if (!rate) {
      // No rate set — can't combine safely, fall back to just the requested currency's raw balance
      return inCurrency === 'ETB' ? raw.etb : raw.usd;
    }
    if (inCurrency === 'ETB') {
      return raw.etb + (raw.usd * rate);
    } else {
      return (raw.etb / rate) + raw.usd;
    }
  };

  const fmt = (num, currency) => {
    if (num === null || num === undefined) return '—';
    return Number(num).toLocaleString(undefined, {
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
    });
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  const rate = getRate();
  const raw = getRawBalances();
  const totalBalance = getTotalBalance(displayCurrency);
  const otherCurrency = displayCurrency === 'ETB' ? 'USD' : 'ETB';
  const totalInOtherCurrency = getTotalBalance(otherCurrency);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
        <Text style={[styles.subGreeting, { color: colors.textSecondary }]}>Here's your financial overview</Text>
      </View>

      {/* ── CURRENT BALANCE — true combined total, converted into one currency ── */}
      <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Current Balance</Text>
        <Text style={[styles.balanceSub, { color: colors.textSecondary }]}>
          Total across ETB + USD, converted
        </Text>

        <TouchableOpacity onPress={() => setDisplayCurrency(c => c === 'ETB' ? 'USD' : 'ETB')}>
          <Text style={[styles.balanceAmount, { color: colors.text }]}>
            {displayCurrency} {fmt(totalBalance, displayCurrency)}
          </Text>
          {rate ? (
            <Text style={[styles.balanceSecondary, { color: colors.textSecondary }]}>
              ≈ {otherCurrency} {fmt(totalInOtherCurrency, otherCurrency)}
            </Text>
          ) : (
            <Text style={[styles.balanceSecondaryHint, { color: colors.textSecondary }]}>
              Set an exchange rate for accurate combined total
            </Text>
          )}
          <View style={[styles.switchBadge, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
            <Text style={[styles.switchBadgeText, { color: colors.primary }]}>
              Tap to view in {otherCurrency} →
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── BALANCE BY CURRENCY — raw, separate, no conversion ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Balance by Currency</Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          Exactly what you have in each currency — not converted
        </Text>
        <View style={styles.breakdownRow}>
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: '#378ADD' }]}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>🇪🇹 ETB Balance</Text>
            <Text style={[styles.breakdownAmount, { color: '#378ADD' }]}>{fmt(raw.etb, 'ETB')}</Text>
          </View>
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: '#1D9E75' }]}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>🇺🇸 USD Balance</Text>
            <Text style={[styles.breakdownAmount, { color: '#1D9E75' }]}>{fmt(raw.usd, 'USD')}</Text>
          </View>
        </View>
      </View>

      {/* ── Cost Breakdown ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cost Breakdown ({displayCurrency})</Text>
        <View style={styles.breakdownRow}>
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: '#378ADD' }]}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Fixed</Text>
            <Text style={[styles.breakdownAmount, { color: '#378ADD' }]}>
              {fmt(displayCurrency === 'ETB' ? summary?.fixed_costs_etb : summary?.fixed_costs_usd, displayCurrency)}
            </Text>
          </View>
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: '#EF9F27' }]}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Accidental</Text>
            <Text style={[styles.breakdownAmount, { color: '#EF9F27' }]}>
              {fmt(displayCurrency === 'ETB' ? summary?.accidental_costs_etb : summary?.accidental_costs_usd, displayCurrency)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Exchange Rates ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Exchange Rates</Text>
        <View style={[styles.ratesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rateRow}>
            <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>🏦 Bank Rate</Text>
            <Text style={[styles.rateValue, { color: colors.text }]}>1 USD = {rates?.bank_rate?.toFixed(2) || '—'} ETB</Text>
          </View>
          <View style={[styles.rateDivider, { backgroundColor: colors.border }]} />
          <View style={styles.rateRow}>
            <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>🌍 Black Market</Text>
            <Text style={[styles.rateValue, { color: colors.text }]}>1 USD = {rates?.black_market_rate?.toFixed(2) || 'Not set'} ETB</Text>
          </View>
          {!rate && (
            <TouchableOpacity onPress={() => navigation.navigate('Currency')}>
              <Text style={[styles.rateHint, { color: colors.primary }]}>→ Set a rate to combine ETB + USD into one total</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Quick Actions ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('AddTransaction')}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('Reports')}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('Advisor')}>
            <Text style={styles.actionIcon}>🧠</Text>
            <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Advisor</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 56 },
  greeting: { fontSize: 24, fontWeight: '700' },
  subGreeting: { fontSize: 14, marginTop: 4 },
  balanceCard: { margin: 16, padding: 24, borderRadius: 16, borderWidth: 1 },
  balanceLabel: { fontSize: 13, marginBottom: 2 },
  balanceSub: { fontSize: 11, marginBottom: 10 },
  balanceAmount: { fontSize: 36, fontWeight: '800' },
  balanceSecondary: { fontSize: 15, marginTop: 4, fontWeight: '500' },
  balanceSecondaryHint: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  switchBadge: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  switchBadgeText: { fontSize: 11, fontWeight: '600' },
  section: { padding: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  sectionHint: { fontSize: 11, marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', gap: 12 },
  breakdownCard: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1 },
  breakdownLabel: { fontSize: 12, marginBottom: 6 },
  breakdownAmount: { fontSize: 20, fontWeight: '700' },
  ratesCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rateLabel: { fontSize: 14 },
  rateValue: { fontSize: 14, fontWeight: '600' },
  rateDivider: { height: 1 },
  rateHint: { fontSize: 12, marginTop: 12, fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center' },
  actionIcon: { fontSize: 24, marginBottom: 6 },
  actionLabel: { fontSize: 12 },
});