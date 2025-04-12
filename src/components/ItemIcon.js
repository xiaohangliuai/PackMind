// src/components/ItemIcon.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Mapping of item types to emoji icons
const iconMap = {
  // Clothing
  shirt: '👕',
  pants: '👖',
  socks: '🧦',
  underwear: '🩲',
  jacket: '🧥',
  hat: '🧢',
  scarf: '🧣',
  gloves: '🧤',
  swimwear: '🩱',
  sunglasses: '🕶️',
  bra: '👙',
  
  // Footwear
  shoes: '👟',
  boots: '🥾',
  sandals: '👡',
  hikingBoots: '🥾',
  waterShoes: '👟',
  cyclingShoes: '👟',
  climbingShoes: '🧗‍♀️',
  
  // Toiletries
  toothbrush: '🪥',
  toothpaste: '🦷',
  shampoo: '💆',
  soap: '🧼',
  towel: '🛁',
  razor: '🪒',
  toiletries: '🧴',
  sunscreen: '🧴',
  bugSpray: '🦟',
  
  // Electronics
  phone: '📱',
  charger: '🔌',
  camera: '📷',
  laptop: '💻',
  headphones: '🎧',
  powerBank: '🔋',
  
  // Documents
  passport: '📔',
  tickets: '🎟️',
  money: '💰',
  creditCard: '💳',
  id: '🪪',
  wallet: '💰',
  
  // Sports & Activities
  skis: '🎿',
  snowboard: '🏂',
  tent: '⛺',
  sleepingBag: '💤',
  sleepingPad: '🛌',
  ball: '⚽',
  racket: '🎾',
  fishingRod: '🎣',
  yogaMat: '🧘‍♀️',
  bicycle: '🚲',
  helmet: '🪖',
  goggles: '🥽',
  skiMask: '🥷',
  rope: '🪢',
  carabiners: '🪝',
  harness: '🧗‍♀️',
  chalk: '🧴',
  
  // Food & Groceries
  eggs: '🥚',
  steak: '🥩',
  chickenBreast: '🍗',
  bacon: '🥓',
  milk: '🥛',
  vegetables: '🥦',
  tissues: '🧻',
  bread: '🍞',
  cheese: '🧀',
  fruits: '🍎',
  water: '💧',
  snacks: '🍫',
  
  // Bags & Containers
  shoppingBag: '👜',
  tackleBox: '🧰',
  yogaBag: '🎒',
  climbingBag: '🎒',
  
  // Tools & Equipment
  flashlight: '🔦',
  lighter: '🔥',
  firstAid: '🧰',
  bikeLock: '🔒',
  hooks: '🪝',
  lures: '🪝',
  fishingLine: '🧵',
  chair: '🪑',
  matCleaner: '🧼',
  blanket: '🛌',
  bodyProtection: '🛡️',
  
  // Misc
  umbrella: '☂️',
  book: '📚',
  medicine: '💊',
  swimCap: '🧢',
  
  // Default
  default: '📦'
};

const ItemIcon = ({ type, size = 24, style, backgroundColor = '#E8F5E9' }) => {
  // Check if the type is a custom emoji (starting with "custom:")
  if (type && type.startsWith('custom:')) {
    const customEmoji = type.substring(7); // Remove the "custom:" prefix
    return (
      <View style={[styles.container, { width: size * 2, height: size * 2, backgroundColor }, style]}>
        <Text style={{ fontSize: size }}>{customEmoji}</Text>
      </View>
    );
  }
  
  // Get the icon or use default if not found
  const icon = iconMap[type] || iconMap.default;
  
  return (
    <View style={[styles.container, { width: size * 2, height: size * 2, backgroundColor }, style]}>
      <Text style={{ fontSize: size }}>{icon}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    margin: 5,
  },
});

export default ItemIcon;