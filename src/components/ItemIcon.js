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
  
  // Footwear
  shoes: '👟',
  boots: '🥾',
  sandals: '👡',
  hikingBoots: '🥾',
  
  // Toiletries
  toothbrush: '🪥',
  toothpaste: '🦷',
  shampoo: '💆',
  soap: '🧼',
  towel: '🛁',
  razor: '🪒',
  
  // Electronics
  phone: '📱',
  charger: '🔌',
  camera: '📷',
  laptop: '💻',
  headphones: '🎧',
  
  // Documents
  passport: '📔',
  tickets: '🎟️',
  money: '💰',
  creditCard: '💳',
  id: '🪪',
  
  // Sports & Activities
  skis: '🎿',
  snowboard: '🏂',
  tent: '⛺',
  sleepingBag: '💤',
  ball: '⚽',
  racket: '🎾',
  
  // Misc
  umbrella: '☂️',
  book: '📚',
  snacks: '🍪',
  water: '💧',
  medicine: '💊',
  
  // Default
  default: '📦'
};

const ItemIcon = ({ type, size = 24, style, backgroundColor = '#E8F5E9' }) => {
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