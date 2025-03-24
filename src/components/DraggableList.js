// src/components/DraggableList.js
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import ItemIcon from './ItemIcon';

const DraggableList = ({ 
  items, 
  onReorder, 
  onToggleChecked, 
  onDelete, 
  editable = true,
  checkedItemsAtBottom = true
}) => {
  // Safety check for items
  const safeItems = items || [];
  
  // Sort items to put checked items at the bottom if required
  const sortedItems = React.useMemo(() => {
    if (checkedItemsAtBottom) {
      return [...safeItems].sort((a, b) => {
        if (a.checked && !b.checked) return 1;
        if (!a.checked && b.checked) return -1;
        return 0;
      });
    }
    return safeItems;
  }, [safeItems, checkedItemsAtBottom]);

  // Render each item in the list
  const renderItem = ({ item, drag, isActive }) => {
    // Animation for the press effect
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
      };
    });

    const onPressIn = () => {
      scale.value = withSpring(1.05);
    };

    const onPressOut = () => {
      scale.value = withSpring(1);
    };

    return (
      <Animated.View
        style={[
          styles.itemContainer,
          isActive && styles.activeItem,
          animatedStyle,
          item.checked && styles.checkedItem
        ]}
      >
        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => onToggleChecked(item.id)}
        >
          <MaterialIcons
            name={item.checked ? 'check-box' : 'check-box-outline-blank'}
            size={24}
            color={item.checked ? '#6E8B3D' : '#757575'}
          />
        </TouchableOpacity>
        
        {/* Item Icon */}
        <ItemIcon 
          type={item.type} 
          size={20} 
          backgroundColor={item.checked ? '#E0E0E0' : '#E8F5E9'} 
        />
        
        {/* Item Name */}
        <Text style={[styles.itemText, item.checked && styles.checkedText]}>
          {item.name}
        </Text>
        
        {/* Actions */}
        <View style={styles.actions}>
          {/* Delete button */}
          {editable && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(item.id)}
            >
              <MaterialIcons name="delete-outline" size={24} color="#FF5252" />
            </TouchableOpacity>
          )}
          
          {/* Drag handle */}
          {editable && !item.checked && (
            <TouchableOpacity
              style={styles.dragHandle}
              onPressIn={() => {
                onPressIn();
                drag();
              }}
              onPressOut={onPressOut}
            >
              <MaterialIcons name="drag-handle" size={24} color="#757575" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <DraggableFlatList
      data={sortedItems}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onDragEnd={({ data }) => onReorder(data)}
      activationDistance={10}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 0,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  activeItem: {
    backgroundColor: '#F5F5F5',
    elevation: 5,
  },
  checkedItem: {
    backgroundColor: '#F5F5F5',
    opacity: 0.8,
    textDecorationLine: 'line-through',
  },
  checkbox: {
    marginRight: 10,
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#777',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 5,
    marginLeft: 5,
  },
  dragHandle: {
    padding: 5,
  },
});

export default DraggableList;