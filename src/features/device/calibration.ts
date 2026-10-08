// Pure helpers for the SmartGrowth accuracy check + calibration log
// (Hasura `device_calibrations` / `calibration_settings`). No BLE or network
// imports so they are unit-testable.

export type CalibrationMeasure = 'weight' | 'height';

export type CalibrationKind = 'check' | 'tare' | 'adjust_weight' | 'adjust_height' | 'reset';

/** Fallback tolerances when the backend has no setting (or is unreachable). */
export const DEFAULT_WEIGHT_TOLERANCE_KG = 0.1;
export const DEFAULT_HEIGHT_TOLERANCE_CM = 0.5;

/** Stable readings collected per reference point. */
export const CHECK_READINGS_COUNT = 5;

export type CalibrationTolerances = {
  weightKg: number;
  heightCm: number;
  source: 'school' | 'global' | 'default';
};

export const DEFAULT_CALIBRATION_TOLERANCES: CalibrationTolerances = {
  weightKg: DEFAULT_WEIGHT_TOLERANCE_KG,
  heightCm: DEFAULT_HEIGHT_TOLERANCE_CM,
  source: 'default',
};

export function toleranceFor(measure: CalibrationMeasure, tolerances: CalibrationTolerances) {
  return measure === 'weight' ? tolerances.weightKg : tolerances.heightCm;
}

export function unitFor(measure: CalibrationMeasure) {
  return measure === 'weight' ? 'kg' : 'cm';
}

export type CheckStats = {
  n: number;
  mean: number;
  /** mean - reference */
  bias: number;
  absError: number;
  /** bias / reference * 100 */
  pctError: number;
  /** Sample standard deviation (repeatability); 0 for a single reading. */
  sd: number;
  tolerance: number;
  withinTolerance: boolean;
};

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Statistics of an accuracy check; null without readings or with a non-positive reference. */
export function computeCheckStats(
  readings: number[],
  reference: number,
  tolerance: number,
): CheckStats | null {
  const values = readings.filter(value => Number.isFinite(value));
  if (values.length === 0 || !Number.isFinite(reference) || reference <= 0) {
    return null;
  }
  const n = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  const variance =
    n > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1) : 0;
  const bias = mean - reference;
  // Rounded so float noise (10.1 - 10 = 0.0999...) does not flip the verdict.
  const absError = round(Math.abs(bias), 4);
  return {
    n,
    mean: round(mean, 4),
    bias: round(bias, 4),
    absError,
    pctError: round((bias / reference) * 100, 3),
    sd: round(Math.sqrt(variance), 4),
    tolerance,
    withinTolerance: absError <= tolerance + 1e-9,
  };
}

/** Parses "10,5" or "10.5" (Indonesian keyboards type a comma). */
export function parseReferenceInput(text: string) {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Valid reference ranges (the device only reports weight 2-200 kg, height 45-220 cm). */
export const REFERENCE_RANGES: Record<CalibrationMeasure, { min: number; max: number }> = {
  weight: { min: 2, max: 200 },
  height: { min: 45, max: 220 },
};

function formatSigned(value: number, digits: number) {
  const text = value.toFixed(digits);
  return value > 0 ? `+${text}` : text;
}

/** "Alat membaca 10.12 kg untuk beban 10.00 kg → selisih +0.12 kg (+1.2%)" */
export function describeCheck(measure: CalibrationMeasure, reference: number, stats: CheckStats) {
  const unit = unitFor(measure);
  const digits = measure === 'weight' ? 2 : 1;
  const what = measure === 'weight' ? 'beban' : 'balok';
  return (
    `Alat membaca ${stats.mean.toFixed(digits)} ${unit} untuk ${what} ${reference.toFixed(digits)} ${unit}` +
    ` → selisih ${formatSigned(stats.bias, digits)} ${unit} (${formatSigned(stats.pctError, 1)}%)`
  );
}

export type DeviceCalibrationValues = {
  zeroOffset: number;
  calFactor: number;
  heightOffsetCm: number;
};

/** Row for `insert_device_calibrations_one` minus school/performer (added by the service). */
export type DeviceCalibrationRowInput = {
  bleId: string;
  deviceId: string | null;
  deviceKey: string | null;
  deviceName: string | null;
  batchId: string;
  kind: CalibrationKind;
  measure?: CalibrationMeasure | null;
  referenceValue?: number | null;
  readings?: number[] | null;
  stats?: CheckStats | null;
  after?: DeviceCalibrationValues | null;
  previous?: DeviceCalibrationValues | null;
  measuredRaw?: number | null;
  result: string;
  firmwareVersion?: string | null;
};

export type DeviceCalibrationInsertObject = {
  school_id: string;
  performed_by: string;
  device_id: string | null;
  device_key: string | null;
  ble_id: string;
  device_name: string | null;
  batch_id: string;
  kind: CalibrationKind;
  measure: CalibrationMeasure | null;
  reference_value: number | null;
  readings: number[] | null;
  n: number | null;
  mean_value: number | null;
  bias: number | null;
  abs_error: number | null;
  pct_error: number | null;
  sd: number | null;
  tolerance: number | null;
  within_tolerance: boolean | null;
  zero_offset: number | null;
  cal_factor: number | null;
  height_offset_cm: number | null;
  measured_raw: number | null;
  previous_values: Record<string, number> | null;
  result: string;
  firmware_version: string | null;
};

function finiteOrNull(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function valuesToJson(values: DeviceCalibrationValues | null | undefined) {
  if (!values) {
    return null;
  }
  return {
    zero_offset: values.zeroOffset,
    cal_factor: values.calFactor,
    height_offset_cm: values.heightOffsetCm,
  };
}

export function buildCalibrationInsertObject(
  input: DeviceCalibrationRowInput,
  context: { schoolId: string; userId: string },
): DeviceCalibrationInsertObject {
  const stats = input.stats ?? null;
  return {
    school_id: context.schoolId,
    performed_by: context.userId,
    device_id: input.deviceId,
    device_key: input.deviceKey,
    ble_id: input.bleId,
    device_name: input.deviceName,
    batch_id: input.batchId,
    kind: input.kind,
    measure: input.measure ?? null,
    reference_value: finiteOrNull(input.referenceValue),
    readings: input.readings ?? null,
    n: stats?.n ?? null,
    mean_value: stats?.mean ?? null,
    bias: stats?.bias ?? null,
    abs_error: stats?.absError ?? null,
    pct_error: stats?.pctError ?? null,
    sd: stats?.sd ?? null,
    tolerance: stats?.tolerance ?? null,
    within_tolerance: stats ? stats.withinTolerance : null,
    zero_offset: finiteOrNull(input.after?.zeroOffset),
    cal_factor: finiteOrNull(input.after?.calFactor),
    height_offset_cm: finiteOrNull(input.after?.heightOffsetCm),
    measured_raw: finiteOrNull(input.measuredRaw),
    previous_values: valuesToJson(input.previous),
    result: input.result,
    firmware_version: input.firmwareVersion ?? null,
  };
}

/** RFC 4122 v4 id for batch_id (no crypto dependency needed: grouping only). */
export function createBatchId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random % 4) + 8;
    return value.toString(16);
  });
}

