import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import api from '../api/client';

const TYPE_COLORS = { income: '#1D9E75', expense: '#F0997B' };
const COST_COLORS = { fixed: '#378ADD', variable: '#8B949E', accidental: '#EF9F27' };

export default function TransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTransactions();
    const unsub = navigation.addListener('focus', loadTransactions);
    return unsub;
  }, [navigation]);

  const loadTransactions = async () => {
    try {
      const res = await api.get('/transactions/');
      setTransactions(res.data);
    } catch (e) {
      console.log('Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deleteTransaction = async (id) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/transactions/${id}`);
            setTransactions(prev => prev.filter(t => t.id !== id));
          } catch (e) {
            Alert.alert('Error', 'Could not delete transaction');
          }
        }
      }
    ]);
  };

  const filtered = filter === 'all' ? transactions
    : transactions.filter(t => t.type === filter);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={s.item}
      onPress={() => navigation.navigate('EditTransaction', { transaction: item })}
      onLongPress={() => deleteTransaction(item.id)}
    >
      <View style={[s.typeBar, { backgroundColor: TYPE_COLORS[item.type] }]} />
      <View style={s.itemContent}>
        <View style={s.itemTop}>
          <Text style={s.category}>{item.category}</Text>
          <Text style={[s.amount, { color: TYPE_COLORS[item.type] }]}>
            {item.type === 'income' ? '+' : '-'}{item.amount.toLocaleString()} {item.currency}
          </Text>
        </View>
        <View style={s.itemBottom}>
          <View style={[s.costBadge, { backgroundColor: COST_COLORS[item.cost_type] + '22' }]}>
            <Text style={[s.costText, { color: COST_COLORS[item.cost_type] }]}>{item.cost_type}</Text>
          </View>
          {item.note && <Text style={s.note} numberOfLines={1}>{item.note}</Text>}
          <Text style={s.date}>{item.transaction_date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#378ADD" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Transactions</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('AddTransaction')}
        >
          <Text style={s.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={s.filters}>
        {['all', 'income', 'expense'].map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && { color: '#fff' }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTransactions(); }} tintColor="#378ADD" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No transactions yet</Text>
            <Text style={s.emptySub}>Tap + Add to get started</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1117' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: '#E6EDF3' },
  addBtn: { backgroundColor: '#378ADD', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D' },
  filterActive: { backgroundColor: '#378ADD', borderColor: '#378ADD' },
  filterText: { fontSize: 13, color: '#8B949E', fontWeight: '500' },
  item: { flexDirection: 'row', backgroundColor: '#161B22', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#21262D' },
  typeBar: { width: 4 },
  itemContent: { flex: 1, padding: 14 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  category: { fontSize: 15, fontWeight: '600', color: '#E6EDF3' },
  amount: { fontSize: 16, fontWeight: '700' },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  costBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  costText: { fontSize: 11, fontWeight: '600' },
  note: { fontSize: 12, color: '#8B949E', flex: 1 },
  date: { fontSize: 11, color: '#6E7681', marginLeft: 'auto' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, color: '#E6EDF3', fontWeight: '600', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#8B949E' },
});
