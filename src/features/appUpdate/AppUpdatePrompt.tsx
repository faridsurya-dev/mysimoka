import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Linking,
  Modal,
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PrimaryButton } from '../../shared/components';
import { colors, layout, radius, shadows, spacing, typography } from '../../theme';

type UpdateCheck = {
  available: boolean;
  inProgress: boolean;
  immediateAllowed: boolean;
  availableVersionCode: number;
  stalenessDays: number;
  priority: number;
};

type AppUpdateModule = {
  check: () => Promise<UpdateCheck>;
  startImmediate: () => Promise<'ok' | 'canceled' | 'failed' | 'not_started'>;
};

// Android-only native module (AppUpdateModule.kt, Google Play In-App Updates).
const appUpdate = NativeModules.AppUpdate as AppUpdateModule | undefined;

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.mysimoka_mobile';
const PLAY_STORE_APP_URL = 'market://details?id=com.mysimoka_mobile';

/** Priority set when uploading a release (Play Developer API): 4-5 = must update. */
const FORCED_PRIORITY = 4;

function openPlayStore() {
  Linking.openURL(PLAY_STORE_APP_URL).catch(() =>
    Linking.openURL(PLAY_STORE_URL).catch(() => undefined),
  );
}

/**
 * Asks to update when Google Play has a newer version: on start and whenever
 * the app returns to the foreground. "Perbarui" opens Play's in-app update
 * screen (download + restart); without Play (sideloaded APK, web) nothing shows.
 */
export function AppUpdatePrompt() {
  const [update, setUpdate] = useState<UpdateCheck | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  // "Nanti" hides the prompt for that version until the next app start.
  const dismissedVersion = useRef<number | null>(null);

  const runCheck = useCallback(async () => {
    if (Platform.OS !== 'android' || __DEV__ || !appUpdate) {
      return;
    }
    try {
      const result = await appUpdate.check();
      if (result.inProgress) {
        // Play requires resuming an update that was started but interrupted.
        await appUpdate.startImmediate();
        return;
      }
      if (
        result.available &&
        result.immediateAllowed &&
        dismissedVersion.current !== result.availableVersionCode
      ) {
        setUpdate(result);
      } else if (!result.available) {
        setUpdate(null);
      }
    } catch {
      // Not installed from Play, or Play unreachable: just skip.
    }
  }, []);

  useEffect(() => {
    runCheck().catch(() => undefined);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        runCheck().catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [runCheck]);

  const isForced = (update?.priority ?? 0) >= FORCED_PRIORITY;

  const startUpdate = async () => {
    if (!appUpdate) {
      openPlayStore();
      return;
    }
    setIsStarting(true);
    try {
      // A fresh check: Play lets each update info start one flow only.
      await appUpdate.check();
      const outcome = await appUpdate.startImmediate();
      if (outcome === 'not_started' || outcome === 'failed') {
        openPlayStore();
      }
      if (outcome === 'ok') {
        setUpdate(null);
      }
    } catch {
      openPlayStore();
    } finally {
      setIsStarting(false);
    }
  };

  const dismiss = () => {
    if (isForced || !update) {
      return;
    }
    dismissedVersion.current = update.availableVersionCode;
    setUpdate(null);
  };

  return (
    <Modal animationType="fade" onRequestClose={dismiss} transparent visible={update !== null}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Versi baru MySimoka tersedia</Text>
          <Text style={styles.body}>
            {isForced
              ? 'Versi ini perlu diperbarui agar MySimoka tetap bisa dipakai. '
              : 'Perbarui untuk mendapatkan perbaikan dan fitur terbaru. '}
            Data pengukuran yang belum terkirim tetap aman di HP.
          </Text>
          <View style={styles.actions}>
            {isForced ? null : (
              <PrimaryButton
                disabled={isStarting}
                label="Nanti"
                onPress={dismiss}
                size="md"
                style={styles.button}
                variant="outline"
              />
            )}
            <PrimaryButton
              disabled={isStarting}
              label="Perbarui"
              loading={isStarting}
              onPress={() => {
                startUpdate().catch(() => undefined);
              }}
              size="md"
              style={styles.button}
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
  title: {
    ...typography.headingMd,
    color: colors.text.primary,
  },
  body: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  button: {
    flex: 1,
  },
});
