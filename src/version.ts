import { version } from '../package.json';

/**
 * Einzige Quelle der App-Version. `package.json` ist maßgeblich; `app.config.js`
 * übernimmt den Wert für den nativen Build, die Oberfläche und das Manifest lesen ihn hier.
 *
 * Die Angabe wandert als Selbstauskunft in das gehashte Beweis-Manifest. Eine zweite,
 * abweichende Fassung würde Beweise mit einer falschen Version ausstatten; deshalb darf
 * die Versionsnummer an keiner weiteren Stelle fest eingetragen werden.
 */
export const APP_VERSION: string = version;
