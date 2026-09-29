import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { Icon } from './components/icons';
import { ActionButton, Card, PageLayout } from './components/ui';

type FaceRegistrationScreenProps = {
  onBack: () => void;
  schoolId: string | null;
};

/**
 * Versi web: registrasi wajah membutuhkan kamera & deteksi wajah native,
 * sehingga hanya tersedia di aplikasi mobile. Fitur ini opsional.
 */
export function FaceRegistrationScreen({ onBack }: FaceRegistrationScreenProps) {
  return (
    <PageLayout onBack={onBack} subtitle="Opsional" title="Registrasi Wajah">
      <Card style={styles.card}>
        <View style={styles.icon}>
          <Icon color={colors.brand.primary700} name="face" size={28} />
        </View>
        <Text style={styles.title}>Tersedia di aplikasi mobile</Text>
        <Text style={styles.body}>
          Registrasi wajah memerlukan kamera perangkat dan deteksi wajah, sehingga hanya dapat
          dilakukan melalui aplikasi MySimoka di Android/iOS.
        </Text>
        <View style={styles.list}>
          <Bullet text="Data siswa, kelas, dan pencatatan manual tetap dapat dikelola dari web." />
          <Bullet text="Siswa tanpa data wajah tetap bisa dicari manual saat pengukuran." />
          <Bullet text="Wajah dapat didaftarkan kapan saja dari menu Kelas di aplikasi mobile." />
        </View>
        <ActionButton label="Kembali ke Kelas" onPress={onBack} style={styles.button} />
      </Card>
    </PageLayout>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <Icon color={colors.accent.teal} name="check" size={16} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing[24],
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headingMd,
    color: colors.text.primary,
    textAlign: 'center',
  },
  body: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  list: {
    alignSelf: 'stretch',
    gap: spacing[8],
    paddingVertical: spacing[8],
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  bulletText: {
    ...typography.bodySm,
    flex: 1,
    color: colors.text.secondary,
  },
  button: {
    alignSelf: 'stretch',
  },
});
