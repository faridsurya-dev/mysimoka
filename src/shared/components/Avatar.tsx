import React, { useEffect, useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, typography } from '../../theme';

type AvatarProps = {
  name: string;
  imageUrl?: string | null;
  /** Diameter in px. Default 48. */
  size?: number;
  /** Add a white ring + soft shadow (for hero/profile headers). */
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function getInitials(name: string, fallback = 'OP'): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return fallback;
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({ name, imageUrl, size = 48, ring = false, style }: AvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);
  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);
  const showImage = Boolean(imageUrl) && !hasImageError;
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      accessibilityLabel={`Avatar ${name}`}
      style={[styles.base, dimension, ring && styles.ring, style]}>
      {showImage ? (
        <Image
          onError={() => setHasImageError(true)}
          source={{ uri: imageUrl as string }}
          style={dimension}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            { fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.46) },
          ]}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.brand.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: {
    borderWidth: 3,
    borderColor: colors.neutral[0],
    boxShadow: '0px 6px 16px rgba(17, 29, 42, 0.12)',
  },
  initials: {
    ...typography.labelLg,
    color: colors.brand.primary700,
  },
});
