import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { listImmunizationSessions, listMeasurementSessions } from '../../services';
import { toRecordingErrorMessage } from '../../features/session/recordingErrors';
import {
  EmptyState,
  Icon,
  IconButton,
  InlineAlert,
  LoadingState,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SegmentedControl,
  StatusPill,
} from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';
import { DeviceStatusCard } from './DeviceStatusCard';
import type {
  ImmunizationSessionListItem,
  MeasurementSessionListItem,
  SessionListItem,
} from '../../types';

type RecordingSessionListItem = MeasurementSessionListItem | ImmunizationSessionListItem;

const PROGRAM_OPTIONS = [
  { value: 'measurement' as const, label: 'Antropometri' },
  { value: 'immunization' as const, label: 'Imunisasi' },
];

type SessionListScreenProps = {
  schoolId?: string | null;
  onOpenSessionDetail: (session?: RecordingSessionListItem) => void;
  onCreateSession: () => void;
  mode: 'measurement' | 'immunization';
  onSwitchMode: (mode: 'measurement' | 'immunization') => void;
};

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

type SessionStatusLabel = 'Aktif' | 'Draf' | 'Selesai' | 'Dibatalkan';

type SessionRow = Omit<SessionListItem, 'status'> & {
  status: SessionStatusLabel;
  progress: number;
};

function mapSessionStatus(
  status: MeasurementSessionListItem['status'] | ImmunizationSessionListItem['status'],
): SessionStatusLabel {
  if (status === 'completed') {
    return 'Selesai';
  }
  if (status === 'cancelled') {
    return 'Dibatalkan';
  }
  if (status === 'draft') {
    return 'Draf';
  }
  return 'Aktif';
}

const STATUS_TONE: Record<SessionStatusLabel, 'success' | 'neutral' | 'danger' | 'info'> = {
  Aktif: 'success',
  Draf: 'info',
  Selesai: 'neutral',
  Dibatalkan: 'danger',
};

function toProgress(recorded: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.min(recorded / total, 1);
}

function buildMeasurementSessionRows(
  sessions: MeasurementSessionListItem[],
): Array<SessionRow & { source: MeasurementSessionListItem }> {
  return sessions.map(session => ({
    id: session.id,
    name: session.name,
    meta: `${session.className} • ${formatDateLabel(session.sessionDate)} • ${session.recordedCount}/${session.totalStudents} siswa`,
    status: mapSessionStatus(session.status),
    progress: toProgress(session.recordedCount, session.totalStudents),
    source: session,
  }));
}

function buildImmunizationSessionRows(
  sessions: ImmunizationSessionListItem[],
): Array<SessionRow & { source: ImmunizationSessionListItem }> {
  return sessions.map(session => ({
    id: session.id,
    name: session.name,
    meta: `${session.className} • ${session.vaccineName}${session.doseLabel ? ` • ${session.doseLabel}` : ''} • ${formatDateLabel(session.sessionDate)} • ${session.recordedCount}/${session.totalStudents} siswa`,
    status: mapSessionStatus(session.status),
    progress: toProgress(session.recordedCount, session.totalStudents),
    source: session,
  }));
}

