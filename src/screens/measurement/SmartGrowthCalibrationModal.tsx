import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  InlineAlert,
  PrimaryButton,
  Screen,
  SegmentedControl,
  StatusPill,
  TextField,
} from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';
import { useDeviceSession } from '../../features/device/useDeviceSession';
import { getSmartGrowthDeviceInfo, type SmartGrowthCalibrationState } from '../../features/device/smartGrowth';
import { getRegisteredDevice } from '../../features/device/deviceRegistry';
import {
  CHECK_READINGS_COUNT,
  DEFAULT_CALIBRATION_TOLERANCES,
  REFERENCE_RANGES,
  computeCheckStats,
  createBatchId,
  describeCheck,
  parseReferenceInput,
  toleranceFor,
  unitFor,
  type CalibrationKind,
  type CalibrationMeasure,
  type CalibrationTolerances,
  type CheckStats,
  type DeviceCalibrationRowInput,
  type DeviceCalibrationValues,
} from '../../features/device/calibration';
import {
  collectStableReading,
  hasSmartGrowthCalibrationSupport,
  readSmartGrowthCalibration,
  runSmartGrowthCalibration,
  type CalibrationAction,
} from '../../features/device/smartGrowthCalibration';
import { fetchCalibrationTolerances, insertDeviceCalibration } from '../../services/auth';

// "Cek akurasi & kalibrasi" for a connected SmartGrowth station. The main job is
// to measure how far off the device is (accuracy check against a known
// reference); adjusting the device is optional and followed by a re-check.
// Every check and every calibration command is logged (best-effort).

type SmartGrowthCalibrationModalProps = {
  visible: boolean;
  onClose: () => void;
};

type CheckResult = {
  key: string;
  measure: CalibrationMeasure;
  reference: number;
  readings: number[];
  stats: CheckStats;
  /** Check made after an adjustment in this session. */
  afterAdjustment: boolean;
};

type AdjustResult = {
  label: string;
  ok: boolean;
  message: string;
  before: SmartGrowthCalibrationState | null;
  after: SmartGrowthCalibrationState | null;
};

const MEASURE_OPTIONS = [
  { value: 'weight', label: 'Berat' },
  { value: 'height', label: 'Tinggi' },
] as const;

const RESULT_MESSAGES: Record<string, string> = {
  ok: 'Berhasil.',
  hx711_not_responding: 'Sensor berat (HX711) tidak merespons. Periksa kabel timbangan.',
  no_load: 'Beban acuan tidak terdeteksi. Lakukan Tare dulu, lalu letakkan beban acuan.',
  bad_argument: 'Nilai acuan tidak valid.',
  height_no_reading: 'Sensor tinggi tidak memberi bacaan stabil. Pastikan papan kepala terbaca.',
  platform_not_empty: 'Timbangan belum kosong.',
  no_height_sensor: 'Alat ini tidak punya sensor tinggi.',
  busy: 'Alat masih memproses perintah sebelumnya. Tunggu sebentar lalu coba lagi.',
  unknown_command: 'Firmware alat tidak mengenal perintah ini. Perbarui firmware.',
  timeout: 'Alat tidak menjawab. Coba lagi.',
  write_failed: 'Perintah gagal dikirim ke alat.',
  not_connected: 'Alat tidak terhubung.',
};

const KIND_BY_ACTION: Record<CalibrationAction['type'], CalibrationKind> = {
  tare: 'tare',
  weight: 'adjust_weight',
  height: 'adjust_height',
  reset: 'reset',
};

const SAVE_FAILED_NOTICE =
  'Hasil belum tersimpan ke server (offline atau tidak ada akses). Hasil di layar tetap berlaku.';

function toValues(state: SmartGrowthCalibrationState | null): DeviceCalibrationValues | null {
  return state
    ? { zeroOffset: state.zeroOffset, calFactor: state.calFactor, heightOffsetCm: state.heightOffsetCm }
    : null;
}

function formatFactor(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '-';
}

function formatValue(measure: CalibrationMeasure, value: number) {
  return `${value.toFixed(measure === 'weight' ? 2 : 1)} ${unitFor(measure)}`;
}

