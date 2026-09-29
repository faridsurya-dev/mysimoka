import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme';

export type IconName =
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'arrow-left'
  | 'plus'
  | 'close'
  | 'check'
  | 'edit'
  | 'eye'
  | 'eye-off'
  | 'mail'
  | 'lock'
  | 'user'
  | 'school'
  | 'logout'
  | 'refresh'
  | 'alert'
  | 'info'
  | 'key'
  | 'calendar'
  | 'search'
  | 'switch'
  | 'shield';

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/**
 * Lightweight stroke icon set (react-native-svg, works on native + web).
 */
export function Icon({
  name,
  size = 20,
  color = colors.text.secondary,
  strokeWidth = 2,
}: IconProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  const renderPaths = () => {
    switch (name) {
      case 'chevron-left':
        return <Path d="M15 6l-6 6 6 6" {...common} />;
      case 'chevron-right':
        return <Path d="M9 6l6 6-6 6" {...common} />;
      case 'chevron-down':
        return <Path d="M6 9l6 6 6-6" {...common} />;
      case 'arrow-left':
        return <Path d="M19 12H5M11 6l-6 6 6 6" {...common} />;
      case 'plus':
        return <Path d="M12 5v14M5 12h14" {...common} />;
      case 'close':
        return <Path d="M6 6l12 12M18 6L6 18" {...common} />;
      case 'check':
        return <Path d="M5 12.5l4.5 4.5L19 7.5" {...common} />;
      case 'edit':
        return (
          <>
            <Path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3z" {...common} />
            <Path d="M13.5 8.5l3 3" {...common} />
          </>
        );
      case 'eye':
        return (
          <>
            <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" {...common} />
            <Circle cx={12} cy={12} r={3} {...common} />
          </>
        );
      case 'eye-off':
        return (
          <>
            <Path d="M3 3l18 18" {...common} />
            <Path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.4 16.4 0 0 1-2.9 3.7" {...common} />
            <Path d="M6.6 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.3-1.1" {...common} />
            <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" {...common} />
          </>
        );
      case 'mail':
        return (
          <>
            <Rect x={3} y={5} width={18} height={14} rx={2.5} {...common} />
            <Path d="M4 7l8 6 8-6" {...common} />
          </>
        );
      case 'lock':
        return (
          <>
            <Rect x={4.5} y={10.5} width={15} height={10} rx={2.5} {...common} />
            <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" {...common} />
          </>
        );
      case 'user':
        return (
          <>
            <Circle cx={12} cy={8} r={4} {...common} />
            <Path d="M4.5 20.5c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5" {...common} />
          </>
        );
      case 'school':
        return (
          <>
            <Path d="M3 9.5L12 5l9 4.5-9 4.5-9-4.5z" {...common} />
            <Path d="M7 11.5v4.5c0 1.4 2.2 3 5 3s5-1.6 5-3v-4.5" {...common} />
            <Path d="M21 9.5v5" {...common} />
          </>
        );
      case 'logout':
        return (
          <>
            <Path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14" {...common} />
            <Path d="M10 8l-4 4 4 4M6 12h9" {...common} />
          </>
        );
      case 'refresh':
        return (
          <>
            <Path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" {...common} />
            <Path d="M4 4v4h4" {...common} />
            <Path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" {...common} />
            <Path d="M20 20v-4h-4" {...common} />
          </>
        );
      case 'alert':
        return (
          <>
            <Circle cx={12} cy={12} r={9} {...common} />
            <Path d="M12 7.5v5.5M12 16.5v.01" {...common} />
          </>
        );
      case 'info':
        return (
          <>
            <Circle cx={12} cy={12} r={9} {...common} />
            <Path d="M12 11v5.5M12 7.5v.01" {...common} />
          </>
        );
      case 'key':
        return (
          <>
            <Circle cx={8} cy={15} r={4} {...common} />
            <Path d="M11 12l8.5-8.5M16 7l2.5 2.5M18.5 4.5L21 7" {...common} />
          </>
        );
      case 'calendar':
        return (
          <>
            <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} {...common} />
            <Path d="M3.5 10h17M8 3v4M16 3v4" {...common} />
          </>
        );
      case 'search':
        return (
          <>
            <Circle cx={11} cy={11} r={6.5} {...common} />
            <Path d="M16 16l4.5 4.5" {...common} />
          </>
        );
      case 'switch':
        return <Path d="M7 4L3.5 7.5 7 11M3.5 7.5h13M17 13l3.5 3.5L17 20M20.5 16.5h-13" {...common} />;
      case 'shield':
        return (
          <>
            <Path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.3-7.5 9.5-4.3-1.2-7.5-5-7.5-9.5V6L12 3z" {...common} />
            <Path d="M9 12l2 2 4-4" {...common} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {renderPaths()}
    </Svg>
  );
}
