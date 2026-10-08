import React, { PropsWithChildren, ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar as SharedAvatar,
  EmptyState,
  IconButton as SharedIconButton,
  InlineAlert,
  LoadingState,
  PrimaryButton,
  ScreenHeader,
  SectionHeader as SharedSectionHeader,
  SegmentedControl,
  getInitials as sharedGetInitials,
  type ButtonVariant,
} from '../../../shared/components';
import { colors, layout, radius, shadows, spacing, typography } from '../../../theme';
import { Icon, type IconName } from './icons';

/** Lebar maksimum konten agar tetap nyaman dibaca di layar web lebar. */
export const CONTENT_MAX_WIDTH = 960;
export const MIN_TOUCH = layout.minTouchTarget;

/** Bayangan kartu standar (token tema, native + web). */
export const elevation = shadows.sm;

// ---------------------------------------------------------------------------
// Layout halaman
// ---------------------------------------------------------------------------

type PageLayoutProps = PropsWithChildren<{
  title: string;
  subtitle?: string | null;
  onBack?: () => void;
  headerRight?: ReactNode;
  /** Konten tambahan tetap (mis. search bar / tab) di bawah judul. */
  headerBottom?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function PageLayout({
  title,
  subtitle,
  onBack,
  headerRight,
  headerBottom,
  refreshing = false,
  onRefresh,
  contentStyle,
  children,
}: PageLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <ScreenHeader
            bordered={false}
            onBack={onBack}
            right={headerRight}
            style={styles.screenHeader}
            subtitle={subtitle ?? undefined}
            title={title}
            withTopInset={false}
          />
          {headerBottom ? <View style={styles.headerBottom}>{headerBottom}</View> : null}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
        }>
        <View style={[styles.contentInner, contentStyle]}>{children}</View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tombol
// ---------------------------------------------------------------------------

type IconButtonProps = {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: 'default' | 'primary';
  disabled?: boolean;
};

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  tone = 'default',
  disabled = false,
}: IconButtonProps) {
  const isPrimary = tone === 'primary';
  return (
    <SharedIconButton
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      variant={isPrimary ? 'filled' : 'ghost'}>
      <Icon
        color={isPrimary ? colors.text.inverse : colors.text.secondary}
        name={icon}
        size={20}
      />
    </SharedIconButton>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

const VARIANT_MAP: Record<NonNullable<ActionButtonProps['variant']>, ButtonVariant> = {
  primary: 'primary',
  secondary: 'outline',
  ghost: 'secondary',
  danger: 'dangerOutline',
};

const ICON_COLOR: Record<NonNullable<ActionButtonProps['variant']>, string> = {
  primary: colors.text.inverse,
  secondary: colors.brand.primary700,
  ghost: colors.brand.primary700,
  danger: colors.feedback.errorText,
};

/** Pembungkus PrimaryButton bersama dengan dukungan ikon dashboard. */
export function ActionButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  compact = false,
}: ActionButtonProps) {
  return (
    <PrimaryButton
      disabled={disabled}
      label={label}
      leftIcon={icon ? <Icon color={ICON_COLOR[variant]} name={icon} size={18} /> : undefined}
      loading={loading}
      onPress={onPress}
      size={compact ? 'sm' : 'md'}
      style={style}
      variant={VARIANT_MAP[variant]}
    />
  );
}

// ---------------------------------------------------------------------------
// Input pencarian
// ---------------------------------------------------------------------------

