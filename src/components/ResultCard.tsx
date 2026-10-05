import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { systemTimeZone } from '../../core/format.mjs';
import { buildReportModel } from '../../core/report-model.mjs';
import type { VerificationResult } from '../verifier';
import { colors, styles } from '../ui/styles';

const THEME = {
  passed: { bg: colors.banner, eyebrow: '#e7b48f', title: '#f5f1e8', accent: '#e7b48f', text: '#dbe5e3' },
  incomplete: { bg: colors.sand, eyebrow: colors.terra, title: colors.banner, accent: colors.terra, text: '#3d4b48' },
  failed: { bg: '#7e2a20', eyebrow: '#f3bfae', title: '#fdf3ef', accent: '#f3bfae', text: '#f7ddd6' },
} as const;

/**
 * Zeigt das Prüfergebnis mit denselben Aussagen wie der PDF-Bericht (gemeinsames Berichtsmodell).
 */
export function ResultCard({ result, includeLocation }: { result: VerificationResult; includeLocation: boolean }) {
  const model = useMemo(() => buildReportModel({
    analysis: result.analysis, online: result.online, fileName: result.fileName,
    timeZone: systemTimeZone(), includePhoto: false, includeLocation,
  }), [result, includeLocation]);
  const theme = THEME[model.outcome as keyof typeof THEME];
  return (
    <View style={styles.card}>
      <View style={[styles.resultBanner, { backgroundColor: theme.bg }]} accessibilityRole="summary">
        <Text style={[styles.resultEyebrow, { color: theme.eyebrow }]}>{model.banner.eyebrow}</Text>
        <Text style={[styles.resultTitle, { color: theme.title }]}>{model.banner.title} <Text style={{ color: theme.accent, fontStyle: 'italic' }}>{model.banner.accent}</Text></Text>
        <Text style={[styles.resultText, { color: theme.text }]}>{model.banner.text}</Text>
      </View>
      <Text style={styles.label}>Auf einen Blick</Text>
      {model.glance.map(row => <View key={row.label} style={styles.glanceRow}>
        <Text style={styles.glanceLabel}>{row.label}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.glanceValue}>{row.value}</Text>
          {!!row.sub && <Text style={styles.small}>{row.sub}</Text>}
        </View>
      </View>)}
      <Text style={styles.label}>Beweiskette</Text>
      {model.chain.map((step, index) => <View key={step.title} style={[styles.chainRow, step.kind === 'failed' && { borderColor: colors.red }]}>
        <View style={styles.chainTop}>
          <Text style={[styles.label, { flex: 1 }]}>{index + 1}. {step.title}</Text>
          <Text style={{ fontWeight: '800', color: step.kind === 'ok' ? colors.petrol : step.kind === 'failed' ? colors.red : colors.muted }}>{step.text}</Text>
        </View>
        <Text selectable numberOfLines={2} style={[styles.hash, { fontSize: 11 }]}>{step.value}</Text>
      </View>)}
      <Text style={styles.label}>Was die Prüfung zeigt</Text>
      {model.tiles.map(tile => <Text key={tile.title} style={styles.muted}>
        {tile.kind === 'proof' ? '■ ' : tile.kind === 'failed' ? '✕ ' : tile.kind === 'hint' || tile.kind === 'warning' ? '□ ' : '– '}
        <Text style={styles.label}>{tile.title}</Text>: {tile.text}
      </Text>)}
      {!!result.online && <Text style={styles.small}>{result.online.source}</Text>}
      <Text style={styles.small}>Paket: {result.fileName} · Bericht Nr. {model.number}</Text>
    </View>
  );
}
