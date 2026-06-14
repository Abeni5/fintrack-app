import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import api from '../api/client';
import { notifyBudgetWarning, notifyGoalMilestone } from '../notifications/notificationService';

export default function BudgetScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState('status');
  const [status, setStatus] = useState(null);
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, g] = await Promise.all([
        api.get('/budget/status'),
        api.get('/budget/goals/progress'),
      ]);
      setStatus(s.data);
      setGoals(g.data);

      // ── Notification: check budgets on load ──────────────────────────
      const budgets = s.data?.budgets || [];
      for (const b of budgets) {
        await notifyBudgetWarning({
          category: b.category,
          percentUsed: b.percent_used,
          spent: b.spent_this_month,
          limit: b.monthly_limit,
          currency: b.currency,
        });
      }

      // ── Notification: check goal milestones on load ──────────────────
      const goalList = g.data?.goals || [];
      for (const goal of goalList) {
        await notifyGoalMilestone({
          title: goal.title,
          percentComplete: goal.percent_complete,
          targetAmount: goal.target_amount,
        });
      }
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const saveBudget = async () => {
    if (!category || !limit) { Alert.alert('Error', 'Fill in category and limit'); return; }
    setSaving(true);
    try {
      await api.post('/budget/set', { category, monthly_limit: parseFloat(limit), currency: 'ETB' });
      Alert.alert('Saved', 'Budget set for ' + category);
      setCategory(''); setLimit('');
      loadData();
    } catch (e) { Alert.alert('Error', 'Could not save budget'); }
    finally { setSaving(false); }
  };

  const saveGoal = async () => {
    if (!goalTitle || !goalAmount) { Alert.alert('Error', 'Fill in title and amount'); return; }
    setSaving(true);
    try {
      await api.post('/budget/goals/set', {
        title: goalTitle,
        target_amount: parseFloat(goalAmount),
        currency: 'ETB',
        deadline: goalDeadline || null,
      });
      Alert.alert('Created', 'Goal created!');
      setGoalTitle(''); setGoalAmount(''); setGoalDeadline('');
      loadData();
    } catch (e) { Alert.alert('Error', 'Could not create goal'); }
    finally { setSaving(false); }
  };

  const SC = { ok: '#1D9E75', warning: '#EF9F27', over: '#F0997B' };

  const renderStatus = () => (
    <View>
      {(!status?.budgets || status.budgets.length === 0) && (
        <View style={s.empty}>
          <Text style={[s.emptyText, { color: colors.text }]}>No budgets yet</Text>
          <Text style={[s.emptySub, { color: colors.textSecondary }]}>Tap Set Budget tab</Text>
        </View>
      )}
      {status?.budgets?.map((b, i) => (
        <View key={i} style={[s.budgetCard, { backgroundColor: colors.card, borderColor: SC[b.status] + '44' }]}>
          <View style={s.row}>
            <Text style={[s.budgetCat, { color: colors.text }]}>{b.category}</Text>
            <Text style={[s.statusText, { color: SC[b.status] }]}>
              {b.status === 'ok' ? 'On track' : b.status === 'warning' ? 'Warning' : 'Over budget'}
            </Text>
          </View>
          <View style={[s.progressBg, { backgroundColor: colors.border }]}>
            <View style={[s.progressFill, { width: Math.min(b.percent_used, 100) + '%', backgroundColor: SC[b.status] }]} />
          </View>
          <View style={s.row}>
            <Text style={[s.small, { color: colors.textSecondary }]}>{b.spent_this_month?.toLocaleString()} spent</Text>
            <Text style={[s.small, { color: colors.textSecondary }]}>of {b.monthly_limit?.toLocaleString()} {b.currency}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderSetBudget = () => (
    <View style={[s.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[s.formTitle, { color: colors.text }]}>Set Monthly Budget</Text>
      <Text style={[s.label, { color: colors.textSecondary }]}>Category</Text>
      <TextInput style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholder="e.g. Food" placeholderTextColor={colors.textSecondary} value={category} onChangeText={setCategory} />
      <Text style={[s.label, { color: colors.textSecondary }]}>Monthly Limit (ETB)</Text>
      <TextInput style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholder="e.g. 5000" placeholderTextColor={colors.textSecondary} value={limit} onChangeText={setLimit} keyboardType="decimal-pad" />
      <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={saveBudget} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Set Budget</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderGoals = () => (
    <View>
      <View style={[s.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.formTitle, { color: colors.text }]}>New Savings Goal</Text>
        <Text style={[s.label, { color: colors.textSecondary }]}>Title</Text>
        <TextInput style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholder="e.g. Emergency fund" placeholderTextColor={colors.textSecondary} value={goalTitle} onChangeText={setGoalTitle} />
        <Text style={[s.label, { color: colors.textSecondary }]}>Target Amount (ETB)</Text>
        <TextInput style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholder="e.g. 50000" placeholderTextColor={colors.textSecondary} value={goalAmount} onChangeText={setGoalAmount} keyboardType="decimal-pad" />
        <Text style={[s.label, { color: colors.textSecondary }]}>Deadline (optional YYYY-MM-DD)</Text>
        <TextInput style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} placeholder="2026-12-31" placeholderTextColor={colors.textSecondary} value={goalDeadline} onChangeText={setGoalDeadline} />
        <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={saveGoal} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Create Goal</Text>}
        </TouchableOpacity>
      </View>
      {goals?.goals?.map((g, i) => (
        <View key={i} style={[s.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.row}>
            <Text style={[s.budgetCat, { color: colors.text }]}>{g.title}</Text>
            <Text style={[s.statusText, { color: g.status === 'completed' ? '#1D9E75' : colors.primary }]}>
              {g.status === 'completed' ? 'Done!' : g.percent_complete + '%'}
            </Text>
          </View>
          <View style={[s.progressBg, { backgroundColor: colors.border }]}>
            <View style={[s.progressFill, { width: Math.min(g.percent_complete, 100) + '%', backgroundColor: g.status === 'completed' ? '#1D9E75' : colors.primary }]} />
          </View>
          <View style={s.row}>
            <Text style={[s.small, { color: colors.textSecondary }]}>{g.current_amount?.toLocaleString()} saved</Text>
            <Text style={[s.small, { color: colors.textSecondary }]}>of {g.target_amount?.toLocaleString()}</Text>
          </View>
          {g.deadline && <Text style={[s.small, { color: colors.textSecondary }]}>Deadline: {g.deadline}</Text>}
        </View>
      ))}
      {(!goals?.goals || goals.goals.length === 0) && (
        <View style={s.empty}><Text style={[s.emptyText, { color: colors.text }]}>No goals yet</Text></View>
      )}
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}><Text style={[s.title, { color: colors.text }]}>Budget and Goals</Text></View>
      <View style={s.tabs}>
        {[{ k: 'status', l: 'Status' }, { k: 'set', l: 'Set Budget' }, { k: 'goals', l: 'Goals' }].map(t => (
          <TouchableOpacity
            key={t.k}
            style={[s.tabBtn, { backgroundColor: colors.card, borderColor: colors.border },
              tab === t.k && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setTab(t.k)}
          >
            <Text style={[s.tabText, { color: colors.textSecondary }, tab === t.k && { color: '#fff' }]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
      >
        {loading
          ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
          : tab === 'status' ? renderStatus()
          : tab === 'set' ? renderSetBudget()
          : renderGoals()
        }
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  tabBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  tabText: { fontSize: 12, fontWeight: '600' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  budgetCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  goalCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  budgetCat: { fontSize: 16, fontWeight: '600' },
  statusText: { fontSize: 13, fontWeight: '600' },
  progressBg: { height: 6, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  small: { fontSize: 12 },
  formCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  formTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  label: { fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  saveBtn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySub: { fontSize: 14 },
});