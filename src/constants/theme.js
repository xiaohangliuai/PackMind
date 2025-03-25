// src/constants/theme.js
// Modern, minimalist UI design system for PackM!nd+

// Primary colors from the palette
export const COLORS = {
  // Soft silvery-gray
  LIGHT_GRAY: '#CFCBD2',
  
  // Lavender purple
  LAVENDER: '#CB98ED',
  
  // Rich indigo
  INDIGO: '#8B63DA',
  
  // Deep royal purple
  ROYAL: '#3C21B7',
  
  // Common UI colors
  WHITE: '#FFFFFF',
  BLACK: '#333333',
  ERROR: '#FF5252',
  SUCCESS: '#4CAF50',
  WARNING: '#FFC107',
  
  // Transparent versions for overlays, shadows and glass-morphic effects
  LAVENDER_15: 'rgba(203, 152, 237, 0.15)',
  INDIGO_15: 'rgba(139, 99, 218, 0.15)',
  ROYAL_08: 'rgba(60, 33, 183, 0.08)',
  ROYAL_15: 'rgba(60, 33, 183, 0.15)',
};

// Gradients
export const GRADIENTS = {
  PRIMARY: ['#8B63DA', '#3C21B7'],
  SECONDARY: ['#CB98ED', '#8B63DA'],
  ACCENT: ['#3C21B7', '#261578'],
  CARD: ['#FFFFFF', '#F8F8F8'],
};

// Theme configuration for consistent styling
export const THEME = {
  // Primary brand color (used for buttons, accents, etc.)
  PRIMARY: COLORS.INDIGO,
  
  // Secondary color for highlights and accents
  SECONDARY: COLORS.LAVENDER,
  
  // Accent color for special UI elements
  ACCENT: COLORS.ROYAL,
  
  // Background colors
  BACKGROUND: {
    PRIMARY: COLORS.WHITE,
    SECONDARY: '#F8F8F8',
    TERTIARY: COLORS.LIGHT_GRAY,
  },
  
  // Text colors
  TEXT: {
    PRIMARY: COLORS.BLACK,
    SECONDARY: '#666666',
    TERTIARY: '#999999',
    LIGHT: COLORS.WHITE,
    ACCENT: COLORS.INDIGO,
  },
  
  // UI element colors
  UI: {
    BORDER: '#F0F0F0',
    DIVIDER: '#EEEEEE',
    DISABLED: '#CCCCCC',
  },
  
  // Shadows for depth
  SHADOWS: {
    SMALL: {
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    MEDIUM: {
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    LARGE: {
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 8,
    },
  },
  
  // Spacing for consistent layout
  SPACING: {
    SMALL: 8,
    MEDIUM: 16,
    LARGE: 24,
    XLARGE: 32,
  },
  
  // Border radius
  RADIUS: {
    SMALL: 8,
    MEDIUM: 12,
    LARGE: 16,
    XLARGE: 24,
    ROUND: 50,
  },
};

// Typography
export const TYPOGRAPHY = {
  HEADING_1: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
  },
  HEADING_2: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  HEADING_3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  BODY_1: {
    fontSize: 16,
    lineHeight: 24,
  },
  BODY_2: {
    fontSize: 14,
    lineHeight: 20,
  },
  CAPTION: {
    fontSize: 12,
    lineHeight: 16,
  },
  BUTTON: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
};

export default {
  COLORS,
  GRADIENTS,
  THEME,
  TYPOGRAPHY,
}; 