type SearchFieldProps = Omit<TextInputProps, 'style'> & {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SearchField({ value, onChangeText, onSubmit, style, ...rest }: SearchFieldProps) {
  return (
    <View style={[styles.searchField, style]}>
      <Icon color={colors.text.muted} name="search" size={18} />
      <TextInput
        autoCorrect={false}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholderTextColor={colors.text.muted}
        returnKeyType="search"
        style={styles.searchInput}
        value={value}
        {...rest}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel="Hapus pencarian"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onChangeText('')}
          style={styles.searchClear}>
          <Icon color={colors.text.muted} name="close" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// State: loading / error / kosong
// ---------------------------------------------------------------------------

type StateViewProps = {
  kind: 'loading' | 'error' | 'empty' | 'info';
  title: string;
  description?: string | null;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
  compact?: boolean;
};

/** Satu pintu untuk state loading/error/kosong memakai komponen bersama. */
export function StateView({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  icon,
  compact = false,
}: StateViewProps) {
  if (kind === 'loading') {
    return <LoadingState label={title} style={styles.stateLoading} />;
  }
  if (kind === 'error') {
    return (
      <InlineAlert
        actionLabel={actionLabel}
        message={description ?? 'Terjadi kesalahan. Silakan coba lagi.'}
        onAction={actionLabel ? onAction : undefined}
        title={title}
        tone="error"
      />
    );
  }
  return (
    <EmptyState
      actionLabel={actionLabel}
      compact={compact}
      description={description ?? undefined}
      icon={
        <Icon
          color={colors.brand.primary600}
          name={icon ?? (kind === 'info' ? 'info' : 'search')}
          size={compact ? 20 : 26}
        />
      }
      onAction={onAction}
      style={styles.state}
      title={title}
    />
  );
}

export function InlineError({ message }: { message: string | null | undefined }) {
  if (!message) {
    return null;
  }
  return <InlineAlert message={message} tone="error" />;
}

export function InlineNotice({
  message,
  tone = 'info',
}: {
  message: string;
  tone?: 'info' | 'success' | 'warning';
}) {
  return <InlineAlert message={message} tone={tone} />;
}

// ---------------------------------------------------------------------------
// Kartu & tile
// ---------------------------------------------------------------------------

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string | null;
  action?: ReactNode;
}) {
  return <SharedSectionHeader action={action} description={description ?? undefined} title={title} />;
}

type StatTileProps = {
  label: string;
  value: string;
  unit?: string;
  note?: string | null;
  icon?: IconName;
  accent?: string;
  loading?: boolean;
};

export function StatTile({ label, value, unit, note, icon, accent, loading }: StatTileProps) {
  const accentColor = accent ?? colors.brand.primary500;
  return (
    <View style={styles.statTile}>
      <View style={styles.statTileHeader}>
        {icon ? (
          <View style={[styles.statTileIcon, { backgroundColor: colors.brand.primary50 }]}>
            <Icon color={accentColor} name={icon} size={16} />
          </View>
        ) : (
          <View style={[styles.statTileDot, { backgroundColor: accentColor }]} />
        )}
        <Text numberOfLines={1} style={styles.statTileLabel}>
          {label}
        </Text>
      </View>
      {loading ? (
        <View style={styles.statTileSkeleton} />
      ) : (
        <View style={styles.statTileValueRow}>
          <Text numberOfLines={1} style={styles.statTileValue}>
            {value}
          </Text>
          {unit ? <Text style={styles.statTileUnit}>{unit}</Text> : null}
        </View>
      )}
      {note ? (
        <Text numberOfLines={2} style={styles.statTileNote}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

/** Grid responsif: item mengisi baris dan melebar di layar web. */
export function TileGrid({ children }: PropsWithChildren) {
  return <View style={styles.tileGrid}>{children}</View>;
}

export function Avatar({
  name,
  imageUrl,
  size = 44,
}: {
  name: string;
  imageUrl?: string | null;
  size?: number;
}) {
  return <SharedAvatar imageUrl={imageUrl} name={name} size={size} />;
}

export function getInitials(name: string): string {
  return sharedGetInitials(name, '?');
}

type ListItemProps = {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function ListItem({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
}: ListItemProps) {
  const content = (
    <>
      {leading}
      <View style={styles.listItemCopy}>
        <Text numberOfLines={1} style={styles.listItemTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.listItemSubtitle}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text numberOfLines={1} style={styles.listItemMeta}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing ??
        (onPress ? <Icon color={colors.text.muted} name="chevron-right" size={18} /> : null)}
    </>
  );

  if (!onPress) {
    return <View style={styles.listItem}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.listItem, pressed && styles.listItemPressed]}>
      {content}
    </Pressable>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
}) {
  const palette = BADGE_PALETTE[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text numberOfLines={1} style={[styles.badgeLabel, { color: palette.text }]}>
        {label}
      </Text>
    </View>
  );
}

const BADGE_PALETTE = {
  neutral: { background: colors.surface.secondary, text: colors.text.secondary },
  primary: { background: colors.brand.primary100, text: colors.brand.primary700 },
  success: { background: colors.feedback.successBackground, text: colors.status.sync.synced },
  warning: { background: colors.feedback.warningBackground, text: colors.text.primary },
  danger: { background: colors.feedback.errorBackground, text: colors.feedback.errorText },
} as const;

// ---------------------------------------------------------------------------
// Tab segmen
// ---------------------------------------------------------------------------

type SegmentedTabsProps<TKey extends string> = {
  tabs: Array<{ key: TKey; label: string }>;
  value: TKey;
  onChange: (key: TKey) => void;
};

export function SegmentedTabs<TKey extends string>({
  tabs,
  value,
  onChange,
}: SegmentedTabsProps<TKey>) {
  return (
    <SegmentedControl
      onChange={onChange}
      options={tabs.map(tab => ({ value: tab.key, label: tab.label }))}
      value={value}
    />
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  onRemove,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress ?? onRemove}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}>
      {selected && !onRemove ? (
        <Icon color={colors.brand.primary700} name="check" size={14} />
      ) : null}
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
      {onRemove ? <Icon color={colors.brand.primary700} name="close" size={14} /> : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Baris info (label - nilai)
// ---------------------------------------------------------------------------

export function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value && value.trim().length > 0 ? value : '-'}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Format
// ---------------------------------------------------------------------------

export function formatDate(value?: string | null, month: 'short' | 'long' = 'short'): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month, year: 'numeric' }).format(date);
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  return value.toFixed(digits).replace(/\.0+$/, '').replace('.', ',');
}

