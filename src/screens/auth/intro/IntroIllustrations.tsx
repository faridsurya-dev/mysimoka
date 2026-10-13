import React, { createContext, PropsWithChildren, useContext } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '../../../theme';

// Vector scenes for the intro slides. Each scene is drawn on a 280x220 grid
// and split into small SVG layers so every layer can slide/fade in on the
// native driver. `progress` runs 0 -> 1 when a slide is first shown.

export const SCENE_WIDTH = 280;
export const SCENE_HEIGHT = 220;

type SceneContextValue = { scale: number; progress: Animated.Value };

const SceneContext = createContext<SceneContextValue | null>(null);

/** Where a layer comes from; `grow` scales up from its bottom edge. */
type Enter = 'up' | 'down' | 'left' | 'right' | 'pop' | 'fade' | 'grow';

type LayerProps = PropsWithChildren<{
  x: number;
  y: number;
  w: number;
  h: number;
  /** Part of the 0..1 progress this layer animates in. Omit for a static layer. */
  at?: [number, number];
  enter?: Enter;
}>;

const TRAVEL = 18;

function Layer({ x, y, w, h, at, enter = 'up', children }: LayerProps) {
  const scene = useContext(SceneContext);
  if (!scene) {
    return null;
  }
  const { scale, progress } = scene;

  let animatedStyle: Record<string, unknown> = {};
  if (at) {
    const t = progress.interpolate({
      inputRange: at,
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    const distance = TRAVEL * scale;
    const shift = (from: number) =>
      t.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
    const transforms: Record<Enter, object[]> = {
      up: [{ translateY: shift(distance) }],
      down: [{ translateY: shift(-distance) }],
      left: [{ translateX: shift(-distance) }],
      right: [{ translateX: shift(distance) }],
      pop: [
        { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
      ],
      fade: [],
      grow: [{ scaleY: t }],
    };
    animatedStyle = {
      opacity: enter === 'grow' ? 1 : t,
      transform: transforms[enter],
      ...(enter === 'grow' ? { transformOrigin: 'bottom' } : null),
    };
  }

  return (
    <Animated.View
      style={[
        styles.layer,
        {
          left: x * scale,
          top: y * scale,
          width: w * scale,
          height: h * scale,
        },
        animatedStyle,
      ]}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`}>
        {children}
      </Svg>
    </Animated.View>
  );
}

/**
 * White panel that slides off to the right, uncovering what is drawn under it
 * (used to "draw" a chart line from left to right).
 */
function Reveal({
  x,
  y,
  w,
  h,
  at,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  at: [number, number];
}) {
  const scene = useContext(SceneContext);
  if (!scene) {
    return null;
  }
  const { scale, progress } = scene;
  const translateX = progress.interpolate({
    inputRange: at,
    outputRange: [0, w * scale],
    extrapolate: 'clamp',
  });
  return (
    <View
      style={[
        styles.layer,
        styles.clip,
        {
          left: x * scale,
          top: y * scale,
          width: w * scale,
          height: h * scale,
        },
      ]}
    >
      <Animated.View style={[styles.cover, { transform: [{ translateX }] }]} />
    </View>
  );
}

function SceneFrame({
  size,
  progress,
  children,
}: PropsWithChildren<{ size: number; progress: Animated.Value }>) {
  const scale = size / SCENE_WIDTH;
  return (
    <SceneContext.Provider value={{ scale, progress }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: size, height: SCENE_HEIGHT * scale }}
      >
        <Layer x={0} y={0} w={SCENE_WIDTH} h={SCENE_HEIGHT}>
          <Circle cx={140} cy={112} r={100} fill={colors.brand.primary100} />
          <Circle cx={236} cy={34} r={14} fill={colors.brand.primary200} />
          <Circle cx={38} cy={192} r={9} fill={colors.brand.primary200} />
        </Layer>
        {children}
      </View>
    </SceneContext.Provider>
  );
}

const card = {
  fill: colors.surface.card,
  stroke: colors.border.strong,
  strokeWidth: 1,
} as const;

function CheckBadge({
  size,
  color = colors.accent.teal,
}: {
  size: number;
  color?: string;
}) {
  const r = size / 2;
  return (
    <>
      <Circle cx={r} cy={r} r={r - 1} fill={color} />
      <Path
        d={`M${size * 0.28} ${size * 0.52} L${size * 0.44} ${size * 0.67} L${
          size * 0.73
        } ${size * 0.36}`}
        stroke={colors.neutral[0]}
        strokeWidth={size * 0.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  );
}

type SceneProps = { size: number; progress: Animated.Value };

/** Slide 1: find a student by name or face photo. */
export function IdentifyScene({ size, progress }: SceneProps) {
  return (
    <SceneFrame size={size} progress={progress}>
      {/* Phone with face scan */}
      <Layer x={100} y={14} w={96} h={186} at={[0, 0.4]} enter="up">
        <Rect
          x={1}
          y={1}
          width={94}
          height={184}
          rx={16}
          fill={colors.neutral[900]}
        />
        <Rect
          x={7}
          y={14}
          width={82}
          height={160}
          rx={8}
          fill={colors.brand.primary50}
        />
        <Rect
          x={38}
          y={6}
          width={20}
          height={3}
          rx={1.5}
          fill={colors.neutral[700]}
        />
        <Circle cx={48} cy={68} r={18} fill={colors.brand.primary300} />
        <Path
          d="M20 124 C20 100 76 100 76 124 Z"
          fill={colors.brand.primary300}
        />
        <Path
          d="M18 44 V36 H26 M70 36 H78 V44 M78 100 V108 H70 M26 108 H18 V100"
          stroke={colors.brand.primary600}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Rect
          x={20}
          y={134}
          width={56}
          height={8}
          rx={4}
          fill={colors.brand.primary200}
        />
        <Rect
          x={28}
          y={148}
          width={40}
          height={6}
          rx={3}
          fill={colors.neutral[300]}
        />
      </Layer>
      {/* Scan line sweeping the face */}
      <Layer x={118} y={80} w={60} h={4} at={[0.3, 0.55]} enter="down">
        <Rect
          x={0}
          y={0}
          width={60}
          height={4}
          rx={2}
          fill={colors.brand.primary500}
          opacity={0.7}
        />
      </Layer>
      {/* Class list with search */}
      <Layer x={10} y={44} w={100} h={96} at={[0.25, 0.6]} enter="left">
        <Rect x={0.5} y={0.5} width={99} height={95} rx={12} {...card} />
        <Rect
          x={10}
          y={10}
          width={80}
          height={16}
          rx={8}
          fill={colors.neutral[100]}
        />
        <Circle
          cx={20}
          cy={18}
          r={4}
          stroke={colors.neutral[500]}
          strokeWidth={1.6}
          fill="none"
        />
        <Line
          x1={23}
          y1={21}
          x2={26}
          y2={24}
          stroke={colors.neutral[500]}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        {[38, 56, 74].map((rowY, index) => (
          <G key={rowY}>
            <Circle
              cx={18}
              cy={rowY + 5}
              r={6}
              fill={
                index === 1 ? colors.brand.primary500 : colors.brand.primary200
              }
            />
            <Rect
              x={30}
              y={rowY + 1}
              width={index === 1 ? 52 : 44}
              height={5}
              rx={2.5}
              fill={colors.neutral[400]}
            />
            <Rect
              x={30}
              y={rowY + 8}
              width={30}
              height={4}
              rx={2}
              fill={colors.neutral[200]}
            />
          </G>
        ))}
      </Layer>
      {/* Match found */}
      <Layer x={186} y={60} w={84} h={30} at={[0.5, 0.8]} enter="right">
        <Rect x={0.5} y={0.5} width={83} height={29} rx={15} {...card} />
        <Circle cx={15} cy={15} r={6} fill={colors.accent.teal} />
        <Rect
          x={27}
          y={9}
          width={44}
          height={5}
          rx={2.5}
          fill={colors.neutral[700]}
        />
        <Rect
          x={27}
          y={17}
          width={30}
          height={4}
          rx={2}
          fill={colors.neutral[300]}
        />
      </Layer>
      <Layer x={170} y={136} w={42} h={42} at={[0.6, 0.9]} enter="pop">
        <CheckBadge size={42} />
      </Layer>
    </SceneFrame>
  );
}

/** Slide 2: height + weight from a Bluetooth device or typed in, saved offline. */
export function MeasureScene({ size, progress }: SceneProps) {
  return (
    <SceneFrame size={size} progress={progress}>
      {/* Height ruler */}
      <Layer x={36} y={14} w={22} h={182} at={[0, 0.35]} enter="up">
        <Rect
          x={1}
          y={1}
          width={20}
          height={180}
          rx={4}
          fill={colors.neutral[0]}
          stroke={colors.brand.primary300}
        />
        {Array.from({ length: 14 }, (_, index) => (
          <Line
            key={index}
            x1={1}
            y1={12 + index * 12}
            x2={index % 2 === 0 ? 13 : 8}
            y2={12 + index * 12}
            stroke={colors.brand.primary400}
            strokeWidth={1.5}
          />
        ))}
      </Layer>
      {/* Scale platform */}
      <Layer x={50} y={176} w={84} h={20} at={[0.05, 0.35]} enter="fade">
        <Rect
          x={0}
          y={2}
          width={84}
          height={16}
          rx={6}
          fill={colors.neutral[800]}
        />
        <Rect
          x={32}
          y={6}
          width={20}
          height={7}
          rx={2}
          fill={colors.accent.teal}
        />
      </Layer>
      {/* Student */}
      <Layer x={64} y={42} w={56} h={136} at={[0.15, 0.5]} enter="up">
        <Circle cx={28} cy={16} r={14} fill={colors.brand.primary300} />
        <Path
          d="M10 46 Q10 34 22 34 H34 Q46 34 46 46 V86 H10 Z"
          fill={colors.brand.primary500}
        />
        <Rect
          x={14}
          y={84}
          width={12}
          height={52}
          rx={5}
          fill={colors.neutral[700]}
        />
        <Rect
          x={30}
          y={84}
          width={12}
          height={52}
          rx={5}
          fill={colors.neutral[700]}
        />
      </Layer>
      {/* Head board drops onto the head */}
      <Layer x={36} y={34} w={92} h={10} at={[0.35, 0.6]} enter="down">
        <Rect
          x={0}
          y={1}
          width={92}
          height={8}
          rx={4}
          fill={colors.accent.amber}
        />
      </Layer>
      {/* Reading on the phone */}
      <Layer x={162} y={40} w={100} h={112} at={[0.4, 0.7]} enter="right">
        <Rect x={0.5} y={0.5} width={99} height={111} rx={14} {...card} />
        <Rect
          x={12}
          y={14}
          width={8}
          height={22}
          rx={3}
          fill={colors.brand.primary400}
        />
        <SvgText
          x={28}
          y={32}
          fontSize={18}
          fontWeight="700"
          fill={colors.text.primary}
        >
          128
        </SvgText>
        <SvgText x={66} y={32} fontSize={10} fill={colors.text.muted}>
          cm
        </SvgText>
        <Line x1={12} y1={50} x2={88} y2={50} stroke={colors.border.subtle} />
        <Rect
          x={12}
          y={62}
          width={8}
          height={22}
          rx={3}
          fill={colors.accent.amber}
        />
        <SvgText
          x={28}
          y={80}
          fontSize={18}
          fontWeight="700"
          fill={colors.text.primary}
        >
          26,4
        </SvgText>
        <SvgText x={70} y={80} fontSize={10} fill={colors.text.muted}>
          kg
        </SvgText>
        <Rect
          x={12}
          y={94}
          width={76}
          height={8}
          rx={4}
          fill={colors.brand.primary100}
        />
      </Layer>
      {/* Bluetooth link (optional device) */}
      <Layer x={136} y={92} w={32} h={32} at={[0.55, 0.8]} enter="pop">
        <Circle cx={16} cy={16} r={15} fill={colors.brand.primary600} />
        <Path
          d="M11 11 L21 21 L16 26 V6 L21 11 L11 21"
          stroke={colors.neutral[0]}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Layer>
      {/* Saved, synced later when back online */}
      <Layer x={196} y={160} w={64} h={42} at={[0.7, 1]} enter="up">
        <Path
          d="M16 38 C6 38 2 30 6 24 C8 20 12 19 15 19 C16 10 24 4 33 5 C41 6 46 12 47 19 C55 19 61 24 60 31 C59 36 55 38 50 38 Z"
          fill={colors.brand.primary50}
          stroke={colors.brand.primary400}
          strokeWidth={2}
        />
        <Path
          d="M32 32 V18 M26 23 L32 17 L38 23"
          stroke={colors.brand.primary600}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Layer>
    </SceneFrame>
  );
}

const BAR_HEIGHTS = [38, 60, 48, 76, 56];
const BAR_COLORS = [
  colors.brand.primary300,
  colors.brand.primary500,
  colors.brand.primary300,
  colors.brand.primary600,
  colors.accent.amber,
];

/** Slide 3: class/session recap, nutrition status chart, students to watch. */
export function DashboardScene({ size, progress }: SceneProps) {
  const donutRadius = 22;
  const circumference = 2 * Math.PI * donutRadius;
  const segments = [
    { color: colors.accent.teal, share: 0.62 },
    { color: colors.accent.amber, share: 0.24 },
    { color: colors.accent.red, share: 0.14 },
  ];
  let offset = 0;

  return (
    <SceneFrame size={size} progress={progress}>
      <Layer x={24} y={22} w={232} h={152} at={[0, 0.3]} enter="up">
        <Rect x={0.5} y={0.5} width={231} height={151} rx={16} {...card} />
        <Rect
          x={16}
          y={16}
          width={70}
          height={7}
          rx={3.5}
          fill={colors.neutral[700]}
        />
        <Rect
          x={16}
          y={28}
          width={44}
          height={5}
          rx={2.5}
          fill={colors.neutral[300]}
        />
        <Rect
          x={170}
          y={14}
          width={46}
          height={16}
          rx={8}
          fill={colors.brand.primary100}
        />
        <Line
          x1={16}
          y1={132}
          x2={144}
          y2={132}
          stroke={colors.border.strong}
        />
      </Layer>
      {BAR_HEIGHTS.map((height, index) => (
        <Layer
          key={index}
          x={44 + index * 24}
          y={154 - height}
          w={14}
          h={height}
          at={[0.2 + index * 0.07, 0.5 + index * 0.07]}
          enter="grow"
        >
          <Rect
            x={0}
            y={0}
            width={14}
            height={height}
            rx={4}
            fill={BAR_COLORS[index]}
          />
        </Layer>
      ))}
      {/* Nutrition status donut */}
      <Layer x={176} y={70} w={64} h={64} at={[0.45, 0.75]} enter="pop">
        <G rotation={-90} origin="32, 32">
          {segments.map(segment => {
            const length = segment.share * circumference;
            const element = (
              <Circle
                key={segment.color}
                cx={32}
                cy={32}
                r={donutRadius}
                stroke={segment.color}
                strokeWidth={10}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                fill="none"
              />
            );
            offset += length;
            return element;
          })}
        </G>
      </Layer>
      {/* Students who need attention */}
      <Layer x={112} y={162} w={152} h={34} at={[0.7, 1]} enter="up">
        <Rect
          x={0.5}
          y={0.5}
          width={151}
          height={33}
          rx={17}
          fill={colors.feedback.errorBackground}
          stroke={colors.feedback.errorBorder}
        />
        <Circle cx={17} cy={17} r={7} fill={colors.accent.red} />
        <Rect
          x={16}
          y={12}
          width={2}
          height={6}
          rx={1}
          fill={colors.neutral[0]}
        />
        <Circle cx={17} cy={21} r={1.2} fill={colors.neutral[0]} />
        <SvgText
          x={32}
          y={21}
          fontSize={11}
          fontWeight="600"
          fill={colors.feedback.errorText}
        >
          3 siswa perlu perhatian
        </SvgText>
      </Layer>
    </SceneFrame>
  );
}

/** Slide 4: per-student history (growth + immunization), Excel export. */
export function HistoryScene({ size, progress }: SceneProps) {
  return (
    <SceneFrame size={size} progress={progress}>
      {/* Student profile with growth line */}
      <Layer x={16} y={18} w={168} h={132} at={[0, 0.3]} enter="up">
        <Rect x={0.5} y={0.5} width={167} height={131} rx={16} {...card} />
        <Circle cx={28} cy={28} r={13} fill={colors.brand.primary300} />
        <Rect
          x={48}
          y={20}
          width={64}
          height={7}
          rx={3.5}
          fill={colors.neutral[700]}
        />
        <Rect
          x={48}
          y={32}
          width={40}
          height={5}
          rx={2.5}
          fill={colors.neutral[300]}
        />
        {[62, 84, 106].map(lineY => (
          <Line
            key={lineY}
            x1={14}
            y1={lineY}
            x2={154}
            y2={lineY}
            stroke={colors.border.subtle}
          />
        ))}
        <Path
          d="M18 112 L46 100 L74 94 L102 80 L130 70 L152 56"
          stroke={colors.brand.primary600}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {[
          [18, 112],
          [46, 100],
          [74, 94],
          [102, 80],
          [130, 70],
          [152, 56],
        ].map(([cx, cy]) => (
          <Circle
            key={cx}
            cx={cx}
            cy={cy}
            r={3.5}
            fill={colors.neutral[0]}
            stroke={colors.brand.primary600}
            strokeWidth={2}
          />
        ))}
      </Layer>
      <Reveal x={28} y={70} w={146} h={66} at={[0.25, 0.7]} />
      {/* Immunization checklist */}
      <Layer x={150} y={96} w={116} h={96} at={[0.45, 0.75]} enter="right">
        <Rect x={0.5} y={0.5} width={115} height={95} rx={14} {...card} />
        {[24, 48, 72].map((rowY, index) => (
          <G key={rowY}>
            <Circle
              cx={20}
              cy={rowY}
              r={8}
              fill={colors.feedback.successBackground}
            />
            <Rect
              x={36}
              y={rowY - 5}
              width={index === 2 ? 46 : 62}
              height={5}
              rx={2.5}
              fill={colors.neutral[600]}
            />
            <Rect
              x={36}
              y={rowY + 3}
              width={36}
              height={4}
              rx={2}
              fill={colors.neutral[300]}
            />
          </G>
        ))}
      </Layer>
      {[0, 1, 2].map(index => (
        <Layer
          key={index}
          x={160}
          y={110 + index * 24}
          w={20}
          h={20}
          at={[0.65 + index * 0.08, 0.85 + index * 0.05]}
          enter="pop"
        >
          <CheckBadge size={20} />
        </Layer>
      ))}
      {/* Excel export */}
      <Layer x={42} y={150} w={50} h={58} at={[0.75, 1]} enter="pop">
        <Path
          d="M2 4 Q2 1 5 1 H34 L48 15 V53 Q48 57 44 57 H5 Q2 57 2 53 Z"
          {...card}
        />
        <Path
          d="M34 1 V15 H48"
          fill={colors.neutral[100]}
          stroke={colors.border.strong}
        />
        <Rect
          x={8}
          y={28}
          width={34}
          height={18}
          rx={4}
          fill={colors.accent.teal}
        />
        <SvgText
          x={25}
          y={41}
          fontSize={10}
          fontWeight="700"
          fill={colors.neutral[0]}
          textAnchor="middle"
        >
          XLS
        </SvgText>
      </Layer>
    </SceneFrame>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
  },
  clip: {
    overflow: 'hidden',
  },
  cover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface.card,
  },
});
