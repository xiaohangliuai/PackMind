import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { COLORS, THEME, TYPOGRAPHY } from '../constants/theme';

const EmojiInputModal = ({ isVisible, onClose, onSave }) => {
  const [emoji, setEmoji] = useState('');

  const handleSave = () => {
    if (emoji.trim()) {
      onSave(emoji.trim());
      setEmoji('');
      onClose();
    }
  };

  const handleCancel = () => {
    setEmoji('');
    onClose();
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <Modal 
      transparent={true}
      visible={isVisible}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={() => {
        dismissKeyboard();
        handleCancel();
      }}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => {
            e.stopPropagation();
            dismissKeyboard();
          }}>
            <View style={styles.modalContent}>
              <Text style={styles.title}>Enter an emoji</Text>
              <TextInput
                style={styles.emojiInput}
                value={emoji}
                onChangeText={setEmoji}
                placeholder="🌟"
                placeholderTextColor={THEME.TEXT.TERTIARY}
                autoFocus={true}
                maxLength={2}
              />
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]} 
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.button, styles.saveButton]} 
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    ...TYPOGRAPHY.H3,
    marginBottom: 20,
    color: THEME.TEXT.PRIMARY,
  },
  emojiInput: {
    width: '100%',
    height: 60,
    borderWidth: 1,
    borderColor: COLORS.LIGHT_GRAY,
    borderRadius: 8,
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: '45%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.LIGHT_GRAY,
  },
  saveButton: {
    backgroundColor: COLORS.INDIGO,
  },
  cancelButtonText: {
    color: THEME.TEXT.PRIMARY,
    fontWeight: '600',
  },
  saveButtonText: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
});

export default EmojiInputModal; 