export function SessionListScreen({
  schoolId = null,
  onOpenSessionDetail,
  onCreateSession,
  mode,
  onSwitchMode,
}: SessionListScreenProps) {
  const [measurementSessions, setMeasurementSessions] = useState<MeasurementSessionListItem[]>([]);
  const [immunizationSessions, setImmunizationSessions] = useState<ImmunizationSessionListItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!schoolId) {
      setMeasurementSessions([]);
      setImmunizationSessions([]);
      setSessionLoadError('Sekolah aktif belum dipilih.');
      return;
    }

    let isMounted = true;
    setIsLoadingSessions(true);
    setSessionLoadError(null);

    const request =
      mode === 'measurement'
        ? listMeasurementSessions(schoolId)
        : listImmunizationSessions(schoolId);

    request
      .then(rows => {
        if (isMounted) {
          if (mode === 'measurement') {
            setMeasurementSessions(rows as MeasurementSessionListItem[]);
          } else {
            setImmunizationSessions(rows as ImmunizationSessionListItem[]);
          }
        }
      })
      .catch(error => {
        if (isMounted) {
          if (mode === 'measurement') {
            setMeasurementSessions([]);
          } else {
            setImmunizationSessions([]);
          }
          setSessionLoadError(
            toRecordingErrorMessage(
              error,
              mode === 'measurement'
                ? 'Gagal memuat sesi pengukuran.'
                : 'Gagal memuat sesi imunisasi.',
            ),
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSessions(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [mode, reloadToken, schoolId]);

  const sessionRows =
    mode === 'measurement'
      ? buildMeasurementSessionRows(measurementSessions)
      : buildImmunizationSessionRows(immunizationSessions);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Pencatatan"
        size="lg"
        right={
          <IconButton
            accessibilityLabel="Muat ulang daftar sesi"
            disabled={isLoadingSessions}
            onPress={() => setReloadToken(value => value + 1)}>
            <Icon name="refresh" color={colors.text.primary} />
          </IconButton>
        }
      />

      <Screen contentContainerStyle={styles.content}>
        <SegmentedControl
          options={PROGRAM_OPTIONS}
          value={mode}
          onChange={onSwitchMode}
        />

        {mode === 'measurement' ? <DeviceStatusCard /> : null}

        <PrimaryButton
          label={mode === 'measurement' ? 'Buat Sesi Pengukuran' : 'Buat Sesi Imunisasi'}
          leftIcon={<Icon name="plus" color={colors.text.inverse} />}
          onPress={onCreateSession}
        />

        <Text style={styles.sectionTitle}>Riwayat sesi</Text>

        {isLoadingSessions ? (
          <LoadingState
            label={mode === 'measurement' ? 'Memuat sesi pengukuran...' : 'Memuat sesi imunisasi...'}
          />
        ) : sessionLoadError ? (
          <InlineAlert
            tone="error"
            message={sessionLoadError}
            actionLabel={schoolId ? 'Coba lagi' : undefined}
            onAction={schoolId ? () => setReloadToken(value => value + 1) : undefined}
          />
        ) : sessionRows.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={mode === 'measurement' ? 'Belum ada sesi pengukuran' : 'Belum ada sesi imunisasi'}
            description={
              mode === 'measurement'
                ? 'Buat sesi, pilih kelas, lalu isi tinggi dan berat badan siswa secara manual. Tidak perlu alat.'
                : 'Buat sesi imunisasi untuk mencatat status imunisasi siswa per kelas.'
            }
          />
        ) : (
          <View style={styles.list}>
            {sessionRows.map(session => (
              <Pressable
                accessibilityRole="button"
                key={session.id}
                onPress={() => onOpenSessionDetail(session.source)}
                style={({ pressed }) => [styles.rowCard, pressed && styles.rowCardPressed]}>
                <View style={styles.rowTopLine}>
                  <View style={styles.rowText}>
                    <Text numberOfLines={2} style={styles.rowTitle}>
                      {session.name}
                    </Text>
                    <Text style={styles.rowBody}>{session.meta}</Text>
                  </View>
                  <StatusPill label={session.status} tone={STATUS_TONE[session.status]} />
                </View>
                <View style={styles.rowProgressTrack}>
                  <View
                    style={[
                      styles.rowProgressFill,
                      { width: `${Math.round(session.progress * 100)}%` },
                    ]}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  content: {
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
    gap: spacing[16],
  },
  sectionTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
    marginTop: spacing[4],
  },
  list: {
    gap: spacing[12],
  },
  rowCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[12],
  },
  rowCardPressed: {
    borderColor: colors.brand.primary300,
    backgroundColor: colors.surface.secondary,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  rowText: {
    flex: 1,
    gap: spacing[4],
  },
  rowTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  rowBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  rowProgressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.secondary,
    overflow: 'hidden',
  },
  rowProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary500,
  },
});
