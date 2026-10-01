import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  loadS400BindKey,
  maskS400BindKey,
  normalizeS400BindKey,
  removeS400BindKey,
  resetAdvertisementCache,
  resolveS400BindKey,
  saveS400BindKey,
  useBindKeys,
} from '../../features/device';
import { InlineAlert, PrimaryButton, TextField } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type S400BindKeyPanelProps = {
  deviceId: string;
};

/**
 * Per-scale bind key for Xiaomi S400 (its weight adverts are AES-CCM encrypted).
 * The key is stored per device id in AsyncStorage and is never logged; the UI
 * only shows its last 4 characters. Optional: without a key, weight is typed manually.
 */
export function S400BindKeyPanel({ deviceId }: S400BindKeyPanelProps) {
  const { byDevice } = useBindKeys();
  const isLoaded = deviceId in byDevice;
  const storedKey = byDevice[deviceId] ?? null;
  const resolved = resolveS400BindKey(deviceId);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadS400BindKey(deviceId).catch(() => undefined);
  }, [deviceId]);

  const showForm = isEditing || (isLoaded && !resolved.key);

  const handleSave = async () => {
    if (!normalizeS400BindKey(draft)) {
      setError('Bind key harus 32 karakter heksadesimal (0-9, a-f).');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await saveS400BindKey(deviceId, draft);
      // Re-decode the scale's current advert frame with the new key.
      resetAdvertisementCache(deviceId);
      setDraft('');
      setIsEditing(false);
    } catch {
      setError('Bind key gagal disimpan. Coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await removeS400BindKey(deviceId);
      setIsEditing(false);
    } catch {
      setError('Bind key gagal dihapus. Coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Bind key timbangan S400</Text>

      {resolved.key && !isEditing ? (
        <View style={styles.keyRow}>
          <Text style={styles.keyText}>
            {resolved.source === 'device'
              ? `Tersimpan untuk alat ini (${maskS400BindKey(resolved.key)})`
              : 'Memakai bind key bawaan aplikasi (build).'}
          </Text>
          <View style={styles.actions}>
            <PrimaryButton
              label={storedKey ? 'Ubah' : 'Isi key alat ini'}
              onPress={() => {
                setDraft('');
                setError(null);
                setIsEditing(true);
              }}
              size="sm"
              variant="outline"
            />
            {storedKey ? (
              <PrimaryButton
                disabled={isSaving}
                label="Hapus"
                onPress={() => {
                  handleRemove().catch(() => undefined);
                }}
                size="sm"
                variant="dangerOutline"
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {showForm ? (
        <View style={styles.form}>
          <TextField
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
            helperText="Tiap timbangan S400 punya key sendiri. Ambil dari akun Mi Home dengan Xiaomi Cloud Tokens Extractor (kolom BLE KEY / bind key, 32 karakter). Tanpa key, berat tetap bisa diisi manual."
            label="Bind key (32 hex)"
            maxLength={47}
            onChangeText={value => {
              setDraft(value);
              setError(null);
            }}
            placeholder="contoh: 0123456789abcdef0123456789abcdef"
            secureTextEntry={false}
            value={draft}
          />
          <View style={styles.actions}>
            <PrimaryButton
              disabled={isSaving || draft.trim().length === 0}
              label="Simpan key"
              loading={isSaving}
              onPress={() => {
                handleSave().catch(() => undefined);
              }}
              size="sm"
            />
            {isEditing ? (
              <PrimaryButton
                disabled={isSaving}
                label="Batal"
                onPress={() => {
                  setIsEditing(false);
                  setError(null);
                }}
                size="sm"
                variant="ghost"
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {Platform.OS === 'ios' ? (
        <InlineAlert
          message="Di iOS alamat MAC timbangan tidak tersedia, sehingga data S400 belum bisa didekripsi. Gunakan HP Android atau isi berat manual."
          tone="warning"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing[8],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.brandSubtle,
    padding: spacing[12],
  },
  title: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  keyRow: {
    gap: spacing[8],
  },
  keyText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  form: {
    gap: spacing[8],
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
});