export function SmartGrowthCalibrationModal({ visible, onClose }: SmartGrowthCalibrationModalProps) {
  const insets = useSafeAreaInsets();
  const session = useDeviceSession();
  const bleId = session.connectedDeviceId;

  const [measure, setMeasure] = useState<CalibrationMeasure>('weight');
  const [referenceText, setReferenceText] = useState('');
  const [tolerances, setTolerances] = useState<CalibrationTolerances>(DEFAULT_CALIBRATION_TOLERANCES);
  const [batchId, setBatchId] = useState(createBatchId);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState<number[]>([]);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [calSupported, setCalSupported] = useState<boolean | null>(null);
  const [calState, setCalState] = useState<SmartGrowthCalibrationState | null>(null);
  const [adjusting, setAdjusting] = useState<CalibrationAction['type'] | null>(null);
  const [adjustResult, setAdjustResult] = useState<AdjustResult | null>(null);
  const [adjustedThisSession, setAdjustedThisSession] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const cancelRef = useRef({ cancelled: false });

  // Fresh session per opening: new batch, tolerances, device calibration state.
  useEffect(() => {
    if (!visible) {
      cancelRef.current.cancelled = true;
      return;
    }
    cancelRef.current = { cancelled: false };
    setBatchId(createBatchId());
    setResults([]);
    setProgress([]);
    setCheckError(null);
    setAdjustResult(null);
    setAdjustedThisSession(false);
    setSaveNotice(null);
    let active = true;
    fetchCalibrationTolerances().then(value => active && setTolerances(value));
    hasSmartGrowthCalibrationSupport().then(async supported => {
      if (!active) {
        return;
      }
      setCalSupported(supported);
      if (supported) {
        const state = await readSmartGrowthCalibration();
        if (active) {
          setCalState(state);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [visible]);

  const deviceRow = useCallback(() => {
    const id = bleId ?? '';
    const registered = getRegisteredDevice(id);
    return {
      bleId: id,
      deviceId: registered?.id ?? null,
      deviceKey: registered?.deviceKey ?? null,
      deviceName: session.connectedDeviceLabel ?? session.connectedDeviceName,
      firmwareVersion: getSmartGrowthDeviceInfo(id)?.firmwareVersion ?? null,
    };
  }, [bleId, session.connectedDeviceLabel, session.connectedDeviceName]);

  // Best-effort log: a failure never affects the calibration result on screen.
  const saveRow = useCallback(
    (row: Omit<DeviceCalibrationRowInput, 'bleId' | 'deviceId' | 'deviceKey' | 'deviceName' | 'batchId'>) => {
      insertDeviceCalibration({ ...deviceRow(), batchId, ...row })
        .then(id => {
          if (!id) {
            setSaveNotice(SAVE_FAILED_NOTICE);
          }
        })
        .catch(() => setSaveNotice(SAVE_FAILED_NOTICE));
    },
    [batchId, deviceRow],
  );

  const reference = parseReferenceInput(referenceText);
  const range = REFERENCE_RANGES[measure];
  const referenceError =
    referenceText.trim().length === 0
      ? null
      : reference === null
        ? 'Isi angka, mis. 10 atau 10,5.'
        : reference < range.min || reference > range.max
          ? `Alat hanya membaca ${range.min}–${range.max} ${unitFor(measure)}.`
          : null;
  const referenceValid = reference !== null && referenceError === null;
  const tolerance = toleranceFor(measure, tolerances);
  const busy = checking || adjusting !== null;
  const latestForMeasure = [...results].reverse().find(item => item.measure === measure) ?? null;
  const needsAdjustment = latestForMeasure !== null && !latestForMeasure.stats.withinTolerance;

  const runCheck = async () => {
    if (!referenceValid || reference === null || busy) {
      return;
    }
    const signal = { cancelled: false };
    cancelRef.current = signal;
    setChecking(true);
    setCheckError(null);
    setProgress([]);
    const readings: number[] = [];
    let attempts = 0;
    while (readings.length < CHECK_READINGS_COUNT && attempts < CHECK_READINGS_COUNT + 3) {
      attempts += 1;
      const value = await collectStableReading(measure, signal);
      if (signal.cancelled) {
        break;
      }
      if (value === null) {
        break;
      }
      readings.push(value);
      setProgress([...readings]);
    }
    setChecking(false);
    if (signal.cancelled) {
      return;
    }
    const stats = computeCheckStats(readings, reference, tolerance);
    if (!stats || readings.length < 2) {
      setCheckError(
        measure === 'weight'
          ? 'Tidak ada bacaan stabil dari alat. Pastikan beban acuan (min. 2 kg) diam di tengah timbangan.'
          : 'Tidak ada bacaan tinggi stabil. Pastikan papan kepala menempel di balok acuan dan ada beban ≥ 2 kg di timbangan (alat baru mengukur bila ada beban).',
      );
      return;
    }
    const result: CheckResult = {
      key: `${Date.now()}`,
      measure,
      reference,
      readings,
      stats,
      afterAdjustment: adjustedThisSession,
    };
    setResults(current => [...current, result]);
    saveRow({
      kind: 'check',
      measure,
      referenceValue: reference,
      readings,
      stats,
      after: toValues(calState),
      result: adjustedThisSession ? 'ok_after_adjustment' : 'ok',
    });
  };

  const cancelCheck = () => {
    cancelRef.current.cancelled = true;
    setChecking(false);
  };

  const runAdjust = async (action: CalibrationAction, label: string) => {
    if (busy) {
      return;
    }
    setAdjusting(action.type);
    setAdjustResult(null);
    const outcome = await runSmartGrowthCalibration(action);
    setAdjusting(null);
    const after = outcome.after ?? (await readSmartGrowthCalibration());
    if (after) {
      setCalState(after);
    }
    setAdjustResult({
      label,
      ok: outcome.ok,
      message: RESULT_MESSAGES[outcome.result] ?? `Gagal (${outcome.result}).`,
      before: outcome.before,
      after,
    });
    if (outcome.ok) {
      setAdjustedThisSession(true);
    }
    if (outcome.result === 'not_connected' || outcome.result === 'write_failed') {
      return; // never reached the device: nothing to log
    }
    saveRow({
      kind: KIND_BY_ACTION[action.type],
      measure: action.type === 'weight' ? 'weight' : action.type === 'height' ? 'height' : null,
      referenceValue:
        action.type === 'weight' ? action.referenceKg : action.type === 'height' ? action.referenceCm : null,
      after: toValues(after),
      previous: toValues(outcome.before),
      measuredRaw:
        outcome.ok && after
          ? action.type === 'height'
            ? after.lastMeasuredRaw / 100
            : after.lastMeasuredRaw
          : null,
      result: outcome.result,
    });
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset kalibrasi?',
      'Nilai kalibrasi alat dikembalikan ke bawaan pabrik. Setelah itu alat perlu dikalibrasi ulang.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            runAdjust({ type: 'reset' }, 'Reset kalibrasi').catch(() => undefined);
          },
        },
      ],
    );
  };

  const handleClose = () => {
    cancelRef.current.cancelled = true;
    onClose();
  };

  const unit = unitFor(measure);

  return (
    <Modal animationType="slide" onRequestClose={handleClose} visible={visible}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing[8] }]}>
          <Text style={styles.headerTitle}>Cek akurasi & kalibrasi</Text>
          <Pressable accessibilityRole="button" onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeLabel}>Tutup</Text>
          </Pressable>
        </View>

        <Screen avoidKeyboard contentContainerStyle={styles.content} withTopInset={false}>
          {!bleId ? (
            <InlineAlert message="Alat terputus. Hubungkan lagi lalu buka menu ini." tone="warning" />
          ) : null}
          {saveNotice ? <InlineAlert message={saveNotice} tone="warning" /> : null}

          <SegmentedControl
            disabled={busy}
            onChange={value => {
              setMeasure(value);
              setReferenceText('');
              setCheckError(null);
            }}
            options={MEASURE_OPTIONS}
            value={measure}
          />

          {/* 1. Accuracy check */}
          <View style={styles.card}>
            <Text style={styles.stepTitle}>1. Cek akurasi</Text>
            <Text style={styles.body}>
              {measure === 'weight'
                ? 'Letakkan beban acuan yang beratnya sudah pasti (mis. 5, 10 atau 20 kg) di tengah timbangan, lalu isi beratnya.'
                : 'Berdirikan balok acuan yang tingginya sudah pasti di atas timbangan, turunkan papan kepala sampai menempel, lalu isi tingginya.'}
            </Text>
            <Text style={styles.caption}>
              Batas toleransi: ±{tolerance} {unit}
              {tolerances.source === 'default' ? ' (bawaan)' : tolerances.source === 'school' ? ' (sekolah)' : ''}.
              Alat dibaca {CHECK_READINGS_COUNT} kali.
            </Text>
            <TextField
              editable={!busy}
              error={referenceError}
              keyboardType="decimal-pad"
              label={measure === 'weight' ? 'Berat beban acuan (kg)' : 'Tinggi balok acuan (cm)'}
              onChangeText={setReferenceText}
              placeholder={measure === 'weight' ? 'mis. 10' : 'mis. 100'}
              value={referenceText}
            />
            {checking ? (
              <>
                <Text style={styles.body}>
                  Membaca alat… {progress.length}/{CHECK_READINGS_COUNT}
                  {progress.length > 0
                    ? ` (terakhir ${formatValue(measure, progress[progress.length - 1])})`
                    : ''}
                </Text>
                <PrimaryButton label="Batalkan" onPress={cancelCheck} size="sm" variant="outline" />
              </>
            ) : (
              <PrimaryButton
                disabled={!referenceValid || busy || !bleId}
                label={adjustedThisSession ? 'Cek ulang akurasi' : 'Mulai cek akurasi'}
                onPress={() => {
                  runCheck().catch(() => setChecking(false));
                }}
                size="md"
              />
            )}
            {checkError ? <InlineAlert message={checkError} tone="error" /> : null}
          </View>

          {results.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.stepTitle}>Hasil cek</Text>
              {results.map(item => (
                <View key={item.key} style={styles.resultRow}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultLabel}>
                      {item.measure === 'weight' ? 'Berat' : 'Tinggi'}{' '}
                      {formatValue(item.measure, item.reference)}
                      {item.afterAdjustment ? ' • setelah penyesuaian' : ''}
                    </Text>
                    <StatusPill
                      label={item.stats.withinTolerance ? 'Dalam toleransi' : 'Di luar toleransi'}
                      tone={item.stats.withinTolerance ? 'success' : 'warning'}
                    />
                  </View>
                  <Text style={styles.body}>{describeCheck(item.measure, item.reference, item.stats)}</Text>
                  <Text style={styles.caption}>
                    Kesalahan {item.stats.absError.toFixed(item.measure === 'weight' ? 2 : 1)}{' '}
                    {unitFor(item.measure)} • SD (keterulangan){' '}
                    {item.stats.sd.toFixed(item.measure === 'weight' ? 3 : 2)} {unitFor(item.measure)} • n=
                    {item.stats.n} • toleransi ±{item.stats.tolerance} {unitFor(item.measure)}
                  </Text>
                </View>
              ))}
              <Text style={styles.caption}>
                Bisa diulang dengan beban/balok acuan lain untuk melihat akurasi di beberapa titik.
              </Text>
            </View>
          ) : null}

          {/* 2. Optional adjustment */}
          <View style={[styles.card, needsAdjustment && styles.cardHighlight]}>
            <Text style={styles.stepTitle}>2. Penyesuaian alat (opsional)</Text>
            {needsAdjustment ? (
              <Text style={styles.warningText}>
                Hasil cek di luar toleransi. Sesuaikan alat di bawah, lalu tekan "Cek ulang akurasi"
                supaya hasil setelah penyesuaian juga tercatat.
              </Text>
            ) : (
              <Text style={styles.body}>
                Lakukan hanya bila hasil cek di luar toleransi.
              </Text>
            )}

            {calSupported === false ? (
              <InlineAlert
                message="Firmware alat ini belum mendukung kalibrasi dari aplikasi (perlu firmware 2.1 atau lebih baru). Cek akurasi tetap bisa dipakai."
                tone="info"
              />
            ) : calSupported === null ? (
              <Text style={styles.caption}>Memeriksa dukungan kalibrasi alat…</Text>
            ) : (
              <>
                {calState ? (
                  <Text style={styles.caption}>
                    Nilai alat sekarang: nol {calState.zeroOffset} • faktor {formatFactor(calState.calFactor)} •
                    offset tinggi {calState.heightOffsetCm.toFixed(1)} cm
                    {calState.weightCalibrated ? ' • berat sudah dikalibrasi' : ''}
                    {calState.heightCalibrated ? ' • tinggi sudah dikalibrasi' : ''}
                  </Text>
                ) : null}

                {measure === 'weight' ? (
                  <>
                    <Text style={styles.body}>a. Kosongkan timbangan (tidak ada beban apa pun), lalu tekan Tare.</Text>
                    <PrimaryButton
                      disabled={busy || !bleId}
                      label="Tare (nol-kan)"
                      loading={adjusting === 'tare'}
                      onPress={() => {
                        runAdjust({ type: 'tare' }, 'Tare').catch(() => undefined);
                      }}
                      size="sm"
                      variant="outline"
                    />
                    <Text style={styles.body}>
                      b. Letakkan beban acuan, pastikan beratnya terisi di atas, lalu tekan Kalibrasi berat.
                    </Text>
                    <PrimaryButton
                      disabled={busy || !bleId || !referenceValid || reference === null}
                      label={referenceValid && reference !== null ? `Kalibrasi berat (${reference} kg)` : 'Kalibrasi berat'}
                      loading={adjusting === 'weight'}
                      onPress={() => {
                        if (reference !== null) {
                          runAdjust({ type: 'weight', referenceKg: reference }, 'Kalibrasi berat').catch(
                            () => undefined,
                          );
                        }
                      }}
                      size="sm"
                      variant="outline"
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.body}>
                      Berdirikan balok acuan, papan kepala menempel, tinggi balok terisi di atas, lalu tekan
                      Kalibrasi tinggi.
                    </Text>
                    <PrimaryButton
                      disabled={busy || !bleId || !referenceValid || reference === null}
                      label={referenceValid && reference !== null ? `Kalibrasi tinggi (${reference} cm)` : 'Kalibrasi tinggi'}
                      loading={adjusting === 'height'}
                      onPress={() => {
                        if (reference !== null) {
                          runAdjust({ type: 'height', referenceCm: reference }, 'Kalibrasi tinggi').catch(
                            () => undefined,
                          );
                        }
                      }}
                      size="sm"
                      variant="outline"
                    />
                  </>
                )}

                {adjustResult ? (
                  <View style={styles.adjustResult}>
                    <InlineAlert
                      message={adjustResult.message}
                      title={adjustResult.label}
                      tone={adjustResult.ok ? 'success' : 'error'}
                    />
                    {adjustResult.before && adjustResult.after ? (
                      <Text style={styles.caption}>
                        Sebelum: nol {adjustResult.before.zeroOffset} • faktor{' '}
                        {formatFactor(adjustResult.before.calFactor)} • offset tinggi{' '}
                        {adjustResult.before.heightOffsetCm.toFixed(1)} cm{'\n'}
                        Sesudah: nol {adjustResult.after.zeroOffset} • faktor{' '}
                        {formatFactor(adjustResult.after.calFactor)} • offset tinggi{' '}
                        {adjustResult.after.heightOffsetCm.toFixed(1)} cm
                      </Text>
                    ) : null}
                    {adjustResult.ok && adjustResult.label !== 'Tare' ? (
                      <Text style={styles.body}>
                        Sekarang tekan "Cek ulang akurasi" di langkah 1 dengan beban/balok acuan yang sama.
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <PrimaryButton
                  disabled={busy || !bleId}
                  label="Reset kalibrasi ke bawaan"
                  loading={adjusting === 'reset'}
                  onPress={confirmReset}
                  size="sm"
                  variant="dangerOutline"
                />
              </>
            )}
          </View>
        </Screen>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.surface.app,
  },
  headerTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
    flex: 1,
  },
  closeButton: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.md,
  },
  closeLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  content: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[16],
    gap: spacing[16],
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface.primary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[10],
  },
  cardHighlight: {
    borderColor: colors.feedback.warningBorder,
  },
  stepTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  body: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  caption: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  warningText: {
    ...typography.labelMd,
    color: colors.feedback.warningText,
  },
  resultRow: {
    gap: spacing[4],
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  resultLabel: {
    ...typography.labelLg,
    color: colors.text.primary,
    flexShrink: 1,
  },
  adjustResult: {
    gap: spacing[8],
  },
});
