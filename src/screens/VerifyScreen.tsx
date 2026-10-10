import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { ResultCard } from '../components/ResultCard';
import { mapNote, pickZip, shareReport, verifyZip, type PickedZip, type VerificationResult } from '../verifier';
import { colors, styles } from '../ui/styles';

/**
 * Prüfer auf dem Handy: eigenes oder fremdes ZIP importieren, mit dem gemeinsamen Prüfkern
 * offline prüfen, optional online abgleichen und den PDF-Prüfbericht teilen.
 */
export function VerifyScreen() {
  const [picked, setPicked] = useState<PickedZip | null>(null);
  const [online, setOnline] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [includePhoto, setIncludePhoto] = useState(true);
  const [includeLocation, setIncludeLocation] = useState(true);
  const [includeMap, setIncludeMap] = useState(true);

  async function choose() {
    setMessage('');
    try {
      const file = await pickZip();
      if (!file) return;
      setPicked(file);
      setResult(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ZIP konnte nicht gelesen werden.');
    }
  }

  async function verify() {
    if (!picked) return;
    setBusy(online ? 'Paket wird geprüft und online abgeglichen …' : 'Paket wird offline geprüft …');
    setMessage('');
    try {
      setResult(await verifyZip(picked.bytes, picked.name, online));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Prüfung fehlgeschlagen.');
    } finally {
      setBusy('');
    }
  }

  async function share() {
    if (!result) return;
    setBusy(includeLocation && includeMap ? 'Kartenausschnitt wird geladen und PDF-Prüfbericht erstellt …' : 'PDF-Prüfbericht wird erstellt …');
    try {
      const { mapStatus } = await shareReport(result, { includePhoto, includeLocation, includeMap });
      setMessage(`PDF-Prüfbericht wurde gespeichert und im Teilen-Dialog angeboten.${mapNote(mapStatus)}`);
    } catch (error) {
      Alert.alert('Prüfbericht konnte nicht erstellt werden', error instanceof Error ? error.message : 'Unbekannter Fehler.');
    } finally {
      setBusy('');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Text style={styles.brand}>DOIPROOF  /  PRÜFER</Text>
        <Text style={styles.title}>Beweispaket{'\n'}prüfen.</Text>
        <Text style={styles.lead}>Dieselbe Prüfung wie das Kommandozeilenprogramm und der Windows-Prüfer. Das ZIP bleibt auf dem Gerät; online werden nur Hashwerte abgefragt.</Text>
      </View>
      <Text style={styles.sectionEyebrow}>01  /  PAKET WÄHLEN</Text>
      <View style={styles.card}>
        <Pressable accessibilityRole="button" style={styles.button} onPress={choose} disabled={!!busy}><Text style={styles.buttonText}>ZIP-Beweispaket importieren</Text></Pressable>
        {picked
          ? <Text style={styles.muted}>{picked.name} · {(picked.size / (1024 * 1024)).toFixed(2)} MiB</Text>
          : <Text style={styles.muted}>Eigenes oder fremdes DoiProof-ZIP aus Dateien, Downloads oder einem Messenger wählen (Manifest v1, v2 oder v3).</Text>}
        <View style={styles.switchRow}><Text style={styles.switchLabel}>Kettenstatus online abgleichen</Text><Switch value={online} onValueChange={value => { setOnline(value); setResult(null); }} /></View>
        <Text style={styles.muted}>{online ? 'Paket-Hash und Vorabblock-Hashes werden beim Doichain-MCP-Dienst und bei Blockstream abgefragt. Foto, Standort und Manifest werden nicht gesendet.' : 'Vollständig offline: keine Netzwerkabfrage. Der Bericht belegt dann noch keinen Zeitpunkt.'}</Text>
        <Pressable accessibilityRole="button" style={[styles.secondary, (!picked || !!busy) && styles.disabled]} disabled={!picked || !!busy} onPress={verify}><Text style={styles.secondaryText}>Paket prüfen</Text></Pressable>
      </View>
      {!!busy && <View style={styles.row}><ActivityIndicator color={colors.petrol} /><Text style={styles.message}>{busy}</Text></View>}
      {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
      {result && <>
        <Text style={styles.sectionEyebrow}>02  /  ERGEBNIS</Text>
        <ResultCard result={result} includeLocation={includeLocation} />
        <Text style={styles.sectionEyebrow}>03  /  PDF-PRÜFBERICHT</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>Foto im Bericht</Text><Switch value={includePhoto} onValueChange={setIncludePhoto} /></View>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>Standort im Bericht</Text><Switch value={includeLocation} onValueChange={setIncludeLocation} /></View>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>Kartenausschnitt (OpenStreetMap)</Text><Switch value={includeLocation && includeMap} onValueChange={setIncludeMap} disabled={!includeLocation} /></View>
          {includeLocation && includeMap && <Text style={styles.muted}>Lädt Kartenkacheln von OpenStreetMap. Der Dienst sieht dabei ungefähr den Standort und deine IP-Adresse. Die Karte ist nicht Teil des Beweispakets.</Text>}
          <Text style={styles.muted}>Der Bericht folgt der DoiProof-Designvorlage und enthält im Anhang jeden im Manifest gebundenen Messwert. Ausgeblendete Angaben bleiben im ZIP unverändert enthalten.</Text>
          <Pressable accessibilityRole="button" style={[styles.button, !!busy && styles.disabled]} disabled={!!busy} onPress={share}><Text style={styles.buttonText}>PDF-Prüfbericht erstellen und teilen</Text></Pressable>
        </View>
      </>}
      <Text style={styles.footer}>Die Prüfung bestätigt die Unversehrtheit des Pakets und – online – seine Verankerung. Sie belegt weder Urheberschaft noch Echtheit des Motivs. Gerätezeit, Ort und Sensorwerte sind Angaben des aufnehmenden Geräts.</Text>
    </ScrollView>
  );
}
