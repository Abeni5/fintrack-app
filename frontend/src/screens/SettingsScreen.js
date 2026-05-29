import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout }
    ]);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
      </View>
      <View style={s.profileCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={s.name}>{user?.name}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <Text style={s.currency}>Default: {user?.default_currency}</Text>
        </View>
      </View>
      <View style={s.section}>
        <View style={s.row}>
          <Text style={s.rowLabel}>App Version</Text>
          <Text style={s.rowValue}>1.0.0</Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowLabel}>Backend</Text>
          <Text style={[s.rowValue, { color: '#1D9E75' }]}>Connected</Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowLabel}>Database</Text>
          <Text style={[s.rowValue, { color: '#1D9E75' }]}>Supabase</Text>
        </View>
      </View>
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: '#E6EDF3' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 20, backgroundColor: '#161B22', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#21262D' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#378ADD', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  name: { fontSize: 18, fontWeight: '600', color: '#E6EDF3' },
  email: { fontSize: 13, color: '#8B949E', marginTop: 2 },
  currency: { fontSize: 13, color: '#378ADD', marginTop: 4 },
  section: { margin: 20, backgroundColor: '#161B22', borderRadius: 12, borderWidth: 1, borderColor: '#21262D', overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  rowLabel: { fontSize: 14, color: '#8B949E' },
  rowValue: { fontSize: 14, color: '#E6EDF3', fontWeight: '500' },
  logoutBtn: { margin: 20, backgroundColor: '#F0997B22', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F0997B44' },
  logoutText: { color: '#F0997B', fontSize: 16, fontWeight: '600' },
});