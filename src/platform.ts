import { Asset } from 'expo-asset';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { toHex } from '../core/util.mjs';
import type { FontBytes } from '../core/report-pdf.mjs';

/** SHA-256 über native Plattformfunktionen (expo-crypto); gleiche Signatur wie im Node-Prüfer. */
export async function appSha256(bytes: Uint8Array): Promise<string> {
  return toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes as unknown as BufferSource));
}

const FONT_MODULES: Record<keyof FontBytes, number> = {
  serif: require('../assets/fonts/Fraunces-SemiBold.ttf'),
  serifItalic: require('../assets/fonts/Fraunces-Italic.ttf'),
  sans: require('../assets/fonts/IBMPlexSans-Regular.ttf'),
  sansBold: require('../assets/fonts/IBMPlexSans-SemiBold.ttf'),
  mono: require('../assets/fonts/IBMPlexMono-Regular.ttf'),
  monoMedium: require('../assets/fonts/IBMPlexMono-Medium.ttf'),
};

let fontCache: Promise<FontBytes> | null = null;

/** Lädt die eingebetteten Berichtsschriften aus dem App-Bundle (ohne Netzwerk). */
export function loadReportFonts(): Promise<FontBytes> {
  fontCache ??= (async () => {
    const entries = await Promise.all(Object.entries(FONT_MODULES).map(async ([key, module]) => {
      const asset = Asset.fromModule(module);
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error(`Schrift ${key} ist im App-Bundle nicht verfügbar.`);
      return [key, await new File(asset.localUri).bytes()] as const;
    }));
    return Object.fromEntries(entries) as unknown as FontBytes;
  })().catch(error => { fontCache = null; throw error; });
  return fontCache;
}
