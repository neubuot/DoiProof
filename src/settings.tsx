import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { APP_VERSION } from './version';
import { MCP_URL } from './doichain';

/**
 * Dieselbe Adresse gehört in den Play-Eintrag. Sie zeigt auf `main` und wird erst gültig,
 * wenn die Datenschutzerklärung dort liegt: Vor der Einreichung muss der Branch gemergt
 * sein, sonst führt der Verweis in der App ins Leere.
 */
export const PRIVACY_URL = 'https://github.com/neubuot/DoiProof/blob/main/docs/DATENSCHUTZ.md';
export const SOURCE_URL = 'https://github.com/neubuot/DoiProof';

async function open(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Link konnte nicht geöffnet werden', url);
  }
}

function LinkButton({ label, url }: { label: string; url: string }) {
  return (
    <Pressable accessibilityRole="link" style={styles.link} onPress={() => void open(url)}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

/**
 * Einstellungen und Rechtliches. Der Verweis auf die Datenschutzerklärung ist Pflicht:
 * Google verlangt ihn im Play-Eintrag und zusätzlich innerhalb der App, sobald
 * personenbezogene oder sensible Daten verarbeitet werden. DoiProof fordert Kamera
 * und genauen Standort an und fällt darunter.
 *
 * Die Schalter der Aufnahme bleiben bewusst im Ablauf, wo sie wirken. Hierher gehören
 * später dauerhaft gesicherte Vorgaben.
 */
export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Einstellungen</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Schließen</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>DATENSCHUTZ</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Was das Gerät verlässt</Text>
            <Text style={styles.body}>
              Das Foto wird nicht hochgeladen. Übertragen werden ausschließlich der SHA-256-Hash des
              Beweispakets und, bei einer Kameraaufnahme, eine kurze als Geräteangabe gekennzeichnete
              Notiz mit der Aufnahmezeit. Standortdaten, Bilddaten und Geräteangaben bleiben lokal und
              sind nur im ZIP-Beweispaket enthalten, das du selbst weitergibst.
            </Text>
            <Text style={styles.body}>
              Ein verankerter Hash steht dauerhaft in einer öffentlichen Blockchain und kann nicht
              gelöscht oder widerrufen werden.
            </Text>
            <LinkButton label="Datenschutzerklärung öffnen" url={PRIVACY_URL} />
          </View>

          <Text style={styles.eyebrow}>ÜBER DOIPROOF</Text>
          <View style={styles.card}>
            <View style={styles.entry}><Text style={styles.label}>Version</Text><Text style={styles.value}>{APP_VERSION}</Text></View>
            <View style={styles.entry}><Text style={styles.label}>Lizenz</Text><Text style={styles.value}>MIT</Text></View>
            <Text style={styles.label}>Verankerungsdienst</Text>
            <Text style={styles.mono}>{MCP_URL}</Text>
            <Text style={styles.muted}>
              Ohne eigenen Schlüssel verankert dieser Dienst bis zu zehn Nachweise je IP-Adresse und
              UTC-Tag. Er trägt den Hash in die Doichain ein und beantwortet die Statusabfragen.
            </Text>
            <LinkButton label="Quellcode und Prüfprogramm auf GitHub" url={SOURCE_URL} />
          </View>

          <Text style={styles.muted}>
            DoiProof stellt keinen qualifizierten elektronischen Zeitstempel aus und ersetzt keine
            Rechtsberatung. Ein verankerter Hash belegt, dass genau diese Dateibytes zum Zeitpunkt der
            Verankerung vorlagen – weder Urheberschaft noch Echtheit des Motivs noch eine verlässliche
            Aufnahmezeit.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#f4f3eb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#172c2b' },
  close: { color: '#156a65', fontWeight: '700' },
  content: { paddingHorizontal: 22, paddingBottom: 48, gap: 14 },
  eyebrow: { color: '#39716a', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginTop: 6 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, gap: 12 },
  entry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { fontWeight: '700', color: '#172c2b' },
  value: { color: '#244d49', fontWeight: '600' },
  body: { color: '#2c403e', fontSize: 14, lineHeight: 21 },
  mono: { fontFamily: 'monospace', color: '#244d49' },
  muted: { color: '#62716e', fontSize: 12, lineHeight: 18 },
  link: { borderColor: '#156a65', borderWidth: 1, borderRadius: 12, padding: 13, alignItems: 'center' },
  linkText: { color: '#156a65', fontWeight: '700' },
});
