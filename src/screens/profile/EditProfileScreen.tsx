import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InfoCard, Screen, TextField } from '../../shared/components';
import { colors, spacing, typography } from '../../theme';

type EditProfileScreenProps = {
  onBack: () => void;
};

export function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  return (
    <Screen contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backLabel}>Kembali ke Profil</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Edit Profile</Text>
        <Text style={styles.title}>Perbarui informasi personal</Text>
      </View>

      <InfoCard
        title="Form dasar profil"
        description="Struktur awal untuk edit data pengguna sesuai IA terbaru.">
        <View style={styles.form}>
          <TextField
            label="Nama"
            onChangeText={() => undefined}
            placeholder="Masukkan nama"
            value="Farid Ramadhan"
          />
          <TextField
            label="Peran"
            onChangeText={() => undefined}
            placeholder="Masukkan peran"
            value="Guru"
          />
        </View>
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[24],
    gap: spacing[16],
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backLabel: {
    ...typography.labelMd,
    color: colors.brand.primary700,
  },
  header: {
    gap: spacing[8],
  },
  eyebrow: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    ...typography.headingXL,
    color: colors.text.primary,
  },
  form: {
    gap: spacing[16],
  },
});
