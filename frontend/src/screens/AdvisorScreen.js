import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import api from '../api/client';

export default function AdvisorScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState('suggestions');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatMsg, setChatMsg] = useState('');
  const [chatReply, setChatReply] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { if (tab !== 'chat') loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/advisor/${tab}`);
      setData(res.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    setChatLoading(true);
    try {
      const res = await api.post('/advisor/chat', { message: chatMsg });
      setChatReply(res.data.reply);
    } catch (e) { setChatReply('Sorry, could not get a response.'); }
    finally { setChatLoading(false); }
  };

  const renderContent = () => {
    if (tab === 'chat') {
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Text style={[s.chatTitle, { color: colors.textSecondary }]}>Ask your financial advisor anything</Text>
          {chatReply ? (
            <View style={[s.aiCard, { backgroundColor: colors.card, borderColor: colors.primary + '33' }]}>
              <Text style={[s.aiLabel, { color: colors.primary }]}>🧠 AI Advisor</Text>
              <Text style={[s.aiText, { color: colors.text }]}>{chatReply}</Text>
            </View>
          ) : null}
          <View style={s.chatRow}>
            <TextInput
              style={[s.chatInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Ask anything about your finances..."
              placeholderTextColor={colors.textSecondary}
              value={chatMsg} onChangeText={setChatMsg} multiline
            />
            <TouchableOpacity style={[s.sendBtn, { backgroundColor: colors.primary }]} onPress={sendChat} disabled={chatLoading}>
              {chatLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sendText}>→</Text>}
            </TouchableOpacity>
          </View>
          <View style={s.suggestions}>
            {['How can I save more?', 'Am I overspending?', 'What is my biggest expense?'].map((q, i) => (
              <TouchableOpacity key={i} style={[s.suggBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setChatMsg(q)}>
                <Text style={[s.suggText, { color: colors.textSecondary }]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </KeyboardAvoidingView>
      );
    }

    if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;
    if (!data) return <Text style={[s.empty, { color: colors.textSecondary }]}>No data available</Text>;

    return (
      <View>
        {data.ai_advice && (
          <View style={[s.aiCard, { backgroundColor: colors.card, borderColor: colors.primary + '33' }]}>
            <Text style={[s.aiLabel, { color: colors.primary }]}>🧠 AI Advisor</Text>
            <Text style={[s.aiText, { color: colors.text }]}>{data.ai_advice}</Text>
          </View>
        )}
        {tab === 'warnings' && data.warnings?.map((w, i) => (
          <View key={i} style={[s.warningCard, { backgroundColor: '#EF9F2711', borderColor: '#EF9F2733' }]}>
            <Text style={s.warningTitle}>⚠️ {w.category}</Text>
            <Text style={[s.warningText, { color: colors.textSecondary }]}>Spent {w.current_spend?.toLocaleString()} vs avg {w.average_spend?.toLocaleString()} ({w.percent_over}% over)</Text>
          </View>
        ))}
        {tab === 'fixed-detector' && data.detected?.map((d, i) => (
          <View key={i} style={[s.detectedCard, { backgroundColor: colors.primary + '11', borderColor: colors.primary + '33' }]}>
            <Text style={[s.detectedTitle, { color: colors.primary }]}>📌 {d.category}</Text>
            <Text style={[s.detectedText, { color: colors.textSecondary }]}>{d.message}</Text>
          </View>
        ))}
        {tab === 'accidental-average' && data.monthly_average !== undefined && (
          <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { label: 'Monthly Average', val: data.monthly_average?.toLocaleString(), color: colors.text },
              { label: 'Recommended Buffer', val: data.recommended_buffer?.toLocaleString(), color: '#EF9F27' },
              { label: 'Months Tracked', val: data.months_tracked, color: colors.text },
            ].map((row, i) => (
              <View key={i} style={[s.statRow, { borderBottomColor: colors.border }]}>
                <Text style={[s.statLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[s.statVal, { color: row.color }]}>{row.val}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>AI Advisor</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabs}>
        {[
          { key: 'suggestions', label: '💡 Suggestions' },
          { key: 'warnings', label: '⚠️ Warnings' },
          { key: 'fixed-detector', label: '📌 Fixed Detector' },
          { key: 'accidental-average', label: '🚨 Accidentals' },
          { key: 'chat', label: '💬 Chat' },
        ].map(t => (
          <TouchableOpacity key={t.key} style={[s.tabBtn, { backgroundColor: colors.card, borderColor: colors.border }, tab === t.key && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setTab(t.key)}>
            <Text style={[s.tabText, { color: colors.textSecondary }, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView
        style={s.scroll}
        refreshControl={tab !== 'chat' ? <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} /> : undefined}
      >
        {renderContent()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700' },
  tabsScroll: { maxHeight: 50 },
  tabs: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 13, fontWeight: '500' },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  aiCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  aiLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  aiText: { fontSize: 14, lineHeight: 22 },
  warningCard: { borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1 },
  warningTitle: { fontSize: 15, fontWeight: '600', color: '#EF9F27', marginBottom: 6 },
  warningText: { fontSize: 13 },
  detectedCard: { borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1 },
  detectedTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  detectedText: { fontSize: 13 },
  section: { borderRadius: 12, padding: 16, borderWidth: 1 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  statLabel: { fontSize: 14 },
  statVal: { fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 16 },
  chatTitle: { fontSize: 14, marginBottom: 16 },
  chatRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chatInput: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, maxHeight: 100 },
  sendBtn: { borderRadius: 12, width: 50, justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  suggestions: { gap: 8 },
  suggBtn: { borderRadius: 10, padding: 12, borderWidth: 1 },
  suggText: { fontSize: 13 },
});