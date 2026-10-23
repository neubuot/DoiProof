import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { AboutCard } from './AboutCard';
import { styles } from '../ui/styles';

/**
 * „Über diese App“ als eigenes Fenster.
 *
 * Version, Update-Prüfung, Datenschutzerklärung und Impressum standen zuvor am Ende des
 * Aufnahmeablaufs, hinter dem gesamten Nachweisverlauf. Google verlangt den Verweis auf die
 * Datenschutzerklärung innerhalb der App; erreichbar ist er nur, wenn er nicht erst nach
 * langem Blättern erscheint.
 */
export function AboutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sectionTitle}>Über diese App</Text>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose}><Text style={styles.secondaryText}>Schließen</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}><AboutCard /></ScrollView>
      </View>
    </Modal>
  );
}
