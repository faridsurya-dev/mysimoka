import React from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import {
  Divider,
  InfoCard,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '../../shared/components';
import { colors, layout, spacing } from '../../theme';

// Public pages on the landing site (mysimoka-web). Google Play requires an
// in-app path to request account deletion plus a matching web URL.
const PRIVACY_POLICY_URL = 'https://mysimoka.id/kebijakan-privasi.html';
const ACCOUNT_DELETION_URL = 'https://mysimoka.id/hapus-akun.html';

function openExternalPage(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert('Gagal membuka halaman', `Buka alamat ini di browser: ${url}`);
  });
}

function confirmAccountDeletionRequest() {
  Alert.alert(
    'Hapus Akun',
    'Permintaan penghapusan akun dan data terkait diproses oleh tim MySimoka. ' +
      'Halaman berikut menjelaskan cara mengajukan permintaan, data apa saja yang dihapus, ' +
      'dan data yang mungkin tetap disimpan sekolah. Lanjutkan ke halaman penghapusan akun?',
    [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Buka Halaman',
        style: 'destructive',
        onPress: () => openExternalPage(ACCOUNT_DELETION_URL),
      },
    ],
  );
}

type AccountSettingsScreenProps = {
  onBack: () => void;
  onOpenEditEmail: () => void;
  onOpenEditPassword: () => void;
  onSwitchSchool: () => void;
  onLogout: () => void;
  email: string;
};

export function AccountSettingsScreen({
  onBack,
  onOpenEditEmail,
  onOpenEditPassword,
  onSwitchSchool,
  onLogout,
  email,
}: AccountSettingsScreenProps) {
  const shouldShowWhatsApp = false;

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={onBack}
        backAccessibilityLabel="Kembali ke Pengaturan"
        subtitle="Kelola email dan password untuk keamanan akses."
        title="Pengaturan Akun"
      />

      <Screen contentContainerStyle={styles.content} withTopInset={false}>
        <InfoCard>
          <SectionHeader title="Kontak Utama" variant="overline" />
          <View>
            <ListRow
              actionLabel="Ubah"
              icon="mail"
              label="Email"
              onPress={onOpenEditEmail}
              value={email}
            />
            {shouldShowWhatsApp ? (
              <>
                <Divider inset={48} />
                <ListRow
                  actionLabel="Ubah"
                  icon="user"
                  label="Nomor WhatsApp"
                  onPress={() => undefined}
                  value="+62 812-3456-7890"
                />
              </>
            ) : null}
          </View>
        </InfoCard>

        <InfoCard>
          <SectionHeader title="Keamanan" variant="overline" />
          <ListRow
            actionLabel="Ubah"
            icon="shield"
            label="Password"
            onPress={onOpenEditPassword}
            value="Kelola password akun Anda"
          />
        </InfoCard>

        <InfoCard>
          <SectionHeader title="Privasi" variant="overline" />
          <ListRow
            icon="info"
            label="Kebijakan Privasi"
            onPress={() => openExternalPage(PRIVACY_POLICY_URL)}
            value="Data yang dikumpulkan dan cara penggunaannya."
          />
          <Divider inset={48} />
          <ListRow
            destructive
            icon="alert"
            label="Hapus Akun"
            onPress={confirmAccountDeletionRequest}
            value="Ajukan penghapusan akun dan data terkait."
          />
        </InfoCard>

        <InfoCard>
          <ListRow
            icon="switch"
            label="Pilih Sekolah Lain"
            onPress={onSwitchSchool}
            value="Kembali ke halaman pemilihan sekolah tanpa logout."
          />
          <Divider inset={48} />
          <ListRow
            destructive
            icon="logout"
            label="Keluar"
            onPress={onLogout}
            value="Keluar dari akun dan kembali ke halaman login."
          />
        </InfoCard>
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
});
