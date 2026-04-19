import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SESSION_LIST_MOCK } from '../../features/session';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, Screen, StatusPill } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type SessionListScreenProps = {
  onOpenSessionDetail: () => void;
  onCreateSession: () => void;
  mode: 'measurement' | 'immunization';
  onSwitchMode: (mode: 'measurement' | 'immunization') => void;
};

export function SessionListScreen({
  onOpenSessionDetail,
  onCreateSession,
  mode,
  onSwitchMode,
}: SessionListScreenProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 72;

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

        <View style={styles.list}>
          {SESSION_LIST_MOCK.map(session => (
            <Pressable
              key={session.id}
              onPress={onOpenSessionDetail}
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
