import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { StatusBar } from 'expo-status-bar';
import { createProof, getQuota, Proof, Quota, verifyProof } from './src/doichain';

type Selected = { uri: string; hash: string; capturedAt?: string };

export default function App() {
  const [selected, setSelected] = useState<Selected | null>(null);
  const [key, setKey] = useState('');
  const [autoSend, setAutoSend] = useState(true);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [result, setResult] = useState<Proof | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getQuota().then(setQuota).catch(() => setQuota(null));
  }, []);

  async function refreshQuota() {
    try { setQuota(await getQuota(key)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Kontingent konnte nicht geladen werden.'); }
  }

  async function submit(hash: string, capturedAt?: string) {
    setBusy(true);
    setMessage('Hash wird über den Doichain-MCP-Server gesendet …');
    try {
      // The note is public on chain; it is a device clock reading, not a trusted timestamp.
      const proof = await createProof(hash, key, capturedAt ? `Aufnahme laut Gerät: ${capturedAt}` : undefined);
      setResult(proof);
      getQuota(key).then(setQuota).catch(() => setQuota(null));
      setMessage('Einreichung angenommen. Prüfe später den Status auf der Kette.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Einreichung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  async function choose(source: 'camera' | 'library') {
    if (busy) return;
    setMessage('');
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setMessage('Kamerazugriff wurde nicht erlaubt.'); return; }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false,
      };
      const picked = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (picked.canceled || !picked.assets?.[0]) return;
      setBusy(true);
      setMessage('SHA-256 wird auf dem Gerät berechnet …');
      const asset = picked.assets[0];
      const bytes = await new File(asset.uri).bytes();
      const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      const capturedAt = source === 'camera' ? new Date().toISOString() : undefined;
      setSelected({ uri: asset.uri, hash, capturedAt });
      setResult(null);
      setMessage('Foto bereit. Nur der Hash und ggf. die öffentliche Gerätenotiz werden übertragen.');
      setBusy(false);
      if (autoSend) await submit(hash, capturedAt);
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : 'Foto konnte nicht verarbeitet werden.');
    }
  }

  async function check() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const proof = await verifyProof(selected.hash);
      setResult(proof);
      setMessage(proof.status === 'confirmed' || proof.status === 'expired' ? 'Nachweis auf der Doichain gefunden.' : proof.status === 'pending' ? 'Nachweis ist noch ausstehend.' : 'Noch kein bestätigter Nachweis gefunden.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Prüfung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>DOI / PROOF</Text>
        <Text style={styles.title}>Dein Foto. Dein Nachweis.</Text>
        <Text style={styles.lead}>DoiProof berechnet den SHA-256-Hash auf deinem Gerät und verankert ihn kostenlos über den Doichain-MCP-Server.</Text>
        <View style={styles.row}>
          <Pressable accessibilityRole="button" style={styles.button} onPress={() => choose('camera')} disabled={busy}><Text style={styles.buttonText}>Foto aufnehmen</Text></Pressable>
          <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => choose('library')} disabled={busy}><Text style={styles.secondaryText}>Foto wählen</Text></Pressable>
        </View>
        {selected && <View style={styles.card}>
          <Image source={{ uri: selected.uri }} style={styles.preview} resizeMode="contain" />
          <Text style={styles.label}>SHA-256 des ausgewählten Fotodatei-Inhalts</Text>
          <Text selectable style={styles.hash}>{selected.hash}</Text>
          {selected.capturedAt && <Text style={styles.muted}>Gerätezeit bei Aufnahme: {selected.capturedAt}</Text>}
        </View>}
        <View style={styles.card}>
          <Text style={styles.label}>Tageskontingent</Text>
          <Text>{quota ? quota.unlimited ? 'Mit eigenem Schlüssel: unbegrenzt' : `${quota.remaining_for_this_ip ?? '?'} von ${quota.limit_per_ip_per_day ?? 10} für diese IP übrig · ${quota.remaining_all_users ?? '?'} insgesamt übrig (UTC-Tag)` : 'Kontingent noch nicht geladen'}</Text>
          <Pressable accessibilityRole="button" onPress={refreshQuota}><Text style={styles.secondaryText}>Kontingent aktualisieren</Text></Pressable>
          <Text style={styles.label}>Eigener PoE- oder Write-Schlüssel (optional)</Text>
          <TextInput value={key} onChangeText={setKey} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Ohne Schlüssel: kostenloses Kontingent" style={styles.input} accessibilityLabel="Doichain API-Schlüssel" />
          <Text style={styles.muted}>Ohne Schlüssel: bis zu 10 Nachweise je IP und UTC-Tag, insgesamt höchstens 200 pro Tag. Ein eigener Schlüssel bleibt nur in dieser App-Sitzung im Speicher und wird an den MCP-Server gesendet.</Text>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>Nach Aufnahme sofort senden</Text><Switch value={autoSend} onValueChange={setAutoSend} /></View>
          {selected && <View style={styles.row}>
            <Pressable accessibilityRole="button" style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={() => submit(selected.hash, selected.capturedAt)}><Text style={styles.buttonText}>Nachweis anlegen</Text></Pressable>
            <Pressable accessibilityRole="button" style={styles.secondary} disabled={busy} onPress={check}><Text style={styles.secondaryText}>Status prüfen</Text></Pressable>
          </View>}
        </View>
        {busy && <ActivityIndicator color="#156a65" />}
        {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
        {result && <View style={styles.card}>
          <Text style={styles.label}>Antwort der Doichain-API</Text>
          <Text>Status: {result.status ?? 'offen'} · Bestätigt: {result.status === 'confirmed' || result.status === 'expired' ? 'ja' : 'nein'}</Text>
          {result.txid && <Text selectable style={styles.hash}>TX: {result.txid}</Text>}
          {result.block_time_utc && <Text>Blockzeit (UTC): {result.block_time_utc}</Text>}
        </View>}
        <Text style={styles.footer}>Das Foto wird nicht hochgeladen. Ein Hash belegt nur, dass dieselben Dateibytes verankert wurden; Aufnahmezeit, Urheberschaft und Echtheit des Motivs beweist er nicht. Die optionale Gerätezeit ist öffentlich und nicht verifiziert.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f3eb' }, content: { padding: 22, paddingTop: 38, paddingBottom: 54, gap: 18 },
  brand: { color: '#156a65', fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  title: { fontSize: 34, fontWeight: '800', color: '#172c2b' },
  lead: { fontSize: 16, lineHeight: 24, color: '#445d5a' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { backgroundColor: '#156a65', borderRadius: 12, padding: 14 },
  secondary: { borderColor: '#156a65', borderWidth: 1, borderRadius: 12, padding: 13 },
  buttonText: { color: '#fff', fontWeight: '700' }, secondaryText: { color: '#156a65', fontWeight: '700' },
  disabled: { opacity: 0.5 }, card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, gap: 12 },
  preview: { width: '100%', height: 230, backgroundColor: '#e9ece9', borderRadius: 10 },
  label: { fontWeight: '700', color: '#172c2b' }, hash: { fontFamily: 'monospace', color: '#244d49' },
  muted: { color: '#62716e', fontSize: 12, lineHeight: 18 },
  input: { borderWidth: 1, borderColor: '#b9c9c5', borderRadius: 10, padding: 13, fontSize: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { color: '#172c2b', fontWeight: '600', flex: 1 },
  message: { color: '#204a47', fontWeight: '600' }, footer: { color: '#62716e', fontSize: 12, lineHeight: 18 },
});
