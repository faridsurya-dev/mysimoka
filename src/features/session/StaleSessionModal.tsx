import React, { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Icon, PrimaryButton } from '../../shared/components';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';
import {
  acknowledgeStaleSession,
  formatStaleSessionDate,
  shouldWarnStaleSession,
} from './staleSession';

type StaleSessionModalProps = {
  sessionId: string | null | undefined;
  sessionDate: string | null | undefined;
  /** Opens the create-session flow; the button is hidden without it. */
  onCreateNewSession?: () => void;
};

/**
 * Warns once per session per app run when an old session is reopened: saving
 * again in it would overwrite the previous period's results.
 */
export function StaleSessionModal({
  sessionId,
  sessionDate,
  onCreateNewSession,
}: StaleSessionModalProps) {
  // Re-evaluated whenever the session changes; the answer is remembered.
  const [answeredKey, setAnsweredKey] = useState<string | null>(null);
  const key = `${sessionId ?? ''}|${sessionDate ?? ''}`;
  const visible = answeredKey !== key && shouldWarnStaleSession(sessionId, sessionDate);

  const answer = () => {
    if (sessionId) {
      acknowledgeStaleSession(sessionId);
    }
    setAnsweredKey(key);
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={answer}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.icon}>
              <Icon name="calendar" size={22} color={colors.feedback.warningText} />
            </View>
            <Text style={styles.title}>Sesi lama</Text>
          </View>
          <Text style={styles.body}>
            Sesi ini dibuat {sessionDate ? formatStaleSessionDate(sessionDate) : '-'}. Untuk
            periode ukur baru, buat sesi baru agar data sebelumnya tidak tertimpa.
          </Text>
          <View style={styles.actions}>
            {onCreateNewSession ? (
              <PrimaryButton
                label="Buat sesi baru"
                onPress={() => {
                  answer();
                  onCreateNewSession();
                }}
                size="md"
              />
            ) : null}
            <PrimaryButton
              label="Tetap lanjut di sesi ini"
              onPress={answer}
              size="md"
              variant="outline"
            />
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
    backgroundColor: colors.feedback.warningBackground,
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
  actions: {
    gap: spacing[10],
  },
});
