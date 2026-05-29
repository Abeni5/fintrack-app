import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import api from '../api/client';

export default function ReportsScreen() {
  const [tab, setTab] = useState('daily');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadReport(); }, [tab]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${tab}`);
      setData(res.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const StatCard = ({ label, value, color }) => (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color: color || '#E6EDF3' }]}>{value?.toLocaleString() || '0'}</Text>
    </View>
  );

  const renderDaily = () => (
    <View>
      <Text style={s.dateText}>{data?.date}</Text>
      <View style={s.statsRow}>
        <StatCard label="Income" value={data?.income} color="#1D9E75" />
        <StatCard label="Expense" value={data?.expense} color="#F0997B" />
        <StatCard label="Balance" value={data?.balance} color="#378ADD" />
      </View>
      {data?.categories?.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>By Category</Text>
          {data.categories.map((c, i) => (
            <View key={i} style={s.catRow}>
              <Text style={s.catName}>{c.category}</Text>
              <Text style={s.catAmount}>{c.total?.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderWeekly = () => (
    <View>
      <Text style={s.dateText}>{data?.week_start} → {data?.week_end}</Text>
      <View style={s.statsRow}>
        <StatCard label="Income" value={data?.total_income} color="#1D9E75" />
        <StatCard label="Expense" value={data?.total_expense} color="#F0997B" />
      </View>
      {data?.days?.map((d, i) => (
        <View key={i} style={s.dayRow}>
          <Text style={s.dayName}>{d.day?.slice(0, 3)}</Text>
          <View style={s.dayBars}>
            <View style={[s.bar, { width: Math.min((d.income / (data.total_income || 1)) * 150, 150), backgroundColor: '#1D9E75' }]} />
            <View style={[s.bar, { width: Math.min((d.expense / (data.total_expense || 1)) * 150, 150), backgroundColor: '#F0997B', marginTop: 4 }]} />
          </View>
          <Text style={s.dayAmount}>{(d.income - d.expense).toLocaleString()}</Text>
        </View>
      ))}
    </View>
  );

  const renderMonthly = () => (
    <View>
      <Text style={s.dateText}>{data?.year} / {data?.month}</Text>
      <View style={s.statsRow}>
        <StatCard label="Income" value={data?.income} color="#1D9E75" />
        <StatCard label="Expense" value={data?.expense} color="#F0997B" />
        <StatCard label="Balance" value={data?.balance} color="#378ADD" />
      </View>
      {data?.by_cost_type && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>By Cost Type</Text>
          {Object.entries(data.by_cost_type).map(([k, v], i) => (
            <View key={i} style={s.catRow}>
              <Text style={s.catName}>{k}</Text>
              <Text style={s.catAmount}>{v?.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
      {data?.by_category?.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Top Categories</Text>
          {data.by_category.slice(0, 5).map((c, i) => (
            <View key={i} style={s.catRow}>
              <Text style={s.catName}>{c.category}</Text>
              <Text style={s.catAmount}>{c.total?.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Reports</Text>
      </View>
      <View style={s.tabs}>
        {['daily', 'weekly', 'monthly'].map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && { color: '#fff' }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReport(); }} tintColor="#378ADD" />}
      >
        {loading
          ? <ActivityIndicator size="large" color="#378ADD" style={{ marginTop: 60 }} />
          : data
            ? tab === 'daily' ? renderDaily()
              : tab === 'weekly' ? renderWeekly()
              : renderMonthly()
            : <Text style={s.empty}>No data available</Text>
        }
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: '#E6EDF3' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  tabBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D' },
  tabActive: { backgroundColor: '#378ADD', borderColor: '#378ADD' },
  tabText: { fontSize: 13, color: '#8B949E', fontWeight: '600' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  dateText: { fontSize: 14, color: '#8B949E', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#161B22', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#21262D' },
  statLabel: { fontSize: 11, color: '#8B949E', marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '700' },
  section: { backgroundColor: '#161B22', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#21262D' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#E6EDF3', marginBottom: 12 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  catName: { fontSize: 14, color: '#8B949E' },
  catAmount: { fontSize: 14, color: '#E6EDF3', fontWeight: '600' },
  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  dayName: { fontSize: 12, color: '#8B949E', width: 30 },
  dayBars: { flex: 1 },
  bar: { height: 6, borderRadius: 3 },
  dayAmount: { fontSize: 12, color: '#E6EDF3', width: 60, textAlign: 'right' },
  empty: { color: '#8B949E', textAlign: 'center', marginTop: 60, fontSize: 16 },
});