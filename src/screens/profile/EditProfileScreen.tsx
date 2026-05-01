import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, PrimaryButton, Screen } from '../../shared/components';
import { updateMyProfile } from '../../services';
import { colors, radius, spacing, typography } from '../../theme';

type EditProfileScreenProps = {
  onBack: () => void;
  fullName: string;
};

function buildInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'OP';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function EditProfileScreen({ onBack, fullName: initialFullName }: EditProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState(initialFullName);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initials = useMemo(() => buildInitials(fullName), [fullName]);

  const isSaveDisabled = useMemo(() => {
    return fullName.trim().length === 0 || isSaving || fullName.trim() === initialFullName.trim();
  }, [fullName, initialFullName, isSaving]);

  const handleSave = async () => {
    if (isSaveDisabled) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      await updateMyProfile({
        full_name: fullName.trim(),
      });
      onBack();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Gagal menyimpan profil. Silakan coba lagi.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + spacing[12] }]}>
        <View style={styles.pageHeaderTopRow}>
          <Pressable onPress={onBack} style={styles.headerIdentity}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 6l-6 6 6 6"
                stroke={colors.brand.primary500}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <View style={styles.headerIdentityText}>
              <Text style={styles.pageTitle}>Edit Profil</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Screen keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <InfoCard>
          <View style={styles.form}>
            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Pressable onPress={() => undefined} style={styles.avatarAction}>
                <Text style={styles.avatarActionLabel}>Atur Avatar</Text>
              </Pressable>
            </View>

            <TextInput
              editable={!isSaving}
              onChangeText={setFullName}
              placeholder="Masukkan nama lengkap"
              placeholderTextColor={colors.text.muted}
              style={styles.nameInput}
              value={fullName}
            />
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        </InfoCard>
        <PrimaryButton
          disabled={isSaveDisabled}
          label={isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          onPress={handleSave}
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  pageHeader: {
    backgroundColor: colors.surface.app,
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pageHeaderTopRow: {
    alignItems: 'flex-start',
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  headerIdentityText: {
    justifyContent: 'center',
  },
  pageTitle: {
    ...typography.headingLg,
    color: colors.text.primary,
  },
  content: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[16],
    gap: spacing[16],
  },
  form: {
    gap: spacing[16],
  },
  avatarSection: {
    alignItems: 'center',
    gap: spacing[12],
    paddingBottom: spacing[4],
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  avatarText: {
    ...typography.headingLg,
    color: colors.brand.primary700,
  },
  avatarAction: {
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    backgroundColor: colors.surface.secondary,
  },
  avatarActionLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  nameInput: {
    ...typography.bodyMd,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    color: colors.text.primary,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.status.device.error,
  },
});
