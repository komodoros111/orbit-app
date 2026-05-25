import React from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

// Ícones SVG do Orbit (mobile). currentColor via prop `color`.
export function Logo({ name = 'orbit', size = 24, color = '#fff', strokeWidth = 1.7 }) {
  const common = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'orbit':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="3.4" {...common} />
          <Ellipse cx="12" cy="12" rx="9.2" ry="4.2" transform="rotate(28 12 12)" {...common} />
          <Circle cx="19.4" cy="8.2" r="1.25" fill={color} />
        </Svg>
      );
    case 'hash':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" {...common} /></Svg>;
    case 'users':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="9" cy="8.5" r="3.2" {...common} /><Path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6a3 3 0 0 1 0 5.6M16.5 14.2A5.5 5.5 0 0 1 20.5 19" {...common} /></Svg>;
    case 'volume':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 9v6h3.5L13 19V5L7.5 9H4z" {...common} /><Path d="M16.5 8.5a5 5 0 0 1 0 7" {...common} /></Svg>;
    case 'send':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 12 20 4l-6 16-3-7-7-1z" {...common} /></Svg>;
    case 'plus':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" {...common} /></Svg>;
    case 'check':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 12.5 10 17.5 19 7" {...common} /></Svg>;
    case 'close':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" {...common} /></Svg>;
    case 'gamepad':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 8h18v9H3z" {...common} /><Path d="M8 11v3M6.5 12.5h3" {...common} /></Svg>;
    default:
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="9" {...common} /></Svg>;
  }
}
