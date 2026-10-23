import { File, Paths } from 'expo-file-system';
import { AppSettings, DEFAULT_SETTINGS, parseSettings } from './appSettings';

const settingsFile = new File(Paths.document, 'doiproof-settings.json');

export async function loadSettings(): Promise<AppSettings> {
  if (!settingsFile.exists) return { ...DEFAULT_SETTINGS };
  return parseSettings(await settingsFile.text());
}

export function saveSettings(settings: AppSettings): void {
  settingsFile.write(JSON.stringify(settings));
}
