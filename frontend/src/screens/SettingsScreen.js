import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout }
    ]);
  };

  const MenuItem = ({ icon, label, sub, onPress, color }) => (
    <TouchableOpacity style={s.menuItem} onPress={onPress}>
      <Text style={s.menuIcon}>{icon}</Text>
      <View style={s.menuText}>
        <Text style={[s.menuLabel, color && { color }]}>{label}</Text>
        {sub && <Text style={s.menuSub}>{sub}</Text>}
      </View>
      <Text style={s.menuArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={s.container}>
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

      <Text style={s.sectionLabel}>Finance Tools</Text>
      <View style={s.section}>
        <MenuItem icon='💱' label='Currency Exchange' sub='Bank rate + black market converter' onPress={() => navigation.navigate('Currency')} />
        <MenuItem icon='🎯' label='Budget and Goals' sub='Set limits and track savings' onPress={() => navigation.navigate('Budget')} />
      </View>

      <Text style={s.sectionLabel}>App Info</Text>
      <View style={s.section}>
        <MenuItem icon='📱' label='App Version' sub='1.0.0' onPress={() => {}} />
        <MenuItem icon='🗄️' label='Database' sub='Supabase — connected' onPress={() => {}} />
        <MenuItem icon='🧠' label='AI Advisor' sub='Powered by Groq Llama 3' onPress={() => {}} />
      </View>

      <Text style={s.sectionLabel}>Account</Text>
      <View style={s.section}>
        <MenuItem icon='🚪' label='Logout' sub='Sign out of your account' onPress={handleLogout} color='#F0997B' />
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: '#E6EDF3' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, margin: 20, marginTop: 8, backgroundColor: '#161B22', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#21262D' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#378ADD', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  name: { fontSize: 18, fontWeight: '600', color: '#E6EDF3' },
  email: { fontSize: 13, color: '#8B949E', marginTop: 2 },
  currency: { fontSize: 13, color: '#378ADD', marginTop: 4 },
  sectionLabel: { fontSize: 12, color: '#8B949E', fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 8, marginTop: 8 },
  section: { marginHorizontal: 20, backgroundColor: '#161B22', borderRadius: 12, borderWidth: 1, borderColor: '#21262D', overflow: 'hidden', marginBottom: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, color: '#E6EDF3', fontWeight: '500' },
  menuSub: { fontSize: 12, color: '#8B949E', marginTop: 2 },
  menuArrow: { fontSize: 20, color: '#8B949E' },
});