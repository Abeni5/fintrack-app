import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TouchableWithoutFeedback
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
  const [balanceCurrency, setBalanceCurrency] = useState('ETB');

  useEffect(() => {
    if (user?.default_currency) setBalanceCurrency(user.default_currency);
    loadData();
    // Check advisor warnings once per session when dashboard opens
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

  const getBalanceView = () => {
    if (!summary) return { etb: 0, usd: 0, hasRate: false };
    const rate = getRate();
    const etbBalance = summary.balance_etb ?? summary.balance ?? 0;
    const usdBalance = summary.balance_usd ?? (rate ? etbBalance / rate : null);
    return { etb: etbBalance, usd: usdBalance, hasRate: !!rate };
  };

  const getIncomeExpenseView = () => {
    if (!summary) return {};
    const rate = getRate();
    const etbIncome  = summary.total_income_etb  ?? summary.total_income  ?? 0;
    const etbExpense = summary.total_expense_etb ?? summary.total_expense ?? 0;
    const usdIncome  = summary.total_income_usd  ?? (rate ? etbIncome  / rate : null);
    const usdExpense = summary.total_expense_usd ?? (rate ? etbExpense / rate : null);
    return { etbIncome, etbExpense, usdIncome, usdExpense };
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

  const balView  = getBalanceView();
  const ieView   = getIncomeExpenseView();
  const rate     = getRate();
  const secondaryCurrency = balanceCurrency === 'ETB' ? 'USD' : 'ETB';
  const primaryBalance    = balanceCurrency === 'ETB' ? balView.etb : balView.usd;
  const secondaryBalance  = balanceCurrency === 'ETB' ? balView.usd : balView.etb;
  const primaryIncome     = balanceCurrency === 'ETB' ? ieView.etbIncome  : ieView.usdIncome;
  const primaryExpense    = balanceCurrency === 'ETB' ? ieView.etbExpense : ieView.usdExpense;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
        <Text style={[styles.subGreeting, { color: colors.textSecondary }]}>Here's your financial overview</Text>
      </View>

      {/* Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Current Balance</Text>
        <TouchableWithoutFeedback onPress={() => setBalanceCurrency(c => c === 'ETB' ? 'USD' : 'ETB')}>
          <View>
            <Text style={[styles.balanceAmount, { color: colors.text }]}>
              {balanceCurrency} {fmt(primaryBalance, balanceCurrency)}
            </Text>
            {balView.hasRate && secondaryBalance !== null ? (
              <Text style={[styles.balanceSecondary, { color: colors.textSecondary }]}>
                ≈ {secondaryCurrency} {fmt(secondaryBalance, secondaryCurrency)}
              </Text>
            ) : !rate ? (
              <Text style={[styles.balanceSecondaryHint, { color: colors.textSecondary }]}>
                Set an exchange rate to see {secondaryCurrency} value
              </Text>
            ) : null}
            <View style={[styles.switchBadge, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
              <Text style={[styles.switchBadgeText, { color: colors.primary }]}>
                Tap to switch to {secondaryCurrency} →
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.currencyPills}>
          {['ETB', 'USD'].map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.background },
                balanceCurrency === c && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setBalanceCurrency(c)}
            >
              <Text style={[styles.pillText, { color: colors.textSecondary }, balanceCurrency === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.dividerH, { backgroundColor: colors.border }]} />

        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceItemLabel, { color: colors.textSecondary }]}>↑ Income</Text>
            <Text style={[styles.balanceItemAmount, { color: '#1D9E75' }]}>
              {balanceCurrency} {fmt(primaryIncome, balanceCurrency)}
            </Text>
            {balView.hasRate && (
              <Text style={[styles.balanceItemSub, { color: colors.textSecondary }]}>
                ≈ {secondaryCurrency} {fmt(balanceCurrency === 'ETB' ? ieView.usdIncome : ieView.etbIncome, secondaryCurrency)}
              </Text>
            )}
          </View>
          <View style={[styles.balanceDivider, { backgroundColor: colors.border }]} />
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceItemLabel, { color: colors.textSecondary }]}>↓ Expenses</Text>
            <Text style={[styles.balanceItemAmount, { color: '#F0997B' }]}>
              {balanceCurrency} {fmt(primaryExpense, balanceCurrency)}
            </Text>
            {balView.hasRate && (
              <Text style={[styles.balanceItemSub, { color: colors.textSecondary }]}>
                ≈ {secondaryCurrency} {fmt(balanceCurrency === 'ETB' ? ieView.usdExpense : ieView.etbExpense, secondaryCurrency)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Both currencies side by side */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Balance by Currency</Text>
        <View style={styles.breakdownRow}>
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: '#378ADD' }]}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>🇪🇹 ETB Balance</Text>
            <Text style={[styles.breakdownAmount, { color: '#378ADD' }]}>{fmt(balView.etb, 'ETB')}</Text>
            <Text style={[styles.breakdownSub, { color: colors.textSecondary }]}>Ethiopian Birr</Text>
          </View>
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: '#1D9E75' }]}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>🇺🇸 USD Balance</Text>
            <Text style={[styles.breakdownAmount, { color: '#1D9E75' }]}>{rate ? fmt(balView.usd, 'USD') : '—'}</Text>
            <Text style={[styles.breakdownSub, { color: colors.textSecondary }]}>{rate ? 'US Dollar' : 'Set rate to convert'}</Text>
          </View>
        </View>
      </View>

      {/* Cost Breakdown */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cost Breakdown</Text>
        <View style={styles.breakdownRow}>
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: '#378ADD' }]}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Fixed</Text>
            <Text style={[styles.breakdownAmount, { color: '#378ADD' }]}>{summary?.fixed_costs?.toLocaleString() || '0'}</Text>
          </View>
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: '#EF9F27' }]}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Accidental</Text>
            <Text style={[styles.breakdownAmount, { color: '#EF9F27' }]}>{summary?.accidental_costs?.toLocaleString() || '0'}</Text>
          </View>
        </View>
      </View>

      {/* Exchange Rates */}
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
              <Text style={[styles.rateHint, { color: colors.primary }]}>→ Set a rate to enable dual-currency balance</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Actions */}
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
  balanceLabel: { fontSize: 13, marginBottom: 8 },
  balanceAmount: { fontSize: 36, fontWeight: '800' },
  balanceSecondary: { fontSize: 15, marginTop: 4, fontWeight: '500' },
  balanceSecondaryHint: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  switchBadge: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  switchBadgeText: { fontSize: 11, fontWeight: '600' },
  currencyPills: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 16 },
  pill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '600' },
  dividerH: { height: 1, marginBottom: 16 },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-start' },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceItemLabel: { fontSize: 12, marginBottom: 4 },
  balanceItemAmount: { fontSize: 16, fontWeight: '600' },
  balanceItemSub: { fontSize: 11, marginTop: 2 },
  balanceDivider: { width: 1, height: 50, marginTop: 4 },
  section: { padding: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', gap: 12 },
  breakdownCard: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1 },
  breakdownLabel: { fontSize: 12, marginBottom: 6 },
  breakdownAmount: { fontSize: 20, fontWeight: '700' },
  breakdownSub: { fontSize: 11, marginTop: 4 },
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