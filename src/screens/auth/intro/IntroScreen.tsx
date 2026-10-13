import React, {
  ComponentType,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHardwareBack } from '../../../navigation/hardwareBack';
import {
  PaginationDots,
  PrimaryButton,
  TextLink,
} from '../../../shared/components';
import { colors, layout, spacing, typography } from '../../../theme';
import {
  DashboardScene,
  HistoryScene,
  IdentifyScene,
  MeasureScene,
  SCENE_HEIGHT,
  SCENE_WIDTH,
} from './IntroIllustrations';

type IntroScreenProps = {
  /** Called by "Mulai" on the last slide and by "Lewati". */
  onFinish: () => void;
};

type Slide = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  Scene: ComponentType<{ size: number; progress: Animated.Value }>;
};

// Copy follows the "Alur kerja SmartGrowth" section of the landing page.
const SLIDES: Slide[] = [
  {
    key: 'identify',
    eyebrow: 'Kenali siswa',
    title: 'Temukan siswa dengan cepat',
    body: 'Cari nama di daftar kelas atau ambil foto wajahnya. Data siswa langsung terbuka untuk diukur.',
    Scene: IdentifyScene,
  },
  {
    key: 'measure',
    eyebrow: 'Ukur dan simpan',
    title: 'Catat tinggi dan berat',
    body: 'Isi manual atau baca dari alat ukur Bluetooth (opsional). Tanpa sinyal pun data tersimpan dan dikirim saat online.',
    Scene: MeasureScene,
  },
  {
    key: 'dashboard',
    eyebrow: 'Pantau di dashboard',
    title: 'Status gizi tiap kelas',
    body: 'Rekap per kelas dan sesi, grafik status gizi, dan siswa yang perlu perhatian menurut referensi WHO 2007.',
    Scene: DashboardScene,
  },
  {
    key: 'history',
    eyebrow: 'Riwayat per siswa',
    title: 'Riwayat tumbuh tetap tersimpan',
    body: 'Tinggi, berat, dan imunisasi tercatat dari sesi ke sesi. Rekapnya bisa diekspor ke Excel.',
    Scene: HistoryScene,
  },
];

const LAST_INDEX = SLIDES.length - 1;
/** Text never grows past this, so the slide still fits on 360x640 phones. */
const MAX_FONT_SCALE = 1.3;
const SCENE_PADDING = spacing[8];

/**
 * First-launch intro before Login: swipeable slides with an animated vector
 * scene each. All motion is skipped when the system "reduce motion" setting is on.
 */
