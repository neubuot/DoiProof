/** Dauerhafte Einstellungen der App (plattformneutral, ohne Datei-API; Speichern in settings.ts). */
export type AppSettings = {
  /** Nach der Aufnahme sofort verankern (öffentlich und dauerhaft auf der Blockchain). */
  autoSend: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = { autoSend: true };

/** Liest gespeicherte Einstellungen; Unbekanntes oder Beschädigtes fällt auf die Voreinstellung zurück. */
export function parseSettings(text: string): AppSettings {
  try {
    const value: unknown = JSON.parse(text);
    const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return { autoSend: typeof record.autoSend === 'boolean' ? record.autoSend : DEFAULT_SETTINGS.autoSend };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
