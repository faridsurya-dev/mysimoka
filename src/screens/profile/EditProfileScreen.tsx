import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  InfoCard,
  InlineAlert,
  PrimaryButton,
  Screen,
  ScreenHeader,
  TextField,
} from '../../shared/components';
import { updateMyProfile } from '../../services';
import { colors, layout, radius, spacing, typography } from '../../theme';

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
      <ScreenHeader onBack={onBack} title="Ubah Profil" />

      <Screen avoidKeyboard contentContainerStyle={styles.content} withTopInset={false}>
        <InfoCard>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <PrimaryButton
              label="Atur Avatar"
              onPress={() => undefined}
              size="sm"
              variant="secondary"
            />
          </View>

          <TextField
            editable={!isSaving}
            label="Nama Lengkap"
            onChangeText={setFullName}
            placeholder="Masukkan nama lengkap"
            value={fullName}
          />
          {errorMessage ? <InlineAlert message={errorMessage} tone="error" /> : null}
        </InfoCard>

        <PrimaryButton
          disabled={isSaveDisabled && !isSaving}
          fullWidth
          label="Simpan Perubahan"
          loading={isSaving}
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
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing[16],
    gap: spacing[16],
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[8],
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.neutral[0],
    boxShadow: '0px 6px 16px rgba(17, 29, 42, 0.12)',
  },
  avatarText: {
    ...typography.headingLg,
    color: colors.brand.primary700,
  },
});