/** Default days after the last accuracy check before staff are told to ask for a re-check. */
export const DEFAULT_RECALIBRATION_INTERVAL_DAYS = 180;

/** One accuracy-check row (`device_calibrations`, kind 'check') as read by the app. */
export type CalibrationCheckRow = {
  measure: CalibrationMeasure;
  createdAt: string;
  bias: number | null;
  withinTolerance: boolean | null;
};

export type DeviceCalibrationStatus = {
  /** Latest accuracy check of any measure; null = never checked. */
  lastCheckAt: string | null;
  /** Bias of the latest check per measure (kg / cm), null when absent. */
  weightBias: number | null;
  heightBias: number | null;
  never: boolean;
  /** Latest check older than the recalibration interval. */
  stale: boolean;
  /** Measures whose latest check was out of tolerance (no later passing check). */
  outOfTolerance: Array<{ measure: CalibrationMeasure; bias: number | null }>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Staff-facing status of a device from its accuracy-check rows (any order).
 * Per measure only the latest check counts: a later passing check clears an
 * earlier out-of-tolerance one.
 */
export function computeDeviceCalibrationStatus(
  rows: CalibrationCheckRow[],
  intervalDays: number,
  now: number = Date.now(),
): DeviceCalibrationStatus {
  const valid = rows
    .map(row => ({ row, time: new Date(row.createdAt).getTime() }))
    .filter(item => Number.isFinite(item.time))
    .sort((first, second) => second.time - first.time);
  const latestOf = (measure: CalibrationMeasure) => valid.find(item => item.row.measure === measure) ?? null;
  const weight = latestOf('weight');
  const height = latestOf('height');
  const newest = valid[0] ?? null;
  const days = Number.isFinite(intervalDays) && intervalDays > 0 ? intervalDays : DEFAULT_RECALIBRATION_INTERVAL_DAYS;
  const outOfTolerance: DeviceCalibrationStatus['outOfTolerance'] = [];
  for (const item of [weight, height]) {
    if (item && item.row.withinTolerance === false) {
      outOfTolerance.push({ measure: item.row.measure, bias: item.row.bias });
    }
  }
  return {
    lastCheckAt: newest ? newest.row.createdAt : null,
    weightBias: weight?.row.bias ?? null,
    heightBias: height?.row.bias ?? null,
    never: newest === null,
    stale: newest !== null && now - newest.time > days * DAY_MS,
    outOfTolerance,
  };
}

/** "+0.12" / "-0.30" / "0.00" */
export function formatBias(value: number, measure: CalibrationMeasure) {
  const text = value.toFixed(measure === 'weight' ? 2 : 1);
  return value > 0 ? `+${text}` : text;
}

/** "6 bulan" for 180 days, else "N hari". */
export function describeInterval(days: number) {
  return days % 30 === 0 ? `${days / 30} bulan` : `${days} hari`;
}
