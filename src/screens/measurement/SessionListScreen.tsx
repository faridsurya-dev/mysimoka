import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { listImmunizationSessions, listMeasurementSessions } from '../../services';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, Screen, StatusPill } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';
import type {
  ImmunizationSessionListItem,
  MeasurementSessionListItem,
  SessionListItem,
} from '../../types';

type RecordingSessionListItem = MeasurementSessionListItem | ImmunizationSessionListItem;

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

function mapMeasurementStatus(status: MeasurementSessionListItem['status']) {
  if (status === 'completed') {
    return 'Selesai';
  }
  if (status === 'cancelled') {
    return 'Belum Sync';
  }
  return 'Aktif';
}

function mapImmunizationStatus(status: ImmunizationSessionListItem['status']) {
  if (status === 'completed') {
    return 'Selesai';
  }
  if (status === 'cancelled') {
    return 'Belum Sync';
  }
  return 'Aktif';
}

function buildMeasurementSessionRows(
  sessions: MeasurementSessionListItem[],
): Array<SessionListItem & { source: MeasurementSessionListItem }> {
  return sessions.map(session => ({
    id: session.id,
    name: session.name,
    meta: `${session.className} • ${formatDateLabel(session.sessionDate)} • ${session.recordedCount}/${session.totalStudents} siswa`,
    status: mapMeasurementStatus(session.status),
    source: session,
  }));
}

function buildImmunizationSessionRows(
  sessions: ImmunizationSessionListItem[],
): Array<SessionListItem & { source: ImmunizationSessionListItem }> {
  return sessions.map(session => ({
    id: session.id,
    name: session.name,
    meta: `${session.className} • ${session.vaccineName}${session.doseLabel ? ` • ${session.doseLabel}` : ''} • ${formatDateLabel(session.sessionDate)} • ${session.recordedCount}/${session.totalStudents} siswa`,
    status: mapImmunizationStatus(session.status),
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
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 72;
  const [measurementSessions, setMeasurementSessions] = useState<MeasurementSessionListItem[]>([]);
  const [immunizationSessions, setImmunizationSessions] = useState<ImmunizationSessionListItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);

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
            error instanceof Error
              ? error.message
              : mode === 'measurement'
                ? 'Gagal memuat sesi pengukuran.'
                : 'Gagal memuat sesi imunisasi.',
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
  }, [mode, schoolId]);

  const sessionRows =
    mode === 'measurement'
      ? buildMeasurementSessionRows(measurementSessions)
      : buildImmunizationSessionRows(immunizationSessions);

  return (
    <View style={styles.container}>
      <View style={[styles.fixedHeader, { paddingTop: insets.top + spacing[8] }]}>
        <Text style={styles.headerTitle}>Pencatatan</Text>
        <Pressable
          accessibilityLabel="Urutkan data"
          accessibilityRole="button"
          style={({ pressed }) => [styles.orderButton, pressed && styles.orderButtonPressed]}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M8 7h10M8 12h7M8 17h4M5 6l-1.5 1.5M5 6l1.5 1.5M5 6v12"
              stroke={colors.text.primary}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      <Screen contentContainerStyle={[styles.content, { paddingTop: headerHeight + spacing[16] }]}>
        <View style={styles.modeSwitcher}>
          <Pressable
            onPress={() => onSwitchMode('measurement')}
            style={[
              styles.modeSwitcherItem,
              mode === 'measurement' && styles.modeSwitcherItemActive,
            ]}>
            <Text
              style={[
                styles.modeSwitcherLabel,
                mode === 'measurement' && styles.modeSwitcherLabelActive,
              ]}>
              Antropometri
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onSwitchMode('immunization')}
            style={[
              styles.modeSwitcherItem,
              mode === 'immunization' && styles.modeSwitcherItemActive,
            ]}>
            <Text
              style={[
                styles.modeSwitcherLabel,
                mode === 'immunization' && styles.modeSwitcherLabelActive,
              ]}>
              Imunisasi
            </Text>
          </Pressable>
        </View>

        <PrimaryButton
          label={mode === 'measurement' ? 'Buat Sesi Pengukuran' : 'Buat Sesi Imunisasi'}
          onPress={onCreateSession}
        />

        {isLoadingSessions ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.brand.primary600} size="small" />
            <Text style={styles.stateText}>
              {mode === 'measurement' ? 'Memuat sesi pengukuran...' : 'Memuat sesi imunisasi...'}
            </Text>
          </View>
        ) : sessionLoadError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{sessionLoadError}</Text>
          </View>
        ) : sessionRows.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Belum ada sesi</Text>
            <Text style={styles.stateText}>
              {mode === 'measurement'
                ? 'Buat sesi pengukuran untuk mulai mencatat TB dan BB.'
                : 'Buat sesi imunisasi untuk mulai mencatat status imunisasi siswa.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sessionRows.map(session => (
              <Pressable
                key={session.id}
                onPress={() => onOpenSessionDetail(session.source)}
                style={({ pressed }) => [styles.rowCard, pressed && styles.rowCardPressed]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{session.name}</Text>
                  <Text style={styles.rowBody}>{session.meta}</Text>
                </View>
                <StatusPill
                  label={session.status}
                  tone={
                    session.status === 'Aktif'
                      ? 'success'
                      : session.status === 'Belum Sync'
                        ? 'warning'
                        : 'neutral'
                  }
                />
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
    paddingHorizontal: spacing[24],
    gap: spacing[16],
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    minHeight: 72,
    backgroundColor: colors.surface.app,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[12],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...typography.headingXL,
    color: colors.text.primary,
  },
  orderButton: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderButtonPressed: {
    borderColor: colors.brand.primary500,
    backgroundColor: colors.brand.primary100,
  },
  list: {
    gap: spacing[12],
  },
  stateCard: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    backgroundColor: colors.surface.primary,
    padding: spacing[16],
    alignItems: 'center',
    gap: spacing[8],
  },
  stateTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  stateText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorCard: {
    borderWidth: 1,
    borderColor: colors.feedback.errorBorder,
    borderRadius: radius.md,
    backgroundColor: colors.feedback.errorBackground,
    padding: spacing[12],
  },
  errorText: {
    ...typography.bodySm,
    color: colors.feedback.errorText,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surface.secondary,
    borderRadius: radius.pill,
    padding: spacing[4],
    gap: spacing[4],
  },
  modeSwitcherItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[12],
  },
  modeSwitcherItemActive: {
    backgroundColor: colors.surface.primary,
  },
  modeSwitcherLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  modeSwitcherLabelActive: {
    color: colors.brand.primary500,
  },
  rowCard: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
  },
  rowCardPressed: {
    borderColor: colors.brand.primary600,
  },
  rowText: {
    flex: 1,
    gap: spacing[4],
  },
  rowTitle: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  rowBody: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
