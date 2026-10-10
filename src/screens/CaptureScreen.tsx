import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { SENSOR_KEYS, STATUS_TEXT } from '../../core/sensors.mjs';
import { VERSION } from '../../core/version.mjs';
import { createProof, getQuota, Proof, Quota, verifyProof, withConfirmedBlock } from '../doichain';
import { isPending, loadHistory, ProofRecord, proofToRecord, updateHistory } from '../history';
import { upsertRecord } from '../proofRecord';
import { createEvidence, LOCATION_SETTINGS, MetadataSettings, prepareCapture, PRIVATE_SETTINGS, type CapturePreparation } from '../evidence';
import { bundleFileName, buildEvidenceBundle, preserveEvidencePhoto, shareEvidenceBundle } from '../bundle';
import { getPreCaptureAnchors } from '../chainAnchors';
import { appSha256 } from '../platform';
import { loadSettings, saveSettings } from '../settings';
import { mapNote, shareReport, verifyZip } from '../verifier';
import { AboutCard } from '../components/AboutCard';
import { colors, styles } from '../ui/styles';

type Selected = {
  uri: string;
  hash: string;
  photoHash: string;
  manifestHash: string;
  manifest: NonNullable<ProofRecord['manifest']>;
  source: ProofRecord['source'];
  capturedAt?: string;
};

const SENSOR_LABEL: Record<string, string> = {
  accelerometer: 'Beschleunigung', gyroscope: 'Gyroskop', magnetometer: 'Magnetometer',
  compass: 'Kompass', barometer: 'Barometer', light: 'Licht',
};

function statusLabel(status: string): string {
  if (status === 'local') return 'Lokal gesichert';
  if (status === 'submission_unknown') return 'Einreichung unklar';
  if (status === 'confirmed' || status === 'expired') return 'Bestätigt';
  if (status === 'pending') return 'Ausstehend';
  return status || 'Offen';
}

function sensorSummary(manifest: Selected['manifest']): string | null {
  const sensors = manifest.sensors as Record<string, { status?: string }> | undefined;
  if (!sensors) return null;
  return SENSOR_KEYS.map(key => `${SENSOR_LABEL[key]}: ${sensors[key]?.status === 'recorded' ? 'erfasst' : (STATUS_TEXT as Record<string, string>)[sensors[key]?.status ?? 'error'] ?? 'unbekannt'}`).join(' · ');
}