export function formatGender(value?: string | null): string {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'laki-laki' || normalized === 'l') {
    return 'Laki-laki';
  }
  if (normalized === 'female' || normalized === 'perempuan' || normalized === 'p') {
    return 'Perempuan';
  }
  return '-';
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  header: {
    backgroundColor: colors.surface.app,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingBottom: spacing[12],
  },
  screenHeader: {
    paddingHorizontal: 0,
    paddingBottom: spacing[4],
  },
  headerInner: {
    paddingHorizontal: layout.screenPaddingX,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing[12],
  },
  headerBottom: {
    gap: spacing[10],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing[16],
    paddingBottom: spacing[32],
  },
  contentInner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing[16],
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[10],
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.secondary,
    paddingLeft: spacing[14],
    paddingRight: spacing[6],
  },
  searchInput: {
    ...typography.bodyMd,
    flex: 1,
    minHeight: 46,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  searchClear: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  state: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
  },
  stateLoading: {
    paddingVertical: spacing[32],
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing[16],
    gap: spacing[12],
    ...elevation,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
  },
  statTile: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 104,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing[14],
    gap: spacing[8],
    ...elevation,
  },
  statTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  statTileIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statTileLabel: {
    ...typography.bodySm,
    flex: 1,
    color: colors.text.secondary,
  },
  statTileValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[4],
  },
  statTileValue: {
    ...typography.headingXL,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statTileUnit: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  statTileNote: {
    ...typography.caption,
    color: colors.text.muted,
  },
  statTileSkeleton: {
    height: 30,
    width: '60%',
    borderRadius: radius.xs,
    backgroundColor: colors.surface.secondary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    minHeight: 68,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[12],
  },
  listItemPressed: {
    borderColor: colors.brand.primary300,
    backgroundColor: colors.brand.primary50,
  },
  listItemCopy: {
    flex: 1,
    gap: spacing[2],
  },
  listItemTitle: {
    ...typography.labelLg,
    color: colors.text.primary,
  },
  listItemSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  listItemMeta: {
    ...typography.caption,
    color: colors.text.muted,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[4],
    alignSelf: 'flex-start',
  },
  badgeLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.primary,
    paddingHorizontal: spacing[12],
  },
  chipSelected: {
    borderColor: colors.brand.primary300,
    backgroundColor: colors.brand.primary100,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  chipLabelSelected: {
    color: colors.brand.primary700,
  },
  infoRow: {
    gap: spacing[2],
    paddingVertical: spacing[10],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  infoValue: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
});
