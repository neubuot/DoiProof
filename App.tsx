import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { StatusBar } from 'expo-status-bar';
import { createProof, getQuota, Proof, Quota, verifyProof, withConfirmedBlock } from './src/doichain';
import { isPending, loadHistory, ProofRecord, proofToRecord, updateHistory } from './src/history';
import { upsertRecord } from './src/proofRecord';
import { shareReceipt } from './src/receipt';
import { createEvidence, LOCATION_SETTINGS, MetadataSettings, PRIVATE_SETTINGS } from './src/evidence';
import { preserveEvidencePhoto, shareEvidenceBundle } from './src/bundle';
import { getPreCaptureAnchors } from './src/chainAnchors';

type Selected = {
  uri: string;
  hash: string;
  photoHash: string;
  manifestHash: string;
  manifest: NonNullable<ProofRecord['manifest']>;
  source: ProofRecord['source'];
  capturedAt?: string;
};

function statusLabel(status: string): string {
  if (status === 'local') return 'Lokal gesichert';
  if (status === 'submission_unknown') return 'Einreichung unklar';
  if (status === 'confirmed' || status === 'expired') return 'Bestätigt';
  if (status === 'pending') return 'Ausstehend';
  return status || 'Offen';
}

export default function App() {
  return <SafeAreaProvider><ProofScreen /></SafeAreaProvider>;
}

