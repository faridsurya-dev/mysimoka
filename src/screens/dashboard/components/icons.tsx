import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../../theme';

export type IconName =
  | 'back'
  | 'chevron-right'
  | 'chevron-down'
  | 'plus'
  | 'search'
  | 'filter'
  | 'close'
  | 'check'
  | 'edit'
  | 'calendar'
  | 'class'
  | 'student'
  | 'teacher'
  | 'record'
  | 'ruler'
  | 'syringe'
  | 'face'
  | 'refresh'
  | 'info'
  | 'copy';

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({
  name,
  size = 20,
  color = colors.text.secondary,
  strokeWidth = 1.9,
}: IconProps) {
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {renderPaths(name, stroke)}
    </Svg>
  );
}

type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: string;
};

function renderPaths(name: IconName, s: StrokeProps) {
  switch (name) {
    case 'back':
      return <Path d="M15 6l-6 6 6 6" {...s} />;
    case 'chevron-right':
      return <Path d="M9 6l6 6-6 6" {...s} />;
    case 'chevron-down':
      return <Path d="M7 10l5 5 5-5" {...s} />;
    case 'plus':
      return <Path d="M12 5v14M5 12h14" {...s} />;
    case 'search':
      return <Path d="M15.5 15.5L20 20M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z" {...s} />;
    case 'filter':
      return <Path d="M4 6h16M7 12h10M10 18h4" {...s} />;
    case 'close':
      return <Path d="M6 6l12 12M18 6L6 18" {...s} />;
    case 'check':
      return <Path d="M5 12l5 5 9-9" {...s} />;
    case 'edit':
      return (
        <>
          <Path d="M4 20h4l9.5-9.5a1.4 1.4 0 0 0 0-2L15.5 6a1.4 1.4 0 0 0-2 0L4 15.5V20Z" {...s} />
          <Path d="M12.5 7L17 11.5" {...s} />
        </>
      );
    case 'calendar':
      return (
        <>
          <Rect x={3.5} y={5.5} width={17} height={15} rx={3} {...s} />
          <Path d="M7.5 3.5v4M16.5 3.5v4M3.5 10.5h17" {...s} />
        </>
      );
    case 'class':
      return (
        <>
          <Rect x={3.5} y={3.5} width={7} height={7} rx={2} {...s} />
          <Rect x={13.5} y={3.5} width={7} height={5} rx={2} {...s} />
          <Rect x={3.5} y={13.5} width={7} height={7} rx={2} {...s} />
          <Rect x={13.5} y={11.5} width={7} height={9} rx={2} {...s} />
        </>
      );
    case 'student':
      return (
        <>
          <Circle cx={12} cy={8.2} r={3.2} {...s} />
          <Path d="M5 19a7 7 0 0 1 14 0" {...s} />
        </>
      );
    case 'teacher':
      return (
        <>
          <Path d="M3 9.5 12 5l9 4.5-9 4.5L3 9.5Z" {...s} />
          <Path d="M7 12.3V15c0 1.8 2.2 3.3 5 3.3s5-1.5 5-3.3v-2.7" {...s} />
        </>
      );
    case 'record':
      return (
        <>
          <Path d="M6 4v16M6 4h9.5A2.5 2.5 0 0 1 18 6.5v11A2.5 2.5 0 0 1 15.5 20H6" {...s} />
          <Path d="M9 8h3M9 12h5M9 16h3" {...s} />
        </>
      );
    case 'ruler':
      return (
        <>
          <Rect x={7} y={2.5} width={10} height={19} rx={2} {...s} />
          <Path d="M7 7h4M7 11h3M7 15h4" {...s} />
        </>
      );
    case 'syringe':
      return (
        <>
          <Path d="M18 2l4 4M20 4l-9.5 9.5M14 6l4 4M9 11l4 4M4.5 19.5 2 22" {...s} />
          <Path d="M12 7 5 14v5h5l7-7" {...s} />
        </>
      );
    case 'face':
      return (
        <>
          <Path d="M8 4H6a2 2 0 0 0-2 2v2M16 4h2a2 2 0 0 1 2 2v2M8 20H6a2 2 0 0 1-2-2v-2M16 20h2a2 2 0 0 0 2-2v-2" {...s} />
          <Circle cx={12} cy={11} r={3} {...s} />
          <Path d="M8.5 17a4 4 0 0 1 7 0" {...s} />
        </>
      );
    case 'refresh':
      return (
        <>
          <Path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" {...s} />
          <Path d="M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16" {...s} />
          <Path d="M20 20v-4h-4" {...s} />
        </>
      );
    case 'info':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Path d="M12 11v5M12 8h.01" {...s} />
        </>
      );
    case 'copy':
      return (
        <>
          <Rect x={8} y={8} width={12} height={12} rx={2} {...s} />
          <Path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" {...s} />
        </>
      );
    default:
      return null;
  }
}
