import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AboutCard } from './AboutCard';
import { styles } from '../ui/styles';

/**
 * „Über diese App“ als eigenes Fenster.
 *
 * Version, Update-Prüfung, Datenschutzerklärung und Impressum standen zuvor am Ende des
 * Aufnahmeablaufs, hinter dem gesamten Nachweisverlauf. Google verlangt den Verweis auf die
 * Datenschutzerklärung innerhalb der App; erreichbar ist er nur, wenn er nicht erst nach
 * langem Blättern erscheint.
 *
 * Eigenes SafeAreaView: Ein Modal hängt nicht unter dem SafeAreaView aus App.tsx, sondern
 * rendert in einer eigenen Hierarchie über die volle Höhe. Ohne diese Zeile beginnt der Inhalt
 * am oberen Bildschirmrand, und auf Geräten mit Aussparung liegt die Kopfzeile unter Uhrzeit
 * und Statussymbolen.
 */
export function AboutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sectionTitle}>Über diese App</Text>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose}><Text style={styles.secondaryText}>Schließen</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}><AboutCard /></ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
