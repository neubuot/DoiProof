import { File, Paths } from 'expo-file-system';
import { DEFAULT_SETTINGS, parseSettings, StoredSettings } from './settingsModel';

const settingsFile = new File(Paths.document, 'doiproof-settings.json');

/**
 * Gespeicherte Vorgaben lesen. Jeder Fehler endet bei den Vorgabewerten: Eine fehlende
 * oder beschädigte Datei darf den Start nicht verhindern, und „Privat“ ist der sichere
 * Rückfall, weil in diesem Profil kein Standort angefordert wird.
 */
export async function loadSettings(): Promise<StoredSettings> {
  try {
    if (!settingsFile.exists) return DEFAULT_SETTINGS;
    return parseSettings(JSON.parse(await settingsFile.text()));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Vorgaben sichern. Ein Schreibfehler bleibt folgenlos für die laufende Sitzung: Die
 * Auswahl gilt weiter, nur der nächste Start beginnt wieder mit den Vorgabewerten.
 */
export async function saveSettings(settings: StoredSettings): Promise<void> {
  try {
    settingsFile.write(JSON.stringify(settings, null, 2));
  } catch {
    // Die Vorgaben sind keine Beweisdaten; ein Fehlschlag darf die Bedienung nicht unterbrechen.
  }
}