function ProofScreen() {
  const [selected, setSelected] = useState<Selected | null>(null);
  const [key, setKey] = useState('');
  const [autoSend, setAutoSend] = useState(true);
  const [usePreCaptureAnchors, setUsePreCaptureAnchors] = useState(true);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [result, setResult] = useState<Proof | null>(null);
  const [history, setHistory] = useState<ProofRecord[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [metadata, setMetadata] = useState<MetadataSettings>(PRIVATE_SETTINGS);
  const [includeSensitiveInPdf, setIncludeSensitiveInPdf] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const historyRef = useRef<ProofRecord[]>([]);
  const refreshingRef = useRef(false);

  const storeRecord = useCallback(async (record: ProofRecord) => {
    const next = await updateHistory(current => upsertRecord(current, record));
    historyRef.current = next;
    setHistory(next);
  }, []);

  const refreshPending = useCallback(async (showMessage = false) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshingHistory(true);
    try {
      const current = await loadHistory();
      const pending = current.filter(isPending);
      if (!pending.length) {
        historyRef.current = current;
        setHistory(current);
        if (showMessage) setMessage('Keine offenen Einreichungen. Lokal gesicherte Entwürfe werden nicht automatisch gesendet.');
        return;
      }
      const proofs = new Map<string, Proof>();
      await Promise.all(pending.map(async record => {
        try { proofs.set(record.sha256, await withConfirmedBlock(await verifyProof(record.sha256))); }
        catch { /* An outage must not discard a saved record. */ }
      }));
      if (proofs.size) {
        const updated = await updateHistory(records => records.map(record => {
          const proof = proofs.get(record.sha256);
          return proof && isPending(record)
            ? proofToRecord(record.sha256, record.source, proof, record.capturedAt, record) : record;
        }));
        historyRef.current = updated;
        setHistory(updated);
      }
      if (showMessage) setMessage(proofs.size === pending.length ? 'Nachweisverlauf wurde aktualisiert.' : 'Einige Statusabfragen waren nicht erreichbar. Gespeicherte Nachweise bleiben erhalten.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Verlauf konnte nicht gelesen werden.');
    } finally {
      refreshingRef.current = false;
      setRefreshingHistory(false);
    }
  }, []);

  useEffect(() => {
    getQuota().then(setQuota).catch(() => setQuota(null));
    loadHistory().then(records => { historyRef.current = records; setHistory(records); return refreshPending(); })
      .catch(error => setMessage(error instanceof Error ? error.message : 'Verlauf konnte nicht gelesen werden.'));
    const timer = setInterval(() => { void refreshPending(); }, 60_000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshPending();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [refreshPending]);

  async function refreshQuota() {
    try { setQuota(await getQuota(key)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Kontingent konnte nicht geladen werden.'); }
  }

  async function submit(item: Selected) {
    setBusy(true);
    setMessage('Hash wird über den Doichain-MCP-Server gesendet …');
    try {
      const proof = await withConfirmedBlock(await createProof(item.hash, key,
        item.capturedAt ? `DoiProof v2; Gerät: ${item.capturedAt}` : 'DoiProof evidence v2'));
      setResult(proof);
      const existing = historyRef.current.find(record => record.sha256 === item.hash);
      await storeRecord(proofToRecord(item.hash, item.source, proof, item.capturedAt, existing));
      getQuota(key).then(setQuota).catch(() => setQuota(null));
      setMessage('Einreichung angenommen und im Nachweisverlauf gespeichert.');
    } catch (error) {
      const existing = historyRef.current.find(record => record.sha256 === item.hash);
      if (existing?.status === 'local') {
        try { await storeRecord({ ...existing, status: 'submission_unknown' }); }
        catch { /* The original local record remains in the file. */ }
      }
      setMessage('Einreichung nicht bestätigt. Original und Manifest sind lokal gesichert. Status prüfen oder später erneut senden. ' + (error instanceof Error ? error.message : ''));
    } finally {
      setBusy(false);
    }
  }

  async function choose(source: ProofRecord['source']) {
    if (busy) return;
    setMessage('');
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setMessage('Kamerazugriff wurde nicht erlaubt.'); return; }
      }
      // Fetch immediately before opening the camera, never after the image has been selected.
      let preCapture;
      if (source === 'camera' && usePreCaptureAnchors) {
        setBusy(true);
        setMessage('Aktuelle BTC- und Doichain-Blöcke werden vor der Aufnahme geladen …');
        preCapture = await getPreCaptureAnchors();
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false,
      };
      const picked = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (picked.canceled || !picked.assets?.[0]) { setBusy(false); setMessage('Aufnahme abgebrochen.'); return; }
      setBusy(true);
      setMessage('SHA-256 wird auf dem Gerät berechnet …');
      const asset = picked.assets[0];
      const bytes = await new File(asset.uri).bytes();
      const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
      const photoHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      const capturedAt = source === 'camera' ? new Date().toISOString() : undefined;
      setMessage(metadata.includeLocation ? 'GPS-Position und Beweispaket werden ermittelt …' : 'Beweispaket wird erstellt …');
      const evidence = await createEvidence(photoHash, source, capturedAt, {
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
        fileName: asset.fileName ?? undefined,
      }, metadata, preCapture);
      const item: Selected = {
        uri: asset.uri,
        hash: evidence.evidenceSha256,
        photoHash,
        manifestHash: evidence.manifestSha256,
        manifest: evidence.manifest,
        source,
        capturedAt,
      };
      const now = new Date().toISOString();
      const id = `${now}-${item.hash.slice(0, 12)}`;
      const localPhotoUri = await preserveEvidencePhoto(id, item.uri);
      item.uri = localPhotoUri;
      await storeRecord({
        id, sha256: item.hash, source, createdAt: now, capturedAt,
        status: 'local', lastCheckedAt: now,
        photoSha256: photoHash, manifestSha256: item.manifestHash,
        evidenceProfile: item.manifest.profile, manifest: item.manifest,
        localPhotoUri,
      });
      setSelected(item);
      setResult(null);
      setMessage(preCapture
        ? 'Original und Manifest lokal gesichert. Die beiden Vorab-Blöcke sind gebunden.'
        : 'Original und Manifest lokal gesichert. Zum Senden wird nur der Paket-Hash übertragen.');
      setBusy(false);
      if (autoSend) await submit(item);
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : 'Foto konnte nicht verarbeitet werden.');
    }
  }

  async function checkSelected() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const proof = await withConfirmedBlock(await verifyProof(selected.hash));
      setResult(proof);
      const existing = historyRef.current.find(item => item.sha256 === selected.hash);
      await storeRecord(proofToRecord(selected.hash, selected.source, proof, selected.capturedAt, existing));
      setMessage(proof.status === 'confirmed' || proof.status === 'expired' ? 'Nachweis auf der Doichain gefunden.' : proof.status === 'pending' ? 'Nachweis ist noch ausstehend.' : 'Noch kein bestätigter Nachweis gefunden.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Prüfung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  async function retryRecord(record: ProofRecord) {
    if (busy || !record.manifest || !record.localPhotoUri || !record.photoSha256 || !record.manifestSha256) return;
    const item: Selected = {
      uri: record.localPhotoUri, hash: record.sha256,
      photoHash: record.photoSha256, manifestHash: record.manifestSha256,
      manifest: record.manifest, source: record.source, capturedAt: record.capturedAt,
    };
    setSelected(item);
    await submit(item);
  }

  async function exportReceipt(record: ProofRecord) {
    if (exportingId) return;
    try {
      setExportingId(record.id);
      await shareReceipt(record, includeSensitiveInPdf);
      setMessage('PDF-Beleg wurde lokal gespeichert und im Teilen-Dialog angeboten.');
    } catch (error) {
      Alert.alert('PDF-Beleg konnte nicht geteilt werden', error instanceof Error ? error.message : 'Unbekannter Fehler.');
    } finally {
      setExportingId(null);
    }
  }

  async function exportBundle(record: ProofRecord) {
    try {
      setMessage('Vollständiges Beweispaket wird erstellt …');
      await shareEvidenceBundle(record);
      setMessage('Beweispaket wurde erstellt. Es enthält sensible Originaldaten.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Beweispaket konnte nicht erstellt werden.');
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.brand}>DOIPROOF  /  ANDROID 0.5</Text>
          <Text style={styles.title}>Dein Foto.{'\n'}Dein Nachweis.</Text>
          <Text style={styles.lead}>Original und Manifest bleiben bei dir. An Doichain gehen nur der Paket-Hash und gegebenenfalls eine kurze Gerätenotiz.</Text>
          <View style={styles.heroStats}><Text style={styles.heroStat}>◈  {history.length} lokal gesichert</Text><Text style={styles.heroStat}>◎  SHA-256</Text></View>
        </View>
        <Text style={styles.sectionEyebrow}>01  /  AUFNAHME VORBEREITEN</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Metadatenprofil</Text>
          <View style={styles.row}>
            <Pressable style={metadata.profile === 'private' ? styles.button : styles.secondary} onPress={() => setMetadata(PRIVATE_SETTINGS)}><Text style={metadata.profile === 'private' ? styles.buttonText : styles.secondaryText}>Privat</Text></Pressable>
            <Pressable style={metadata.profile === 'location' ? styles.button : styles.secondary} onPress={() => setMetadata(LOCATION_SETTINGS)}><Text style={metadata.profile === 'location' ? styles.buttonText : styles.secondaryText}>Standortnachweis</Text></Pressable>
            <Pressable style={metadata.profile === 'custom' ? styles.button : styles.secondary} onPress={() => setMetadata({ ...metadata, profile: 'custom' })}><Text style={metadata.profile === 'custom' ? styles.buttonText : styles.secondaryText}>Individuell</Text></Pressable>
          </View>
          {metadata.profile === 'custom' && <>
            <View style={styles.switchRow}><Text style={styles.switchLabel}>GPS, Höhe und Genauigkeit</Text><Switch value={metadata.includeLocation} onValueChange={value => setMetadata(current => ({ ...current, includeLocation: value }))} /></View>
            <View style={styles.switchRow}><Text style={styles.switchLabel}>Bildformat und Abmessungen</Text><Switch value={metadata.includeImageDetails} onValueChange={value => setMetadata(current => ({ ...current, includeImageDetails: value }))} /></View>
            <View style={styles.switchRow}><Text style={styles.switchLabel}>Betriebssystem und App-Version</Text><Switch value={metadata.includeDevice} onValueChange={value => setMetadata(current => ({ ...current, includeDevice: value }))} /></View>
          </>}
          <Text style={styles.muted}>{metadata.includeLocation ? 'Der genaue Standort wird lokal im Beweispaket gespeichert und durch dessen Hash gebunden. Auf der Blockchain stehen weiterhin nur Hash und kurze Notiz.' : 'Keine Standortdaten. Auf der Blockchain stehen nur Beweispaket-Hash und kurze Notiz.'}</Text>
        </View>
        <View style={styles.row}>
          <Pressable accessibilityRole="button" style={styles.button} onPress={() => choose('camera')} disabled={busy}><Text style={styles.buttonText}>Foto aufnehmen</Text></Pressable>
          <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => choose('library')} disabled={busy}><Text style={styles.secondaryText}>Foto wählen</Text></Pressable>
        </View>
        <View style={styles.card}>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>BTC- und Doichain-Block vor Kameraaufnahme</Text><Switch value={usePreCaptureAnchors} onValueChange={setUsePreCaptureAnchors} disabled={busy} /></View>
          <Text style={styles.muted}>Standardmäßig aktiv. Bei Netzwerkfehlern startet die Kamera erst, wenn du es erneut versuchst oder diese Option ausschaltest. Gilt nicht für bereits gespeicherte Fotos.</Text>
        </View>
        {selected && <View style={styles.card}>
          <Image source={{ uri: selected.uri }} style={styles.preview} resizeMode="contain" />
          <Text style={styles.label}>SHA-256 des Originalfotos</Text>
          <Text selectable style={styles.hash}>{selected.photoHash}</Text>
          <Text style={styles.label}>SHA-256 des Metadaten-Manifests</Text>
          <Text selectable style={styles.hash}>{selected.manifestHash}</Text>
          <Text style={styles.label}>Beweispaket-Hash für Doichain</Text>
          <Text selectable style={styles.hash}>{selected.hash}</Text>
          {selected.capturedAt && <Text style={styles.muted}>Gerätezeit bei Aufnahme: {selected.capturedAt}</Text>}
          {selected.manifest.location && <>
            <Text style={styles.label}>Erfasster Standort (Geräteangabe)</Text>
            <Text selectable style={styles.hash}>{selected.manifest.location.latitude.toFixed(6)}°, {selected.manifest.location.longitude.toFixed(6)}°</Text>
            <Text style={styles.muted}>Genauigkeit: {selected.manifest.location.accuracy ?? 'nicht erfasst'} m · Messung: {selected.manifest.location.measuredAt}{selected.manifest.location.mocked ? ' · Gerät meldet simulierten Standort' : ''}</Text>
          </>}
          {selected.manifest.preCapture && <>
            <Text style={styles.label}>Vorab-Block BTC · Höhe {selected.manifest.preCapture.bitcoin.height}</Text>
            <Text selectable style={styles.hash}>{selected.manifest.preCapture.bitcoin.hash}</Text>
            <Text style={styles.label}>Vorab-Block DOI · Höhe {selected.manifest.preCapture.doichain.height}</Text>
            <Text selectable style={styles.hash}>{selected.manifest.preCapture.doichain.hash}</Text>
          </>}
        </View>}
        <Text style={styles.sectionEyebrow}>02  /  EINREICHUNG</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Tageskontingent</Text>
          <Text>{quota ? quota.unlimited ? 'Mit eigenem Schlüssel: unbegrenzt' : `${quota.remaining_for_this_ip ?? '?'} von ${quota.limit_per_ip_per_day ?? 10} für diese IP übrig · ${quota.remaining_all_users ?? '?'} insgesamt übrig (UTC-Tag)` : 'Kontingent noch nicht geladen'}</Text>
          <Pressable accessibilityRole="button" onPress={refreshQuota}><Text style={styles.secondaryText}>Kontingent aktualisieren</Text></Pressable>
          <Text style={styles.label}>Eigener PoE- oder Write-Schlüssel (optional)</Text>
          <TextInput value={key} onChangeText={setKey} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Ohne Schlüssel: kostenloses Kontingent" style={styles.input} accessibilityLabel="Doichain API-Schlüssel" />
          <Text style={styles.muted}>Ohne Schlüssel: bis zu 10 Nachweise je IP und UTC-Tag, insgesamt höchstens 200 pro Tag. Ein eigener Schlüssel bleibt nur in dieser App-Sitzung im Speicher und wird an den MCP-Server gesendet.</Text>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>Nach Aufnahme sofort senden</Text><Switch value={autoSend} onValueChange={setAutoSend} /></View>
          {selected && <View style={styles.row}>
            <Pressable accessibilityRole="button" style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={() => submit(selected)}><Text style={styles.buttonText}>Nachweis anlegen</Text></Pressable>
            <Pressable accessibilityRole="button" style={styles.secondary} disabled={busy} onPress={checkSelected}><Text style={styles.secondaryText}>Status prüfen</Text></Pressable>
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nachweisverlauf</Text>
          <Pressable accessibilityRole="button" disabled={refreshingHistory} onPress={() => refreshPending(true)}><Text style={styles.secondaryText}>{refreshingHistory ? 'Prüfe …' : 'Offene prüfen'}</Text></Pressable>
        </View>
        <View style={styles.card}>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>Sensible Metadaten im PDF zeigen</Text><Switch value={includeSensitiveInPdf} onValueChange={setIncludeSensitiveInPdf} /></View>
          <Text style={styles.muted}>Das vollständige ZIP-Beweispaket enthält immer Originalfoto und Manifest. Teile es nur bewusst mit vertrauenswürdigen Empfängern.</Text>
        </View>
        {!history.length && <Text style={styles.muted}>Noch keine Nachweise auf diesem Gerät gespeichert.</Text>}
        {history.map(record => <View key={record.id} style={styles.card}>
          <View style={styles.historyTop}>
            <Text style={styles.label}>{record.source === 'camera' ? 'Kameraaufnahme' : 'Ausgewähltes Foto'}</Text>
            <Text style={[styles.badge, record.status === 'local' ? styles.local : isPending(record) ? styles.pending : styles.confirmed]}>{statusLabel(record.status)}</Text>
          </View>
          <Text style={styles.muted}>{record.status === 'local' ? 'Lokal erstellt' : 'Erstellt'}: {new Date(record.createdAt).toLocaleString()}</Text>
          {record.status === 'local' && <Text style={styles.muted}>Original und Manifest sind lokal gesichert. Dieser Hash wurde noch nicht eingereicht.</Text>}
          {record.status === 'submission_unknown' && <Text style={styles.muted}>Die Serverantwort blieb aus. Der Status wird geprüft; du kannst später erneut senden.</Text>}
          <Text selectable numberOfLines={3} style={styles.hash}>{record.sha256}</Text>
          {record.txid && <Text selectable numberOfLines={2} style={styles.hash}>TX: {record.txid}</Text>}
          {record.blockTimeUtc && <Text>Blockzeit (UTC): {record.blockTimeUtc}</Text>}
          {record.blockHeight !== undefined && <Text>Bestätigungsblock: {record.blockHeight}</Text>}
          {record.blockHash && <Text selectable style={styles.hash}>Block-Hash: {record.blockHash}</Text>}
          <View style={styles.row}>
            {(record.status === 'local' || record.status === 'submission_unknown' || record.status === 'not_found')
              && record.manifest && record.localPhotoUri && <Pressable accessibilityRole="button" disabled={busy} style={[styles.button, busy && styles.disabled]} onPress={() => retryRecord(record)}><Text style={styles.buttonText}>Jetzt senden</Text></Pressable>}
            <Pressable accessibilityRole="button" disabled={!!exportingId} style={[styles.secondary, exportingId === record.id && styles.disabled]} onPress={() => exportReceipt(record)}><Text style={styles.secondaryText}>{exportingId === record.id ? 'PDF wird erstellt …' : 'PDF-Beleg'}</Text></Pressable>
            {record.manifest && <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => exportBundle(record)}><Text style={styles.secondaryText}>Beweispaket ZIP</Text></Pressable>}
          </View>
        </View>)}
        <Text style={styles.footer}>Das Foto wird nicht hochgeladen. Die Vorab-Blöcke und die selbst gemeldete App-Version sind Indizien für die Erstellung des Pakets, keine Attestierung der App oder der tatsächlichen Aufnahmezeit. Ein altes Foto könnte erneut verwendet werden. Belastbar ist die Verankerung erst nach Bestätigung in einem Doichain-Block.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f3eb' }, content: { padding: 22, paddingTop: 20, paddingBottom: 54, gap: 18 },
  hero: { backgroundColor: '#123739', borderRadius: 24, padding: 26, gap: 15 },
  brand: { color: '#abdac3', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { fontSize: 38, lineHeight: 43, fontWeight: '700', color: '#f4f3eb' },
  lead: { fontSize: 14, lineHeight: 22, color: '#c4dbd0' },
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  heroStat: { color: '#e7d0a5', fontSize: 11, fontWeight: '700', borderWidth: 1, borderColor: '#45716c', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  sectionEyebrow: { color: '#39716a', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginTop: 7 },
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: '#172c2b' },
  historyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  badge: { overflow: 'hidden', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, fontSize: 12, fontWeight: '700' },
  pending: { backgroundColor: '#fff0c2', color: '#725400' }, confirmed: { backgroundColor: '#dcefe9', color: '#145c4f' },
  local: { backgroundColor: '#e7ece8', color: '#345e57' },
});
