import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { InfoCard, PrimaryButton, Screen, TextField } from '../../shared/components';
import { colors, radius, spacing, typography } from '../../theme';

type EditSchoolProfileScreenProps = {
  onBack: () => void;
};

const DISTRICT_OPTIONS = [
  'Sukamaju',
  'Cicendo',
  'Coblong',
  'Bojongloa Kaler',
  'Lengkong',
];

const REGENCY_OPTIONS = [
  'Bandung',
  'Bandung Barat',
  'Cimahi',
  'Sumedang',
  'Garut',
];

const PROVINCE_OPTIONS = [
  'Jawa Barat',
  'DKI Jakarta',
  'Banten',
  'Jawa Tengah',
  'Jawa Timur',
];

export function EditSchoolProfileScreen({ onBack }: EditSchoolProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [schoolName, setSchoolName] = useState('SDN Sukamaju 01');
  const [npsn, setNpsn] = useState('20123456');
  const [address, setAddress] = useState('Jl. Merdeka No. 12');
  const [district, setDistrict] = useState('Sukamaju');
  const [regency, setRegency] = useState('Bandung');
  const [province, setProvince] = useState('Jawa Barat');
  const [activeAutocomplete, setActiveAutocomplete] = useState<
    'district' | 'regency' | 'province' | null
  >(null);

  const filteredDistrictOptions = useMemo(() => {
    const keyword = district.trim().toLowerCase();
    if (!keyword) {
      return DISTRICT_OPTIONS;
    }

    return DISTRICT_OPTIONS.filter(option => option.toLowerCase().includes(keyword));
  }, [district]);

  const filteredRegencyOptions = useMemo(() => {
    const keyword = regency.trim().toLowerCase();
    if (!keyword) {
      return REGENCY_OPTIONS;
    }

    return REGENCY_OPTIONS.filter(option => option.toLowerCase().includes(keyword));
  }, [regency]);

  const filteredProvinceOptions = useMemo(() => {
    const keyword = province.trim().toLowerCase();
    if (!keyword) {
      return PROVINCE_OPTIONS;
    }

    return PROVINCE_OPTIONS.filter(option => option.toLowerCase().includes(keyword));
  }, [province]);

  const isSaveDisabled = useMemo(() => {
    return (
      schoolName.trim().length === 0 ||
      npsn.trim().length === 0 ||
      address.trim().length === 0 ||
      district.trim().length === 0 ||
      regency.trim().length === 0 ||
      province.trim().length === 0
    );
  }, [address, district, npsn, province, regency, schoolName]);

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
              <Text style={styles.pageTitle}>Edit Profil Sekolah</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Screen keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <InfoCard>
          <View style={styles.form}>
            <TextField
              label="Nama Sekolah"
              onChangeText={setSchoolName}
              placeholder="Masukkan nama sekolah"
              value={schoolName}
            />
            <TextField
              keyboardType="number-pad"
              label="NPSN"
              onChangeText={setNpsn}
              placeholder="Masukkan NPSN"
              value={npsn}
            />
            <TextField
              label="Alamat"
              onChangeText={setAddress}
              placeholder="Masukkan alamat sekolah"
              value={address}
            />

            <View style={styles.autocompleteFieldWrap}>
              <Text style={styles.autocompleteLabel}>Kecamatan</Text>
              <TextInput
                onChangeText={text => {
                  setDistrict(text);
                  setActiveAutocomplete('district');
                }}
                onFocus={() => setActiveAutocomplete('district')}
                placeholder="Masukkan kecamatan"
                placeholderTextColor={colors.text.muted}
                style={styles.autocompleteInput}
                value={district}
              />
              {activeAutocomplete === 'district' ? (
                <View style={styles.suggestionWrap}>
                  {filteredDistrictOptions.length > 0 ? (
                    filteredDistrictOptions.slice(0, 6).map(option => (
                      <Pressable
                        key={option}
                        onPressIn={() => {
                          setDistrict(option);
                          setActiveAutocomplete(null);
                        }}
                        style={({ pressed }) => [
                          styles.suggestionItem,
                          pressed && styles.suggestionItemPressed,
                        ]}>
                        <Text style={styles.suggestionLabel}>{option}</Text>
                      </Pressable>
                    ))
                  ) : (
                    <View style={styles.emptySuggestion}>
                      <Text style={styles.emptySuggestionLabel}>Kecamatan tidak ditemukan</Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>

            <View style={styles.autocompleteFieldWrap}>
              <Text style={styles.autocompleteLabel}>Kabupaten</Text>
              <TextInput
                onChangeText={text => {
                  setRegency(text);
                  setActiveAutocomplete('regency');
                }}
                onFocus={() => setActiveAutocomplete('regency')}
                placeholder="Masukkan kabupaten"
                placeholderTextColor={colors.text.muted}
                style={styles.autocompleteInput}
                value={regency}
              />
              {activeAutocomplete === 'regency' ? (
                <View style={styles.suggestionWrap}>
                  {filteredRegencyOptions.length > 0 ? (
                    filteredRegencyOptions.slice(0, 6).map(option => (
                      <Pressable
                        key={option}
                        onPressIn={() => {
                          setRegency(option);
                          setActiveAutocomplete(null);
                        }}
                        style={({ pressed }) => [
                          styles.suggestionItem,
                          pressed && styles.suggestionItemPressed,
                        ]}>
                        <Text style={styles.suggestionLabel}>{option}</Text>
                      </Pressable>
                    ))
                  ) : (
                    <View style={styles.emptySuggestion}>
                      <Text style={styles.emptySuggestionLabel}>Kabupaten tidak ditemukan</Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>

            <View style={styles.autocompleteFieldWrap}>
              <Text style={styles.autocompleteLabel}>Provinsi</Text>
              <TextInput
                onChangeText={text => {
                  setProvince(text);
                  setActiveAutocomplete('province');
                }}
                onFocus={() => setActiveAutocomplete('province')}
                placeholder="Masukkan provinsi"
                placeholderTextColor={colors.text.muted}
                style={styles.autocompleteInput}
                value={province}
              />
              {activeAutocomplete === 'province' ? (
                <View style={styles.suggestionWrap}>
                  {filteredProvinceOptions.length > 0 ? (
                    filteredProvinceOptions.slice(0, 6).map(option => (
                      <Pressable
                        key={option}
                        onPressIn={() => {
                          setProvince(option);
                          setActiveAutocomplete(null);
                        }}
                        style={({ pressed }) => [
                          styles.suggestionItem,
                          pressed && styles.suggestionItemPressed,
                        ]}>
                        <Text style={styles.suggestionLabel}>{option}</Text>
                      </Pressable>
                    ))
                  ) : (
                    <View style={styles.emptySuggestion}>
                      <Text style={styles.emptySuggestionLabel}>Provinsi tidak ditemukan</Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          </View>
        </InfoCard>

        <PrimaryButton
          disabled={isSaveDisabled}
          label="Simpan Profil Sekolah"
          onPress={() => undefined}
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
  autocompleteFieldWrap: {
    gap: spacing[8],
  },
  autocompleteLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
  },
  autocompleteInput: {
    ...typography.bodyMd,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[16],
    color: colors.text.primary,
  },
  suggestionWrap: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    backgroundColor: colors.surface.primary,
    overflow: 'hidden',
  },
  suggestionItem: {
    minHeight: 44,
    paddingHorizontal: spacing[12],
    justifyContent: 'center',
  },
  suggestionItemPressed: {
    backgroundColor: colors.surface.secondary,
  },
  suggestionLabel: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  emptySuggestion: {
    minHeight: 44,
    paddingHorizontal: spacing[12],
    justifyContent: 'center',
  },
  emptySuggestionLabel: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
