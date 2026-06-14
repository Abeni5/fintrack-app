import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { colors, mode, setMode } = useTheme();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout }
    ]);
  };

  const modeLabel = { light: 'Light', dark: 'Dark', system: 'System' };

  const MenuItem = ({ icon, label, sub, onPress, color }) => (
    <TouchableOpacity style={[s.menuItem, { borderBottomColor: colors.border }]} onPress={onPress}>
      <Text style={s.menuIcon}>{icon}</Text>
      <View style={s.menuText}>
        <Text style={[s.menuLabel, { color: color || colors.text }]}>{label}</Text>
        {sub && <Text style={[s.menuSub, { color: colors.textSecondary }]}>{sub}</Text>}
      </View>
      <Text style={[s.menuArrow, { color: colors.textSecondary }]}>›</Text>
    </TouchableOpacity>
  );

  const ThemeOption = ({ value, label }) => (
    <TouchableOpacity
      style={[
        s.themeOption,
        { borderColor: colors.border, backgroundColor: mode === value ? colors.primary : colors.surface },
      ]}
      onPress={() => setMode(value)}
    >
      <Text style={[s.themeOptionText, { color: mode === value ? '#FFFFFF' : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Settings</Text>
      </View>

      <View style={[s.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.avatar, { backgroundColor: colors.primary }]}>
          <Text style={s.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={[s.name, { color: colors.text }]}>{user?.name}</Text>
          <Text style={[s.email, { color: colors.textSecondary }]}>{user?.email}</Text>
          <Text style={[s.currency, { color: colors.primary }]}>Default: {user?.default_currency}</Text>
        </View>
      </View>

      <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Appearance</Text>
      <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.themeRow}>
          <ThemeOption value="light" label="Light" />
          <ThemeOption value="dark" label="Dark" />
          <ThemeOption value="system" label="System" />
        </View>
        <Text style={[s.themeHint, { color: colors.textSecondary }]}>
          Current: {modeLabel[mode]}
        </Text>
      </View>

      <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Finance Tools</Text>
      <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MenuItem icon='💱' label='Currency Exchange' sub='Bank rate + black market converter' onPress={() => navigation.navigate('Currency')} />
        <MenuItem icon='🎯' label='Budget and Goals' sub='Set limits and track savings' onPress={() => navigation.navigate('Budget')} />
      </View>

      <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>App Info</Text>
      <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MenuItem icon='📱' label='App Version' sub='1.0.0' onPress={() => {}} />
        <MenuItem icon='🗄️' label='Database' sub='Supabase — connected' onPress={() => {}} />
        <MenuItem icon='🧠' label='AI Advisor' sub='Powered by Groq Llama 3' onPress={() => {}} />
      </View>

      <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Account</Text>
      <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MenuItem icon='🚪' label='Logout' sub='Sign out of your account' onPress={handleLogout} color='#F0997B' />
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, margin: 20, marginTop: 8, borderRadius: 16, padding: 20, borderWidth: 1 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  name: { fontSize: 18, fontWeight: '600' },
  email: { fontSize: 13, marginTop: 2 },
  currency: { fontSize: 13, marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 8, marginTop: 8 },
  section: { marginHorizontal: 20, borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
  themeRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  themeOption: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  themeOptionText: { fontSize: 13, fontWeight: '600' },
  themeHint: { fontSize: 12, paddingHorizontal: 16, paddingBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '500' },
  menuSub: { fontSize: 12, marginTop: 2 },
  menuArrow: { fontSize: 20 },
});