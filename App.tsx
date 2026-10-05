import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CaptureScreen } from './src/screens/CaptureScreen';
import { VerifyScreen } from './src/screens/VerifyScreen';
import { styles } from './src/ui/styles';

type Tab = 'capture' | 'verify';

export default function App() {
  return <SafeAreaProvider><Root /></SafeAreaProvider>;
}

function Root() {
  const [tab, setTab] = useState<Tab>('capture');
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.tabs} accessibilityRole="tablist">
        {([['capture', 'Aufnehmen'], ['verify', 'Prüfen']] as const).map(([id, label]) => (
          <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} style={[styles.tab, tab === id && styles.tabActive]} onPress={() => setTab(id)}>
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {/* Beide Ansichten bleiben eingehängt, damit Verlauf und Prüfergebnis beim Wechsel erhalten bleiben. */}
      <View style={{ flex: 1, display: tab === 'capture' ? 'flex' : 'none' }}><CaptureScreen /></View>
      <View style={{ flex: 1, display: tab === 'verify' ? 'flex' : 'none' }}><VerifyScreen /></View>
    </SafeAreaView>
  );
}
