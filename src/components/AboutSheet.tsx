import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
 * Eigener SafeAreaProvider im Modal: Ein Modal rendert in einer eigenen Hierarchie über die
 * volle Höhe und hängt nicht unter dem Provider aus App.tsx. Dessen Messwerte erreichen den
 * Inhalt deshalb nicht, und ein bloßes SafeAreaView bleibt hier wirkungslos — der Inhalt
 * beginnt am oberen Bildschirmrand, auf Geräten mit Aussparung also unter Uhrzeit und
 * Statussymbolen. Der Provider misst das Modal selbst und liefert die Abstände nach.
 */
export function AboutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sectionTitle}>Über diese App</Text>
            <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose}><Text style={styles.secondaryText}>Schließen</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}><AboutCard /></ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
