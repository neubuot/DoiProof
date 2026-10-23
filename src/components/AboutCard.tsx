import { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { appIdentity } from '../evidence';
import { styles } from '../ui/styles';

/**
 * Diese Adressen gehören unverändert in den Play-Eintrag. Google verlangt den Verweis auf
 * die Datenschutzerklärung an zwei Stellen: im Eintrag und zusätzlich in der App, sobald
 * personenbezogene oder sensible Daten verarbeitet werden. DoiProof fordert Kamera und
 * genauen Standort an und fällt darunter.
 */
export const PRIVACY_URL = 'https://doiproof.doilabs.org/datenschutz';
export const IMPRESSUM_URL = 'https://doiproof.doilabs.org/impressum';

/** Version, Update-Kanal, Rechtliches und manuelle Update-Prüfung für Testerinnen und Tester. */
export function AboutCard() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const app = appIdentity();

  async function checkUpdate() {
    if (!Updates.isEnabled) { setMessage('Updates sind in der Entwicklungsumgebung (Expo Go) nicht aktiv.'); return; }
    setBusy(true);
    try {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) { setMessage('Diese App ist auf dem neuesten Stand ihres Kanals.'); return; }
      await Updates.fetchUpdateAsync();
      Alert.alert('Update geladen', 'Die App wird jetzt neu gestartet, um das Update zu verwenden.', [
        { text: 'Später', style: 'cancel', onPress: () => setMessage('Update geladen; es wird beim nächsten Start aktiv.') },
        { text: 'Neu starten', onPress: () => { void Updates.reloadAsync(); } },
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? `Update-Prüfung fehlgeschlagen: ${error.message}` : 'Update-Prüfung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  async function openLink(url: string) {
    try { await Linking.openURL(url); }
    catch { Alert.alert('Link konnte nicht geöffnet werden', url); }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Über diese App</Text>
      <Text style={styles.muted}>
        DoiProof {app.version}
        {app.update ? ` · Kanal ${app.update.channel ?? 'keiner'} · ${app.update.embedded ? 'eingebautes Bundle' : `Update ${String(app.update.updateId).slice(0, 8)}`}` : ' · Entwicklungsmodus'}
        {app.sourceCommit ? ` · Commit ${app.sourceCommit.slice(0, 7)}` : ''}
      </Text>
      {app.update?.runtimeVersion && <Text selectable style={styles.small}>Laufzeitversion: {app.update.runtimeVersion}</Text>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={checkUpdate}><Text style={styles.secondaryText}>{busy ? 'Suche Update …' : 'Nach Update suchen'}</Text></Pressable>
      {!!message && <Text style={styles.muted}>{message}</Text>}
      <View style={styles.row}>
        <Pressable accessibilityRole="link" onPress={() => void openLink(PRIVACY_URL)}><Text style={styles.secondaryText}>Datenschutzerklärung</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => void openLink(IMPRESSUM_URL)}><Text style={styles.secondaryText}>Impressum</Text></Pressable>
      </View>
      <Text style={styles.small}>Versions- und Commit-Angaben sind Selbstauskünfte der App, keine Attestierung.</Text>
    </View>
  );
}
