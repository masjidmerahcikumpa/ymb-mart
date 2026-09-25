import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Brand Core
    primary: '#670024',              // Deep Burgundy
    primaryContainer: '#8B1538',
    primaryLight: '#F8EEF1',
    primaryFixed: '#FFD9DD',
    
    // Loyalty & Gold Accents
    secondary: '#735C00',            // Dark Gold
    secondaryContainer: '#FED65B',   // YMB Gold Member Badge
    secondaryLight: '#FFF9E6',
    
    // Freshness & Halal Green
    tertiary: '#003925',             // Dark Forest Green
    tertiaryContainer: '#005237',    // "+ Tambah" button, in-stock
    tertiaryLight: '#E6F4EA',
    
    // Status & Urgency
    danger: '#BA1A1A',               // Discount badges & flash sale countdown
    warning: '#D97706',
    success: '#059669',
    
    // Surfaces & Canvas
    surface: '#F8F9FF',              // App canvas background
    surfaceContainer: '#E5EEFF',
    surfaceContainerHigh: '#DCE9FF',
    surfaceContainerLowest: '#FFFFFF', // Card background
    
    // Typography Colors
    text: '#0B1C30',                 // Primary text
    textSecondary: '#574144',        // Muted labels
    textMuted: '#8D99AE',
    outline: '#DEBFC2',
    
    // Compatibility keys
    background: '#F8F9FF',
    backgroundElement: '#E5EEFF',
    backgroundSelected: '#FED65B',
  },
  dark: {
    primary: '#FFB2BD',
    primaryContainer: '#8B1538',
    primaryLight: '#450017',
    primaryFixed: '#FFD9DD',
    
    secondary: '#FED65B',
    secondaryContainer: '#745C00',
    secondaryLight: '#241A00',
    
    tertiary: '#4EDEA3',
    tertiaryContainer: '#005236',
    tertiaryLight: '#002113',
    
    danger: '#FFDAD6',
    warning: '#FBBF24',
    success: '#34D399',
    
    surface: '#0B1C30',
    surfaceContainer: '#16283D',
    surfaceContainerHigh: '#213145',
    surfaceContainerLowest: '#102237',
    
    text: '#F8F9FF',
    textSecondary: '#D3E4FE',
    textMuted: '#8A7174',
    outline: '#574144',
    
    background: '#0B1C30',
    backgroundElement: '#16283D',
    backgroundSelected: '#745C00',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'Plus Jakarta Sans',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  // Mobile design tokens
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,

  // Compatibility with default Expo components
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 70 }) ?? 60;
export const MaxContentWidth = 480;