export function IntroScreen({ onFinish }: IntroScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: pageWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const progress = useRef(SLIDES.map(() => new Animated.Value(0))).current;
  const playedRef = useRef(SLIDES.map(() => false));
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [pagerHeight, setPagerHeight] = useState(0);
  // Free space above the copy, per slide (the copy differs in length).
  const [sceneAreas, setSceneAreas] = useState<
    Array<{ width: number; height: number }>
  >(() => SLIDES.map(() => ({ width: 0, height: 0 })));

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (isMounted) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReduceMotion(false);
        }
      });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  // Play a slide's scene the first time it is shown; with reduce motion every
  // scene is simply drawn complete.
  useEffect(() => {
    if (reduceMotion === null) {
      return;
    }
    if (reduceMotion) {
      progress.forEach(value => value.setValue(1));
      return;
    }
    if (playedRef.current[index]) {
      return;
    }
    playedRef.current[index] = true;
    Animated.timing(progress[index], {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, progress, reduceMotion]);

  const goTo = useCallback(
    (target: number) => {
      const next = Math.max(0, Math.min(LAST_INDEX, target));
      scrollRef.current?.scrollTo({
        x: next * pageWidth,
        animated: !reduceMotion,
      });
      setIndex(next);
    },
    [pageWidth, reduceMotion],
  );

  // Hardware back steps back through the slides; on the first one it falls
  // through to RootNavigator ("Tekan sekali lagi untuk keluar").
  useHardwareBack(() => {
    if (index > 0) {
      goTo(index - 1);
      return true;
    }
    return false;
  });

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (pageWidth > 0) {
      setIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
    }
  };

  const onSceneAreaLayout =
    (slideIndex: number) => (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setSceneAreas(previous => {
        const current = previous[slideIndex];
        if (current.width === width && current.height === height) {
          return previous;
        }
        const next = [...previous];
        next[slideIndex] = { width, height };
        return next;
      });
    };

  // Largest scene that fits the free space above the copy, capped for tablets.
  const sceneSizeFor = (slideIndex: number) => {
    const area = sceneAreas[slideIndex];
    const height = area.height - SCENE_PADDING * 2;
    return Math.max(
      0,
      Math.min(area.width, (height * SCENE_WIDTH) / SCENE_HEIGHT, 400),
    );
  };
  const isLast = index === LAST_INDEX;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.topBar}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.brand}>
          MySimoka SmartGrowth
        </Text>
        {isLast ? null : (
          <TextLink
            label="Lewati"
            tone="neutral"
            onPress={onFinish}
            accessibilityLabel="Lewati pengenalan"
          />
        )}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: false,
          },
        )}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onLayout={event => setPagerHeight(event.nativeEvent.layout.height)}
        style={styles.pager}
      >
        {SLIDES.map((slide, slideIndex) => {
          const inputRange = [
            (slideIndex - 1) * pageWidth,
            slideIndex * pageWidth,
            (slideIndex + 1) * pageWidth,
          ];
          // Parallax: the scene trails the page and fades near the edges.
          const parallax = reduceMotion
            ? null
            : {
                opacity: scrollX.interpolate({
                  inputRange,
                  outputRange: [0.2, 1, 0.2],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    translateX: scrollX.interpolate({
                      inputRange,
                      outputRange: [-pageWidth * 0.35, 0, pageWidth * 0.35],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              };
          const { Scene } = slide;
          const sceneSize = sceneSizeFor(slideIndex);

          return (
            <View
              key={slide.key}
              accessibilityElementsHidden={slideIndex !== index}
              importantForAccessibility={
                slideIndex === index ? 'auto' : 'no-hide-descendants'
              }
              style={[
                styles.page,
                { width: pageWidth, height: pagerHeight || undefined },
              ]}
            >
              <View
                style={styles.sceneArea}
                onLayout={onSceneAreaLayout(slideIndex)}
              >
                <Animated.View style={parallax}>
                  {sceneSize > 0 ? (
                    <Scene size={sceneSize} progress={progress[slideIndex]} />
                  ) : null}
                </Animated.View>
              </View>
              <View style={styles.copy}>
                <Text
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  style={styles.eyebrow}
                >
                  {`${slideIndex + 1}/${SLIDES.length} · ${slide.eyebrow}`}
                </Text>
                <Text
                  accessibilityRole="header"
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  style={styles.title}
                >
                  {slide.title}
                </Text>
                <Text
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  style={styles.body}
                >
                  {slide.body}
                </Text>
              </View>
            </View>
          );
        })}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <PaginationDots
          count={SLIDES.length}
          scrollX={scrollX}
          pageWidth={pageWidth}
          activeIndex={index}
        />
        <PrimaryButton
          label={isLast ? 'Mulai' : 'Lanjut'}
          onPress={isLast ? onFinish : () => goTo(index + 1)}
          fullWidth
          testID="intro-next"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTouchTarget + spacing[8],
    paddingHorizontal: layout.screenPaddingX,
  },
  brand: {
    ...typography.overline,
    color: colors.brand.primary700,
  },
  pager: {
    flex: 1,
  },
  page: {
    paddingHorizontal: layout.screenPaddingX,
  },
  sceneArea: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SCENE_PADDING,
  },
  copy: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing[8],
    paddingBottom: spacing[12],
  },
  eyebrow: {
    ...typography.overline,
    color: colors.brand.primary700,
  },
  title: {
    ...typography.headingXL,
    color: colors.text.primary,
  },
  body: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  footer: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing[16],
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing[8],
    paddingBottom: spacing[16],
  },
});