export function CaptureScreen() {
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
  const [reportPhoto, setReportPhoto] = useState(true);
  const [reportLocation, setReportLocation] = useState(false);
  const [reportMap, setReportMap] = useState(true);
  const [reportOnline, setReportOnline] = useState(true);
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

  useEffect(() => {
    loadSettings().then(settings => setAutoSend(settings.autoSend)).catch(() => { /* Voreinstellung bleibt */ });
  }, []);

  function changeAutoSend(value: boolean) {
    setAutoSend(value);
    try { saveSettings({ autoSend: value }); }
    catch { setMessage('Die Einstellung gilt nur bis zum Schließen der App; sie konnte nicht gespeichert werden.'); }
  }

  async function refreshQuota() {
    try { setQuota(await getQuota(key)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Kontingent konnte nicht geladen werden.'); }
  }

  async function submit(item: Selected) {
    setBusy(true);
    setMessage('Hash wird über den Doichain-MCP-Server gesendet …');
    try {
      const proof = await withConfirmedBlock(await createProof(item.hash, key,
        item.capturedAt ? `DoiProof v3; Gerät: ${item.capturedAt}` : 'DoiProof evidence v3'));
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
    let preparation: CapturePreparation | undefined;
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { setMessage('Kamerazugriff wurde nicht erlaubt.'); return; }
      }
      setBusy(true);
      setMessage(metadata.includeSensors && source === 'camera' ? 'Sensoren werden gestartet …' : 'Aufnahme wird vorbereitet …');
      preparation = await prepareCapture(metadata, source);
      // Vorab-Blöcke unmittelbar vor dem Öffnen der Kamera laden, nie nach der Bildauswahl.
      let preCapture;
      if (source === 'camera' && usePreCaptureAnchors) {
        setMessage('Aktuelle BTC- und Doichain-Blöcke werden vor der Aufnahme geladen …');
        try {
          [preCapture] = await Promise.all([getPreCaptureAnchors(), preparation.sensors?.warmUp()]);
        } catch (error) {
          throw new Error(`Die Vorab-Blöcke konnten nicht geladen werden (${error instanceof Error ? error.message : 'unbekannter Fehler'}). `
            + 'Die Kamera wurde nicht geöffnet. Netzverbindung prüfen und erneut versuchen oder „BTC- und Doichain-Block vor Kameraaufnahme“ ausschalten.');
        }
      } else await preparation.sensors?.warmUp();
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false,
      };
      const cameraOpenedAt = new Date().toISOString();
      preparation.sensors?.markCameraOpened();
      const picked = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      preparation.sensors?.markCameraReturned();
      const returnedAt = new Date().toISOString();
      if (picked.canceled || !picked.assets?.[0]) {
        preparation.sensors?.stop();
        setBusy(false);
        setMessage('Aufnahme abgebrochen.');
        return;
      }
      setMessage('SHA-256 wird auf dem Gerät berechnet …');
      const asset = picked.assets[0];
      const photoHash = await appSha256(await new File(asset.uri).bytes());
      const capturedAt = source === 'camera' ? returnedAt : undefined;
      setMessage(metadata.includeLocation || preparation.sensors ? 'Standort, Sensorwerte und Beweispaket werden erfasst …' : 'Beweispaket wird erstellt …');
      const evidence = await createEvidence({
        photoSha256: photoHash, source, capturedAt, cameraOpenedAt: source === 'camera' ? cameraOpenedAt : undefined,
        image: { width: asset.width, height: asset.height, fileSize: asset.fileSize, mimeType: asset.mimeType, fileName: asset.fileName ?? undefined },
        settings: metadata, preCapture, preparation,
      });
      const item: Selected = {
        uri: asset.uri, hash: evidence.evidenceSha256, photoHash, manifestHash: evidence.manifestSha256,
        manifest: evidence.manifest, source, capturedAt,
      };
      const now = new Date().toISOString();
      const id = `${now}-${item.hash.slice(0, 12)}`;
      item.uri = await preserveEvidencePhoto(id, item.uri);
      await storeRecord({
        id, sha256: item.hash, source, createdAt: now, capturedAt,
        status: 'local', lastCheckedAt: now,
        photoSha256: photoHash, manifestSha256: item.manifestHash,
        evidenceProfile: item.manifest.profile, manifest: item.manifest,
        localPhotoUri: item.uri,
      });
      setSelected(item);
      setResult(null);
      const locationNote = item.manifest.location?.status === 'permission_denied' ? ' Standortfreigabe verweigert – im Manifest vermerkt.'
        : item.manifest.location?.status === 'unavailable' ? ' Kein Standort verfügbar – im Manifest vermerkt.' : '';
      setMessage((preCapture
        ? 'Original und Manifest lokal gesichert. Die beiden Vorab-Blöcke sind gebunden.'
        : 'Original und Manifest lokal gesichert. Zum Senden wird nur der Paket-Hash übertragen.') + locationNote);
      setBusy(false);
      if (autoSend) await submit(item);
    } catch (error) {
      preparation?.sensors?.stop();
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

  async function exportReport(record: ProofRecord) {
    if (exportingId) return;
    try {
      setExportingId(record.id);
      setMessage(reportOnline ? 'Beweispaket wird geprüft und online abgeglichen …' : 'Beweispaket wird geprüft …');
      const bytes = await buildEvidenceBundle(record);
      const verification = await verifyZip(bytes, bundleFileName(record), reportOnline);
      if (reportLocation && reportMap) setMessage('Kartenausschnitt wird geladen und PDF-Prüfbericht erstellt …');
      const { mapStatus } = await shareReport(verification, { includePhoto: reportPhoto, includeLocation: reportLocation, includeMap: reportMap });
      setMessage(`PDF-Prüfbericht wurde lokal gespeichert und im Teilen-Dialog angeboten.${mapNote(mapStatus)}`);
    } catch (error) {
      Alert.alert('Prüfbericht konnte nicht erstellt werden', error instanceof Error ? error.message : 'Unbekannter Fehler.');
    } finally {
      setExportingId(null);
    }
  }

  async function exportBundle(record: ProofRecord) {
    if (exportingId) return;
    try {
      setExportingId(`zip-${record.id}`);
      setMessage('Vollständiges Beweispaket wird erstellt …');
      await shareEvidenceBundle(record);
      setMessage('Beweispaket wurde erstellt. Es enthält sensible Originaldaten.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Beweispaket konnte nicht erstellt werden.');
    } finally {
      setExportingId(null);
    }
  }

  const location = selected?.manifest.location;
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Text style={styles.brand}>DOIPROOF  /  VERSION {VERSION}</Text>
        <Text style={styles.title}>Dein Foto.{'\n'}Dein Nachweis.</Text>
        <Text style={styles.lead}>Original, Manifest und Sensorwerte bleiben bei dir. An Doichain gehen nur der Paket-Hash und eine kurze Notiz mit der Aufnahmezeit laut Gerät – beides steht öffentlich und dauerhaft auf der Blockchain.</Text>
        <View style={styles.heroStats}><Text style={styles.heroStat}>◈  {history.length} lokal gesichert</Text><Text style={styles.heroStat}>◎  SHA-256 · Manifest v3</Text></View>
      </View>
      <Text style={styles.sectionEyebrow}>01  /  AUFNAHME VORBEREITEN</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Metadatenprofil</Text>
        <View style={styles.row}>
          <Pressable style={metadata.profile === 'private' ? styles.button : styles.secondary} onPress={() => setMetadata(PRIVATE_SETTINGS)}><Text style={metadata.profile === 'private' ? styles.buttonText : styles.secondaryText}>Privat</Text></Pressable>
          <Pressable style={metadata.profile === 'location' ? styles.button : styles.secondary} onPress={() => setMetadata(LOCATION_SETTINGS)}><Text style={metadata.profile === 'location' ? styles.buttonText : styles.secondaryText}>Standort & Sensoren</Text></Pressable>
          <Pressable style={metadata.profile === 'custom' ? styles.button : styles.secondary} onPress={() => setMetadata({ ...metadata, profile: 'custom' })}><Text style={metadata.profile === 'custom' ? styles.buttonText : styles.secondaryText}>Individuell</Text></Pressable>
        </View>
        {metadata.profile === 'custom' && <>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>GPS, Höhe und Genauigkeit</Text><Switch value={metadata.includeLocation} onValueChange={value => setMetadata(current => ({ ...current, includeLocation: value }))} /></View>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>Bewegung, Kompass, Luftdruck, Licht</Text><Switch value={metadata.includeSensors} onValueChange={value => setMetadata(current => ({ ...current, includeSensors: value }))} /></View>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>Bildformat und Abmessungen</Text><Switch value={metadata.includeImageDetails} onValueChange={value => setMetadata(current => ({ ...current, includeImageDetails: value }))} /></View>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>Betriebssystem und App-Version</Text><Switch value={metadata.includeDevice} onValueChange={value => setMetadata(current => ({ ...current, includeDevice: value }))} /></View>
        </>}
        <Text style={styles.muted}>{metadata.includeLocation || metadata.includeSensors
          ? 'Standort und Sensorwerte (Beschleunigung, Gyroskop, Magnetfeld/Kompass, Luftdruck, Licht) werden während der Aufnahme lokal gemessen und durch den Hash gebunden. Nicht verfügbare oder verweigerte Sensoren werden ausdrücklich vermerkt. Auf der Blockchain stehen nur Hash und kurze Notiz (öffentlich, nicht löschbar).'
          : 'Keine Standort- oder Sensordaten im Manifest. Ortsangaben, die deine Kamera-App selbst ins Foto schreibt, bleiben im Originalfoto (ZIP) erhalten; im PDF-Bericht werden sie entfernt. Auf der Blockchain stehen nur Beweispaket-Hash und kurze Notiz (öffentlich, nicht löschbar).'}</Text>
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
        <Text style={styles.label}>SHA-256 des Metadaten-Manifests (v3)</Text>
        <Text selectable style={styles.hash}>{selected.manifestHash}</Text>
        <Text style={styles.label}>Beweispaket-Hash für Doichain</Text>
        <Text selectable style={styles.hash}>{selected.hash}</Text>
        {selected.capturedAt && <Text style={styles.muted}>Gerätezeit bei Aufnahme: {selected.capturedAt}</Text>}
        {location?.status === 'recorded' && location.latitude !== undefined && location.longitude !== undefined && <>
          <Text style={styles.label}>Erfasster Standort (Geräteangabe)</Text>
          <Text selectable style={styles.hash}>{location.latitude.toFixed(6)}°, {location.longitude.toFixed(6)}°</Text>
          <Text style={styles.muted}>Genauigkeit: {location.accuracy ?? 'nicht erfasst'} m · Messung: {location.measuredAt}{location.mocked ? ' · Gerät meldet simulierten Standort' : ''}</Text>
        </>}
        {location && location.status !== 'recorded' && location.status !== 'not_requested' && <Text style={styles.muted}>Standort: {location.status === 'permission_denied' ? 'Freigabe verweigert' : 'nicht verfügbar'}{location.reason ? ` – ${location.reason}` : ''}</Text>}
        {sensorSummary(selected.manifest) && <>
          <Text style={styles.label}>Sensoren (Geräteangaben)</Text>
          <Text style={styles.muted}>{sensorSummary(selected.manifest)}</Text>
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
        <View style={styles.switchRow}><Text style={styles.switchLabel}>Nach Aufnahme sofort senden</Text><Switch value={autoSend} onValueChange={changeAutoSend} /></View>
        {selected && <View style={styles.row}>
          <Pressable accessibilityRole="button" style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={() => submit(selected)}><Text style={styles.buttonText}>Nachweis anlegen</Text></Pressable>
          <Pressable accessibilityRole="button" style={styles.secondary} disabled={busy} onPress={checkSelected}><Text style={styles.secondaryText}>Status prüfen</Text></Pressable>
        </View>}
      </View>
      {busy && <ActivityIndicator color={colors.petrol} />}
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
        <Text style={styles.label}>PDF-Prüfbericht</Text>
        <View style={styles.switchRow}><Text style={styles.switchLabel}>Kettenstatus online abgleichen</Text><Switch value={reportOnline} onValueChange={setReportOnline} /></View>
        <View style={styles.switchRow}><Text style={styles.switchLabel}>Foto im Bericht</Text><Switch value={reportPhoto} onValueChange={setReportPhoto} /></View>
        <View style={styles.switchRow}><Text style={styles.switchLabel}>Standort im Bericht</Text><Switch value={reportLocation} onValueChange={setReportLocation} /></View>
        <View style={styles.switchRow}><Text style={styles.switchLabel}>Kartenausschnitt (OpenStreetMap)</Text><Switch value={reportLocation && reportMap} onValueChange={setReportMap} disabled={!reportLocation} /></View>
        {reportLocation && reportMap && <Text style={styles.muted}>Lädt beim Erstellen Kartenkacheln von OpenStreetMap. Der Dienst sieht dabei den Standort auf etwa 1 km genau und deine IP-Adresse.</Text>}
        <Text style={styles.muted}>Der Prüfbericht entsteht mit derselben Prüflogik wie der Windows- und Kommandozeilen-Prüfer. Das vollständige ZIP-Beweispaket enthält immer Originalfoto und Manifest. Teile es nur bewusst mit vertrauenswürdigen Empfängern.</Text>
      </View>
      {!history.length && <Text style={styles.muted}>Noch keine Nachweise auf diesem Gerät gespeichert.</Text>}
      {history.map(record => <View key={record.id} style={styles.card}>
        <View style={styles.historyTop}>
          <Text style={styles.label}>{record.source === 'camera' ? 'Kameraaufnahme' : 'Ausgewähltes Foto'}</Text>
          <Text style={[styles.badge, record.status === 'local' ? styles.local : isPending(record) ? styles.pending : styles.confirmed]}>{statusLabel(record.status)}</Text>
        </View>
        <Text style={styles.muted}>{record.status === 'local' ? 'Lokal erstellt' : 'Erstellt'}: {new Date(record.createdAt).toLocaleString()} · {record.manifest?.schema.split('/').pop() ?? 'ohne Manifest'}</Text>
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
          {record.manifest && record.localPhotoUri && <Pressable accessibilityRole="button" disabled={!!exportingId} style={[styles.secondary, !!exportingId && styles.disabled]} onPress={() => exportReport(record)}><Text style={styles.secondaryText}>{exportingId === record.id ? 'Bericht wird erstellt …' : 'Prüfbericht PDF'}</Text></Pressable>}
          {record.manifest && <Pressable accessibilityRole="button" disabled={!!exportingId} style={[styles.secondary, !!exportingId && styles.disabled]} onPress={() => exportBundle(record)}><Text style={styles.secondaryText}>Beweispaket ZIP</Text></Pressable>}
        </View>
      </View>)}
      <AboutCard />
      <Text style={styles.footer}>Das Foto wird nicht hochgeladen. Vorab-Blöcke, Sensorwerte und die selbst gemeldete App-Version sind Indizien für die Erstellung des Pakets, keine Attestierung der App oder der tatsächlichen Aufnahmezeit. Ein altes Foto könnte erneut verwendet werden. Belastbar ist die Verankerung erst nach Bestätigung in einem Doichain-Block.</Text>
    </ScrollView>
  );
}
