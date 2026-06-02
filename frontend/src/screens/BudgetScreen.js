import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import api from '../api/client';

export default function BudgetScreen() {
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
      const [s, g] = await Promise.all([api.get('/budget/status'), api.get('/budget/goals/progress')]);
      setStatus(s.data);
      setGoals(g.data);
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
      await api.post('/budget/goals/set', { title: goalTitle, target_amount: parseFloat(goalAmount), currency: 'ETB', deadline: goalDeadline || null });
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
        <View style={s.empty}><Text style={s.emptyText}>No budgets yet</Text><Text style={s.emptySub}>Tap Set Budget tab</Text></View>
      )}
      {status?.budgets?.map((b, i) => (
        <View key={i} style={[s.budgetCard, { borderColor: SC[b.status] + '44' }]}>
          <View style={s.row}>
            <Text style={s.budgetCat}>{b.category}</Text>
            <Text style={[s.statusText, { color: SC[b.status] }]}>
              {b.status === 'ok' ? 'On track' : b.status === 'warning' ? 'Warning' : 'Over budget'}
            </Text>
          </View>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: Math.min(b.percent_used, 100) + '%', backgroundColor: SC[b.status] }]} />
          </View>
          <View style={s.row}>
            <Text style={s.small}>{b.spent_this_month?.toLocaleString()} spent</Text>
            <Text style={s.small}>of {b.monthly_limit?.toLocaleString()} {b.currency}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderSetBudget = () => (
    <View style={s.formCard}>
      <Text style={s.formTitle}>Set Monthly Budget</Text>
      <Text style={s.label}>Category</Text>
      <TextInput style={s.input} placeholder='e.g. Food' placeholderTextColor='#888' value={category} onChangeText={setCategory} />
      <Text style={s.label}>Monthly Limit (ETB)</Text>
      <TextInput style={s.input} placeholder='e.g. 5000' placeholderTextColor='#888' value={limit} onChangeText={setLimit} keyboardType='decimal-pad' />
      <TouchableOpacity style={s.saveBtn} onPress={saveBudget} disabled={saving}>
        {saving ? <ActivityIndicator color='#fff' size='small' /> : <Text style={s.saveBtnText}>Set Budget</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderGoals = () => (
    <View>
      <View style={s.formCard}>
        <Text style={s.formTitle}>New Savings Goal</Text>
        <Text style={s.label}>Title</Text>
        <TextInput style={s.input} placeholder='e.g. Emergency fund' placeholderTextColor='#888' value={goalTitle} onChangeText={setGoalTitle} />
        <Text style={s.label}>Target Amount (ETB)</Text>
        <TextInput style={s.input} placeholder='e.g. 50000' placeholderTextColor='#888' value={goalAmount} onChangeText={setGoalAmount} keyboardType='decimal-pad' />
        <Text style={s.label}>Deadline (optional YYYY-MM-DD)</Text>
        <TextInput style={s.input} placeholder='2026-12-31' placeholderTextColor='#888' value={goalDeadline} onChangeText={setGoalDeadline} />
        <TouchableOpacity style={s.saveBtn} onPress={saveGoal} disabled={saving}>
          {saving ? <ActivityIndicator color='#fff' size='small' /> : <Text style={s.saveBtnText}>Create Goal</Text>}
        </TouchableOpacity>
      </View>
      {goals?.goals?.map((g, i) => (
        <View key={i} style={s.goalCard}>
          <View style={s.row}>
            <Text style={s.budgetCat}>{g.title}</Text>
            <Text style={[s.statusText, { color: g.status === 'completed' ? '#1D9E75' : '#378ADD' }]}>
              {g.status === 'completed' ? 'Done!' : g.percent_complete + '%'}
            </Text>
          </View>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: Math.min(g.percent_complete, 100) + '%', backgroundColor: g.status === 'completed' ? '#1D9E75' : '#378ADD' }]} />
          </View>
          <View style={s.row}>
            <Text style={s.small}>{g.current_amount?.toLocaleString()} saved</Text>
            <Text style={s.small}>of {g.target_amount?.toLocaleString()}</Text>
          </View>
          {g.deadline && <Text style={s.small}>Deadline: {g.deadline}</Text>}
        </View>
      ))}
      {(!goals?.goals || goals.goals.length === 0) && (
        <View style={s.empty}><Text style={s.emptyText}>No goals yet</Text></View>
      )}
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.title}>Budget and Goals</Text></View>
      <View style={s.tabs}>
        {[{k:'status',l:'Status'},{k:'set',l:'Set Budget'},{k:'goals',l:'Goals'}].map(t => (
          <TouchableOpacity key={t.k} style={[s.tabBtn, tab===t.k && s.tabActive]} onPress={() => setTab(t.k)}>
            <Text style={[s.tabText, tab===t.k && {color:'#fff'}]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor='#378ADD' />}>
        {loading ? <ActivityIndicator size='large' color='#378ADD' style={{marginTop:60}} />
          : tab==='status' ? renderStatus()
          : tab==='set' ? renderSetBudget()
          : renderGoals()}
        <View style={{height:100}} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: '#E6EDF3' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  tabBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D' },
  tabActive: { backgroundColor: '#378ADD', borderColor: '#378ADD' },
  tabText: { fontSize: 12, color: '#8B949E', fontWeight: '600' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  budgetCard: { backgroundColor: '#161B22', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  goalCard: { backgroundColor: '#161B22', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#21262D' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  budgetCat: { fontSize: 16, fontWeight: '600', color: '#E6EDF3' },
  statusText: { fontSize: 13, fontWeight: '600' },
  progressBg: { height: 6, backgroundColor: '#21262D', borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  small: { fontSize: 12, color: '#8B949E' },
  formCard: { backgroundColor: '#161B22', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#21262D' },
  formTitle: { fontSize: 16, fontWeight: '600', color: '#E6EDF3', marginBottom: 12 },
  label: { fontSize: 13, color: '#8B949E', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#0D1117', borderWidth: 1, borderColor: '#21262D', borderRadius: 10, padding: 12, fontSize: 15, color: '#E6EDF3' },
  saveBtn: { backgroundColor: '#378ADD', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, color: '#E6EDF3', fontWeight: '600', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#8B949E' },
});