// src/constants/theme.js
// Color palette from Paolumu theme

// Primary colors from the palette
export const COLORS = {
  // Light gray
  LIGHT_GRAY: '#CFCBD2',
  
  // Light purple
  LIGHT_PURPLE: '#CB98ED',
  
  // Medium purple
  MEDIUM_PURPLE: '#8B63DA',
  
  // Dark purple
  DARK_PURPLE: '#3C21B7',
  
  // Common UI colors
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  ERROR: '#FF5252',
  SUCCESS: '#4CAF50',
  WARNING: '#FFC107',
  
  // Transparent versions for overlays and backgrounds
  LIGHT_PURPLE_15: 'rgba(203, 152, 237, 0.15)',
  MEDIUM_PURPLE_15: 'rgba(139, 99, 218, 0.15)',
};

// Theme configuration for consistent styling
export const THEME = {
  // Primary brand color (used for buttons, accents, etc.)
  PRIMARY: COLORS.MEDIUM_PURPLE,
  
  // Secondary color for highlights and accents
  SECONDARY: COLORS.LIGHT_PURPLE,
  
  // Accent color for special UI elements
  ACCENT: COLORS.DARK_PURPLE,
  
  // Background colors
  BACKGROUND: {
    PRIMARY: COLORS.WHITE,
    SECONDARY: '#F8F8F8',
    TERTIARY: COLORS.LIGHT_GRAY,
  },
  
  // Text colors
  TEXT: {
    PRIMARY: '#333333',
    SECONDARY: '#777777',
    TERTIARY: '#999999',
    LIGHT: COLORS.WHITE,
    ACCENT: COLORS.MEDIUM_PURPLE,
  },
  
  // UI element colors
  UI: {
    BORDER: '#F0F0F0',
    DIVIDER: '#EEEEEE',
    DISABLED: '#CCCCCC',
  },
};

export default {
  COLORS,
  THEME,
}; 