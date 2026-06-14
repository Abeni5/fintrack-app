import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import api from '../api/client';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy'; // fix: use legacy API for SDK 54
import * as XLSX from 'xlsx';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState('daily');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => { loadReport(); }, [tab]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${tab}`);
      setData(res.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const getReportRows = () => {
    if (!data) return [];
    if (tab === 'daily') {
      const rows = [
        { Field: 'Date', Value: data.date },
        { Field: 'Income', Value: data.income },
        { Field: 'Expense', Value: data.expense },
        { Field: 'Balance', Value: data.balance },
      ];
      if (data.categories?.length) {
        rows.push({ Field: '', Value: '' });
        rows.push({ Field: 'Category', Value: 'Total' });
        data.categories.forEach(c => rows.push({ Field: c.category, Value: c.total }));
      }
      return rows;
    }
    if (tab === 'weekly') {
      const rows = [
        { Field: 'Week', Value: `${data.week_start} → ${data.week_end}` },
        { Field: 'Total Income', Value: data.total_income },
        { Field: 'Total Expense', Value: data.total_expense },
        { Field: '', Value: '' },
        { Field: 'Day', Value: 'Income', Expense: 'Expense', Net: 'Net' },
      ];
      data.days?.forEach(d => rows.push({
        Field: d.day, Value: d.income, Expense: d.expense, Net: d.income - d.expense,
      }));
      return rows;
    }
    if (tab === 'monthly') {
      const rows = [
        { Field: 'Period', Value: `${data.year} / ${data.month}` },
        { Field: 'Income', Value: data.income },
        { Field: 'Expense', Value: data.expense },
        { Field: 'Balance', Value: data.balance },
      ];
      if (data.by_cost_type) {
        rows.push({ Field: '', Value: '' });
        rows.push({ Field: 'Cost Type', Value: 'Amount' });
        Object.entries(data.by_cost_type).forEach(([k, v]) => rows.push({ Field: k, Value: v }));
      }
      if (data.by_category?.length) {
        rows.push({ Field: '', Value: '' });
        rows.push({ Field: 'Category', Value: 'Total' });
        data.by_category.forEach(c => rows.push({ Field: c.category, Value: c.total }));
      }
      return rows;
    }
    return [];
  };

  const buildReportHTML = () => {
    const rows = getReportRows();
    const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
    const rowsHTML = rows.map(r => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#444;">${r.Field ?? ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#111;">${r.Value ?? ''}</td>
        ${r.Expense !== undefined ? `<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:#F0997B;">${r.Expense}</td>` : ''}
        ${r.Net !== undefined ? `<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:#1D9E75;">${r.Net}</td>` : ''}
      </tr>`).join('');
    return `<html><head><meta charset="utf-8">
      <style>
        body{font-family:Arial,sans-serif;padding:32px;color:#111;}
        h1{color:#378ADD;font-size:28px;margin-bottom:4px;}
        .sub{color:#888;font-size:14px;margin-bottom:24px;}
        table{width:100%;border-collapse:collapse;}
        th{background:#378ADD;color:#fff;padding:10px 12px;text-align:left;}
        tr:nth-child(even){background:#f9f9f9;}
      </style></head>
      <body>
        <h1>FinTrack — ${tabLabel} Report</h1>
        <p class="sub">Generated on ${new Date().toLocaleDateString()}</p>
        <table>
          <thead><tr><th>Field</th><th style="text-align:right">Value</th></tr></thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </body></html>`;
  };

  // ── PDF download (fixed for Expo SDK 54) ──────────────────────────────────
  const downloadPDF = async () => {
    try {
      setDownloading('pdf');
      const html = buildReportHTML();
      const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
      const fileName = `FinTrack_${tabLabel}_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const dest = FileSystem.documentDirectory + fileName;
      await FileSystem.moveAsync({ from: uri, to: dest });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or share your report',
        });
      } else {
        Alert.alert('Saved', `PDF saved to:\n${dest}`);
      }
    } catch (e) {
      console.log('PDF error:', e);
      Alert.alert('Error', 'Could not generate PDF.');
    } finally {
      setDownloading(null);
    }
  };

  // ── Excel download (fixed: binary → btoa workaround for React Native) ─────
  const downloadExcel = async () => {
    try {
      setDownloading('excel');
      const rows = getReportRows();
      const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
      const fileName = `FinTrack_${tabLabel}_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, tabLabel);

      // React Native fix: write as binary string, then encode to base64 manually
      const binary = XLSX.write(wb, { type: 'binary', bookType: 'xlsx' });
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i) & 0xff;
      }
      // Convert Uint8Array to base64
      let base64 = '';
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        base64 += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      base64 = btoa(base64);

      const dest = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(dest, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Save or share your report',
        });
      } else {
        Alert.alert('Saved', `Excel saved to:\n${dest}`);
      }
    } catch (e) {
      console.log('Excel error:', e);
      Alert.alert('Error', 'Could not generate Excel file.');
    } finally {
      setDownloading(null);
    }
  };

  const StatCard = ({ label, value, color }) => (
    <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[s.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[s.statValue, { color: color || colors.text }]}>{value?.toLocaleString() || '0'}</Text>
    </View>
  );

  const renderDaily = () => (
    <View>
      <Text style={[s.dateText, { color: colors.textSecondary }]}>{data?.date}</Text>
      <View style={s.statsRow}>
        <StatCard label="Income" value={data?.income} color="#1D9E75" />
        <StatCard label="Expense" value={data?.expense} color="#F0997B" />
        <StatCard label="Balance" value={data?.balance} color={colors.primary} />
      </View>
      {data?.categories?.length > 0 && (
        <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>By Category</Text>
          {data.categories.map((c, i) => (
            <View key={i} style={[s.catRow, { borderBottomColor: colors.border }]}>
              <Text style={[s.catName, { color: colors.textSecondary }]}>{c.category}</Text>
              <Text style={[s.catAmount, { color: colors.text }]}>{c.total?.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderWeekly = () => (
    <View>
      <Text style={[s.dateText, { color: colors.textSecondary }]}>{data?.week_start} → {data?.week_end}</Text>
      <View style={s.statsRow}>
        <StatCard label="Income" value={data?.total_income} color="#1D9E75" />
        <StatCard label="Expense" value={data?.total_expense} color="#F0997B" />
      </View>
      {data?.days?.map((d, i) => (
        <View key={i} style={s.dayRow}>
          <Text style={[s.dayName, { color: colors.textSecondary }]}>{d.day?.slice(0, 3)}</Text>
          <View style={s.dayBars}>
            <View style={[s.bar, { width: Math.min((d.income / (data.total_income || 1)) * 150, 150), backgroundColor: '#1D9E75' }]} />
            <View style={[s.bar, { width: Math.min((d.expense / (data.total_expense || 1)) * 150, 150), backgroundColor: '#F0997B', marginTop: 4 }]} />
          </View>
          <Text style={[s.dayAmount, { color: colors.text }]}>{(d.income - d.expense).toLocaleString()}</Text>
        </View>
      ))}
    </View>
  );

  const renderMonthly = () => (
    <View>
      <Text style={[s.dateText, { color: colors.textSecondary }]}>{data?.year} / {data?.month}</Text>
      <View style={s.statsRow}>
        <StatCard label="Income" value={data?.income} color="#1D9E75" />
        <StatCard label="Expense" value={data?.expense} color="#F0997B" />
        <StatCard label="Balance" value={data?.balance} color={colors.primary} />
      </View>
      {data?.by_cost_type && (
        <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>By Cost Type</Text>
          {Object.entries(data.by_cost_type).map(([k, v], i) => (
            <View key={i} style={[s.catRow, { borderBottomColor: colors.border }]}>
              <Text style={[s.catName, { color: colors.textSecondary }]}>{k}</Text>
              <Text style={[s.catAmount, { color: colors.text }]}>{v?.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
      {data?.by_category?.length > 0 && (
        <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Top Categories</Text>
          {data.by_category.slice(0, 5).map((c, i) => (
            <View key={i} style={[s.catRow, { borderBottomColor: colors.border }]}>
              <Text style={[s.catName, { color: colors.textSecondary }]}>{c.category}</Text>
              <Text style={[s.catAmount, { color: colors.text }]}>{c.total?.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Reports</Text>
      </View>

      <View style={s.tabs}>
        {['daily', 'weekly', 'monthly'].map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, { backgroundColor: colors.card, borderColor: colors.border },
              tab === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, { color: colors.textSecondary }, tab === t && { color: '#fff' }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!loading && data && (
        <View style={s.downloadRow}>
          <TouchableOpacity
            style={[s.dlBtn, { borderColor: '#F0997B', backgroundColor: '#F0997B18' }]}
            onPress={downloadPDF}
            disabled={!!downloading}
          >
            {downloading === 'pdf'
              ? <ActivityIndicator size="small" color="#F0997B" />
              : <Text style={[s.dlText, { color: '#F0997B' }]}>⬇ PDF</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.dlBtn, { borderColor: '#1D9E75', backgroundColor: '#1D9E7518' }]}
            onPress={downloadExcel}
            disabled={!!downloading}
          >
            {downloading === 'excel'
              ? <ActivityIndicator size="small" color="#1D9E75" />
              : <Text style={[s.dlText, { color: '#1D9E75' }]}>⬇ Excel</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReport(); }} tintColor={colors.primary} />}
      >
        {loading
          ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
          : data
            ? tab === 'daily' ? renderDaily() : tab === 'weekly' ? renderWeekly() : renderMonthly()
            : <Text style={[s.empty, { color: colors.textSecondary }]}>No data available</Text>
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
  tabText: { fontSize: 13, fontWeight: '600' },
  downloadRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  dlBtn: { flex: 1, padding: 11, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  dlText: { fontSize: 14, fontWeight: '700' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  dateText: { fontSize: 14, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1 },
  statLabel: { fontSize: 11, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '700' },
  section: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  catName: { fontSize: 14 },
  catAmount: { fontSize: 14, fontWeight: '600' },
  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  dayName: { fontSize: 12, width: 30 },
  dayBars: { flex: 1 },
  bar: { height: 6, borderRadius: 3 },
  dayAmount: { fontSize: 12, width: 60, textAlign: 'right' },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 16 },
});