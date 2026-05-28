import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function ReportsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>ReportsScreen</Text>
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#0D1117' },
  text: { color:'#E6EDF3', fontSize:20, fontWeight:'700' },
  sub: { color:'#8B949E', fontSize:14, marginTop:8 },
});
