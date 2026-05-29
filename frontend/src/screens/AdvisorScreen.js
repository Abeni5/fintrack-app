import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../api/client';

export default function AdvisorScreen() {
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

  const AICard = ({ advice }) => (
    <View style={s.aiCard}>
      <Text style={s.aiLabel}>🧠 AI Advisor</Text>
      <Text style={s.aiText}>{advice}</Text>
    </View>
  );

  const renderContent = () => {
    if (tab === 'chat') {
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Text style={s.chatTitle}>Ask your financial advisor anything</Text>
          {chatReply ? (
            <View style={s.aiCard}>
              <Text style={s.aiLabel}>🧠 AI Advisor</Text>
              <Text style={s.aiText}>{chatReply}</Text>
            </View>
          ) : null}
          <View style={s.chatRow}>
            <TextInput
              style={s.chatInput}
              placeholder="Ask anything about your finances..."
              placeholderTextColor="#888"
              value={chatMsg}
              onChangeText={setChatMsg}
              multiline
            />
            <TouchableOpacity style={s.sendBtn} onPress={sendChat} disabled={chatLoading}>
              {chatLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sendText}>→</Text>}
            </TouchableOpacity>
          </View>
          <View style={s.suggestions}>
            {['How can I save more?', 'Am I overspending?', 'What is my biggest expense?'].map((q, i) => (
              <TouchableOpacity key={i} style={s.suggBtn} onPress={() => setChatMsg(q)}>
                <Text style={s.suggText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </KeyboardAvoidingView>
      );
    }

    if (loading) return <ActivityIndicator size="large" color="#378ADD" style={{ marginTop: 60 }} />;
    if (!data) return <Text style={s.empty}>No data available</Text>;

    return (
      <View>
        {data.ai_advice && <AICard advice={data.ai_advice} />}
        {tab === 'warnings' && data.warnings?.map((w, i) => (
          <View key={i} style={s.warningCard}>
            <Text style={s.warningTitle}>⚠️ {w.category}</Text>
            <Text style={s.warningText}>Spent {w.current_spend?.toLocaleString()} vs avg {w.average_spend?.toLocaleString()} ({w.percent_over}% over)</Text>
          </View>
        ))}
        {tab === 'fixed-detector' && data.detected?.map((d, i) => (
          <View key={i} style={s.detectedCard}>
            <Text style={s.detectedTitle}>📌 {d.category}</Text>
            <Text style={s.detectedText}>{d.message}</Text>
          </View>
        ))}
        {tab === 'accidental-average' && data.monthly_average !== undefined && (
          <View style={s.section}>
            <View style={s.statRow}>
              <Text style={s.statLabel}>Monthly Average</Text>
              <Text style={s.statVal}>{data.monthly_average?.toLocaleString()}</Text>
            </View>
            <View style={s.statRow}>
              <Text style={s.statLabel}>Recommended Buffer</Text>
              <Text style={[s.statVal, { color: '#EF9F27' }]}>{data.recommended_buffer?.toLocaleString()}</Text>
            </View>
            <View style={s.statRow}>
              <Text style={s.statLabel}>Months Tracked</Text>
              <Text style={s.statVal}>{data.months_tracked}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>AI Advisor</Text>
      </View>
      <ScrollView
        horizontal showollIndicator={false}
        style={s.tabsScroll} contentContainerStyle={s.tabs}
      >
        {[
          { key: 'suggestions', label: '💡 Suggestions' },
          { key: 'warnings', label: '⚠️ Warnings' },
          { key: 'fixed-detector', label: '📌 Fixed Detector' },
          { key: 'accidental-average', label: '🚨 Accidentals' },
          { key: 'chat', label: '💬 Chat' },
        ].map(t => (
          <TouchableOpacity key={t.key} style={[s.tabBtn, tab === t.key && s.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[s.tabText, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView
        style={s.scroll}
        refreshControl={tab !== 'chat' ? <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#378ADD" /> : undefined}
      >
        {renderContent()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '700', color: '#E6EDF3' },
  tabsScroll: { maxHeight: 50 },
  tabs: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D' },
  tabActive: { backgroundColor: '#378ADD', borderColor: '#378ADD' },
  tabText: { fontSize: 13, color: '#8B949E', fontWeight: '500', whiteSpace: 'nowrap' },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  aiCard: { backgroundColor: '#161B22', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#378ADD33' },
  aiLabel: { fontSize: 12, color: '#378ADD', fontWeight: '600', marginBottom: 8 },
  aiText: { fontSize: 14, color: '#E6EDF3', lineHeight: 22 },
  warningCard: { backgroundColor: '#EF9F2711', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EF9F2733' },
  warningTitle: { fontSize: 15, fontWeight: '600', color: '#EF9F27', marginBottom: 6 },
  warningText: { fontSize: 13, color: '#8B949E' },
  detectedCard: { backgroundColor: '#378ADD11', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#378ADD33' },
  detectedTitle: { fontSize: 15, fontWeight: '600', color: '#378ADD', marginBottom: 6 },
  detectedText: { fontSize: 13, color: '#8B949E' },
  section: { backgroundColor: '#161B22', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#21262D' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  statLabel: { fontSize: 14, color: '#8B949E' },
  statVal: { fontSize: 14, color: '#E6EDF3', fontWeight: '600' },
  empty: { color: '#8B949E', textAlign: 'center', marginTop: 60, fontSize: 16 },
  chatTitle: { fontSize: 14, color: '#8B949E', marginBottom: 16 },
  chatRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chatInput: { flex: 1, backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D', borderRadius: 12, padding: 14, fontSize: 14, color: '#E6EDF3', maxHeight: 100 },
  sendBtn: { backgroundColor: '#378ADD', borderRadius: 12, width: 50, justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  suggestions: { gap: 8 },
  suggBtn: { backgroundColor: '#161B22', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#21262D' },
  suggText: { fontSize: 13, color: '#8B949E' },
});