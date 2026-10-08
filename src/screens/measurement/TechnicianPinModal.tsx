import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { PrimaryButton, TextField } from '../../shared/components';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';
import {
  TECHNICIAN_PIN_MAX_LENGTH,
  getTechnicianModeState,
  submitTechnicianPin,
  subscribeTechnicianMode,
  type TechnicianPinConfig,
} from '../../features/device/technicianMode';
import { fetchCalibrationExtras } from '../../services/auth';

// PIN prompt for the hidden "Mode teknisi" (long-press on the "Perangkat"
// title). Same look as BluetoothAccessModal.

type TechnicianPinModalProps = {
  visible: boolean;
  onClose: () => void;
  onUnlocked: () => void;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; pin: TechnicianPinConfig | null };

const NOT_CONFIGURED =
  'PIN teknisi belum diatur. Atur di admin dashboard (Perangkat → Batas toleransi).';
const LOAD_FAILED =
  'PIN teknisi tidak dapat dimuat. Periksa koneksi internet lalu coba lagi.';

function lockedSecondsLeft() {
  const { lockedUntil } = getTechnicianModeState();
  return lockedUntil !== null ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0;
}

export function TechnicianPinModal({ visible, onClose, onUnlocked }: TechnicianPinModalProps) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState(lockedSecondsLeft);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    setPin('');
    setError(null);
    setLockSeconds(lockedSecondsLeft());
    setLoad({ status: 'loading' });
    let active = true;
    fetchCalibrationExtras()
      .then(extras => {
        if (active) {
          setLoad(extras.loaded ? { status: 'ready', pin: extras.technicianPin } : { status: 'failed' });
        }
      })
      .catch(() => active && setLoad({ status: 'failed' }));
    return () => {
      active = false;
    };
  }, [visible]);

  // Countdown while PIN entry is locked.
  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const update = () => setLockSeconds(lockedSecondsLeft());
    const unsubscribe = subscribeTechnicianMode(update);
    const timer = setInterval(update, 1000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [visible]);

  const locked = lockSeconds > 0;
  const ready = load.status === 'ready' && load.pin !== null;

  const handleSubmit = () => {
    if (load.status !== 'ready') {
      return;
    }
    const result = submitTechnicianPin(pin.trim(), load.pin);
    switch (result.status) {
      case 'ok':
        setPin('');
        setError(null);
        onUnlocked();
        return;
      case 'wrong':
        setPin('');
        setError(`PIN salah. Sisa percobaan: ${result.attemptsLeft}.`);
        return;
      case 'locked':
        setPin('');
        setError(null);
        setLockSeconds(Math.ceil(result.retryInMs / 1000));
        return;
      case 'invalid_format':
        setError('PIN berupa 4–8 angka.');
        return;
      case 'not_configured':
        setError(null);
        return;
    }
  };

  const notice =
    load.status === 'failed'
      ? LOAD_FAILED
      : load.status === 'ready' && load.pin === null
        ? NOT_CONFIGURED
        : locked
          ? `Terlalu banyak PIN salah. Coba lagi dalam ${lockSeconds} detik.`
          : null;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Tutup" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.icon}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Rect
                  x={5}
                  y={11}
                  width={14}
                  height={10}
                  rx={2}
                  stroke={colors.brand.primary600}
                  strokeWidth={2}
                />
                <Path
                  d="M8 11V8a4 4 0 018 0v3"
                  stroke={colors.brand.primary600}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <Text style={styles.title}>Mode teknisi</Text>
          </View>
          <Text style={styles.body}>
            Khusus tim teknis. Masukkan PIN teknisi untuk membuka menu cek akurasi & kalibrasi
            alat. Mode ini mati sendiri setelah 30 menit.
          </Text>
          {load.status === 'loading' ? <Text style={styles.body}>Memuat…</Text> : null}
          {ready ? (
            <TextField
              autoFocus
              editable={!locked}
              error={error}
              keyboardType="number-pad"
              label="PIN teknisi"
              maxLength={TECHNICIAN_PIN_MAX_LENGTH}
              onChangeText={text => {
                setPin(text.replace(/\D/g, ''));
                setError(null);
              }}
              onSubmitEditing={handleSubmit}
              placeholder="4–8 angka"
              secureTextEntry
              value={pin}
            />
          ) : null}
          {notice ? (
            <Text accessibilityRole="alert" style={styles.note}>
              {notice}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <PrimaryButton
              label={ready ? 'Batal' : 'Tutup'}
              onPress={onClose}
              size="md"
              style={styles.button}
              variant="outline"
            />
            {ready ? (
              <PrimaryButton
                disabled={locked || pin.length === 0}
                label="Buka"
                onPress={handleSubmit}
                size="md"
                style={styles.button}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.backdrop,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingX,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderRadius: radius.xl,
    backgroundColor: colors.surface.primary,
    padding: spacing[20],
    gap: spacing[16],
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headingMd,
    color: colors.text.primary,
    flex: 1,
  },
  body: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  note: {
    ...typography.bodySm,
    color: colors.feedback.errorText,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[10],
  },
  button: {
    flex: 1,
  },
});
