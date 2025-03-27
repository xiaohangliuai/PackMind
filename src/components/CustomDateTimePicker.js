import React, { useState, useEffect, useRef } from 'react';
import {
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform,
  Dimensions
} from 'react-native';
import Modal from 'react-native-modal';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import ScrollPicker from 'react-native-wheel-scrollview-picker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, THEME } from '../constants/theme';

const { width } = Dimensions.get('window');

// Frequency options for recurring reminders
const FREQUENCIES = [
  { id: 'none', label: 'No recurrence' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' }
];

// Days of the week for weekly recurrence selection
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// For time picker on Android
const HOURS = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));

const CustomDateTimePicker = ({
  isVisible,
  onClose,
  onSave,
  initialDate = new Date(),
  initialRecurrence = { type: 'none', interval: 1, days: [] }
}) => {
  // State for date, time and recurrence
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialDate);
  const [recurrence, setRecurrence] = useState(initialRecurrence);
  
  // UI state
  const [view, setView] = useState('main'); // 'main', 'calendar', 'time', 'frequency'
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState(initialDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(initialDate.getMinutes());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Timer ref for debouncing time selection
  const timeoutRef = useRef(null);

  // Handle initial time values for Android wheel picker
  useEffect(() => {
    if (Platform.OS === 'android') {
      setSelectedHour(initialDate.getHours());
      setSelectedMinute(initialDate.getMinutes());
    }
  }, [initialDate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle save
  const handleSave = () => {
    // Combine date and time into a single Date object
    const combinedDate = new Date(date);
    combinedDate.setHours(time.getHours());
    combinedDate.setMinutes(time.getMinutes());
    
    onSave(combinedDate, recurrence);
    onClose();
  };

  // Handle date change
  const handleDateChange = (day) => {
    // Fix timezone issue by parsing with explicit time to avoid day offset
    const dateString = day.dateString; // Format: YYYY-MM-DD
    const [year, month, dayOfMonth] = dateString.split('-').map(num => parseInt(num, 10));
    const newDate = new Date(year, month - 1, dayOfMonth, 12, 0, 0); // Set to noon to avoid timezone issues
    
    setDate(newDate);
    setCalendarVisible(false);
    setView('main');
  };

  // Handle time change for iOS
  const handleTimeChange = (event, selectedTime) => {
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  // Handle time confirmation for both platforms
  const handleTimeConfirm = () => {
    if (Platform.OS === 'android') {
      const newTime = new Date();
      newTime.setHours(selectedHour);
      newTime.setMinutes(selectedMinute);
      setTime(newTime);
    }
    // For iOS, the time is already updated through handleTimeChange
    setTimePickerVisible(false);
    setView('main');
  };
  
  // Handle Android time value changes
  const handleAndroidTimeChange = (value, isHour) => {
    if (isHour) {
      setSelectedHour(parseInt(value));
    } else {
      setSelectedMinute(parseInt(value));
    }
    
    // Update the time state without closing the picker
    const newTime = new Date();
    newTime.setHours(isHour ? parseInt(value) : selectedHour);
    newTime.setMinutes(!isHour ? parseInt(value) : selectedMinute);
    setTime(newTime);
  };

  // Handle frequency selection
  const handleFrequencyChange = (type) => {
    setRecurrence({
      ...recurrence,
      type
    });
    setView('main');
  };

  // Handle weekday selection for weekly recurrence
  const toggleWeekday = (dayIndex) => {
    let days = [...recurrence.days];
    
    if (days.includes(dayIndex)) {
      days = days.filter(d => d !== dayIndex);
    } else {
      days.push(dayIndex);
    }
    
    setRecurrence({
      ...recurrence,
      days
    });
  };

  // Format time display - 12 hour format with AM/PM
  const formatTimeDisplay = () => {
    if (Platform.OS === 'android') {
      // Convert 24-hour format to 12-hour with AM/PM
      let hours = selectedHour;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const minutes = selectedMinute.toString().padStart(2, '0');
      return `${hours}:${minutes} ${ampm}`;
    } else {
      return format(time, 'h:mm a');
    }
  };

  // Format recurrence text for display
  const formatRecurrenceText = () => {
    if (!recurrence || recurrence.type === 'none') {
      return 'No recurrence';
    }
    
    switch (recurrence.type) {
      case 'daily':
        return 'Repeats daily';
      case 'weekly':
        if (recurrence.days && recurrence.days.length > 0) {
          // Sort days to display in order from Sunday to Saturday
          const selectedDays = recurrence.days
            .sort((a, b) => a - b)
            .map(index => WEEKDAYS[index]);
            
          // Different formatting based on number of selected days
          if (selectedDays.length === 1) {
            return `Every ${selectedDays[0]}`;
          } else if (selectedDays.length === 7) {
            return 'Every day';
          } else if (selectedDays.length <= 3) {
            return `Every ${selectedDays.join(', ')}`;
          } else {
            return `${selectedDays.length} days weekly`;
          }
        }
        return 'Weekly';
      case 'monthly':
        return 'Repeats monthly';
      default:
        return 'No recurrence';
    }
  };

  // Render the main view
  const renderMainView = () => (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Reminder</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Ionicons name="checkmark" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Recurrence */}
        <TouchableOpacity 
          style={styles.optionRow}
          onPress={() => setView('frequency')}
        >
          <View style={styles.iconLabelContainer}>
            <Ionicons name="repeat-outline" size={24} color="#333" />
            <Text style={styles.optionLabel}>Recurrence</Text>
          </View>
          <View style={styles.optionRight}>
            <Text style={styles.optionValue}>
              {formatRecurrenceText()}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        {/* Date */}
        <TouchableOpacity 
          style={styles.optionRow}
          onPress={() => setView('calendar')}
        >
          <View style={styles.iconLabelContainer}>
            <Ionicons name="calendar-outline" size={24} color="#333" />
            <Text style={styles.optionLabel}>Date</Text>
          </View>
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>
              {format(date, 'MMM d')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Time */}
        <TouchableOpacity 
          style={styles.optionRow}
          onPress={() => setView('time')}
        >
          <View style={styles.iconLabelContainer}>
            <Ionicons name="time-outline" size={24} color="#333" />
            <Text style={styles.optionLabel}>Time</Text>
          </View>
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>
              {formatTimeDisplay()}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Push Notification */}
        <TouchableOpacity 
          style={[styles.optionRow, styles.lastRow]}
          onPress={() => setNotificationsEnabled(!notificationsEnabled)}
        >
          <View style={styles.iconLabelContainer}>
            <Ionicons name="notifications-outline" size={24} color="#333" />
            <Text style={styles.optionLabel}>Notifications</Text>
          </View>
          <View style={[
            styles.notificationSwitch, 
            !notificationsEnabled && styles.notificationSwitchDisabled
          ]}>
            <View style={[
              styles.switchKnob,
              !notificationsEnabled && styles.switchKnobDisabled
            ]} />
          </View>
        </TouchableOpacity>

        {/* Recurrence options based on selected frequency */}
        {recurrence.type === 'weekly' && (
          <View style={styles.recurrenceOptions}>
            <Text style={styles.recurrenceTitle}>Every Week On</Text>
            <View style={styles.weekdaysContainer}>
              {WEEKDAYS.map((day, index) => (
                <TouchableOpacity 
                  key={day} 
                  style={[
                    styles.weekdayButton,
                    recurrence.days.includes(index) && styles.weekdayButtonSelected
                  ]}
                  onPress={() => toggleWeekday(index)}
                >
                  <Text style={[
                    styles.weekdayText,
                    recurrence.days.includes(index) && styles.weekdayTextSelected
                  ]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Clear button */}
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={() => {
            setRecurrence({ type: 'none', interval: 1, days: [] });
          }}
        >
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render the calendar view
  const renderCalendarView = () => (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => setView('main')}>
          <Ionicons name="chevron-back" size={24} color={THEME.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.calendarTitle}>Select Date</Text>
        <TouchableOpacity onPress={() => {
          handleDateChange({ dateString: format(new Date(), 'yyyy-MM-dd') });
        }}>
          <Text style={styles.todayText}>Today</Text>
        </TouchableOpacity>
      </View>
      <Calendar
        current={format(date, 'yyyy-MM-dd')}
        onDayPress={handleDateChange}
        markedDates={{
          [format(date, 'yyyy-MM-dd')]: { selected: true, selectedColor: THEME.PRIMARY }
        }}
        theme={{
          backgroundColor: 'white',
          calendarBackground: 'white',
          textSectionTitleColor: '#333',
          selectedDayBackgroundColor: THEME.PRIMARY,
          selectedDayTextColor: 'white',
          todayTextColor: THEME.PRIMARY,
          dayTextColor: '#333',
          textDisabledColor: '#ccc',
          monthTextColor: '#333',
          indicatorColor: THEME.PRIMARY,
          textDayFontWeight: '300',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '500',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14
        }}
      />
    </View>
  );

  // Render the time picker view
  const renderTimeView = () => {
    if (Platform.OS === 'ios') {
      return (
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={{ width: 40 }} />
            <Text style={styles.headerTitle}>Select Time</Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleTimeConfirm}
            >
              <Ionicons name="checkmark" size={24} color={THEME.PRIMARY} />
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={time}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
            style={styles.timePicker}
          />
        </View>
      );
    }
    
    return (
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Select Time</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleTimeConfirm}
          >
            <Ionicons name="checkmark" size={24} color={THEME.PRIMARY} />
          </TouchableOpacity>
        </View>
        <View style={styles.androidTimePickerContainer}>
          <ScrollPicker
            dataSource={HOURS}
            selectedIndex={selectedHour}
            renderItem={(data) => (
              <Text style={styles.pickerItemText}>{data}</Text>
            )}
            onValueChange={(value) => handleAndroidTimeChange(value, true)}
            wrapperHeight={160}
            wrapperWidth={width * 0.2}
            itemHeight={40}
            highlightColor={COLORS.INDIGO_15}
          />
          <Text style={styles.timeSeparator}>:</Text>
          <ScrollPicker
            dataSource={MINUTES}
            selectedIndex={selectedMinute}
            renderItem={(data) => (
              <Text style={styles.pickerItemText}>{data}</Text>
            )}
            onValueChange={(value) => handleAndroidTimeChange(value, false)}
            wrapperHeight={160}
            wrapperWidth={width * 0.2}
            itemHeight={40}
            highlightColor={COLORS.INDIGO_15}
          />
        </View>
      </View>
    );
  };

  // Render the frequency selection view
  const renderFrequencyView = () => (
    <View style={styles.frequencyContainer}>
      <View style={styles.frequencyHeader}>
        <TouchableOpacity onPress={() => setView('main')}>
          <Ionicons name="chevron-back" size={24} color={THEME.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.frequencyTitle}>Recurrence</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.frequencyOptions}>
        {FREQUENCIES.map((freq) => (
          <TouchableOpacity 
            key={freq.id} 
            style={[
              styles.frequencyOption,
              recurrence.type === freq.id && styles.frequencyOptionSelected
            ]}
            onPress={() => handleFrequencyChange(freq.id)}
          >
            <Text style={[
              styles.frequencyText,
              recurrence.type === freq.id && styles.frequencyTextSelected
            ]}>
              {freq.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render the active view
  const renderActiveView = () => {
    switch(view) {
      case 'calendar':
        return renderCalendarView();
      case 'time':
        return renderTimeView();
      case 'frequency':
        return renderFrequencyView();
      default:
        return renderMainView();
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.5}
      style={styles.modal}
      swipeDirection={['down']}
      onSwipeComplete={onClose}
      propagateSwipe
      avoidKeyboard
    >
      <View style={styles.container}>
        {renderActiveView()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    backgroundColor: 'transparent',
  },
  mainContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 15,
    padding: 5,
  },
  content: {
    padding: 20,
    paddingBottom: 25,
    backgroundColor: 'white',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  lastRow: {
    borderBottomWidth: 0,
    marginBottom: 5,
  },
  iconLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '40%',
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  optionValue: {
    fontSize: 16,
    color: THEME.PRIMARY,
    marginRight: 5,
    textAlign: 'right',
    flexShrink: 1,
  },
  valueContainer: {
    backgroundColor: '#f7f7f7', 
    borderRadius: 8,
    padding: 10,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  valueText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  notificationSwitch: {
    width: 60,
    height: 30,
    backgroundColor: THEME.PRIMARY,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationSwitchDisabled: {
    backgroundColor: '#ccc',
  },
  switchKnob: {
    width: 26,
    height: 26,
    backgroundColor: 'white',
    borderRadius: 13,
    marginLeft: 'auto',
  },
  switchKnobDisabled: {
    marginLeft: 0,
  },
  clearButton: {
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  clearText: {
    fontSize: 18,
    color: THEME.PRIMARY,
    fontWeight: 'bold',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    paddingBottom: 30,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  todayText: {
    color: THEME.PRIMARY,
    fontSize: 16,
  },
  timePickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    paddingBottom: 30,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  iosTimePicker: {
    backgroundColor: 'white',
    height: 200,
  },
  androidTimePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  androidTimePickerItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidTimePickerText: {
    color: '#333',
    fontSize: 22,
  },
  androidTimePickerTextSelected: {
    color: THEME.PRIMARY,
    fontWeight: 'bold',
  },
  androidTimePickerColon: {
    color: '#333',
    fontSize: 24,
    marginHorizontal: 5,
  },
  frequencyContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  frequencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  frequencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  frequencyOptions: {
    padding: 10,
    backgroundColor: 'white',
  },
  frequencyOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 10,
    margin: 5,
  },
  frequencyOptionSelected: {
    backgroundColor: '#f7f7f7',
  },
  frequencyText: {
    fontSize: 16,
    color: '#333',
  },
  frequencyTextSelected: {
    color: THEME.PRIMARY,
    fontWeight: 'bold',
  },
  recurrenceOptions: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 8,
  },
  recurrenceTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  weekdaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  weekdayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
    marginHorizontal: 1,
  },
  weekdayButtonSelected: {
    backgroundColor: THEME.PRIMARY,
  },
  weekdayText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
  weekdayTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePicker: {
    backgroundColor: 'white',
    height: 200,
  },
  pickerItemText: {
    color: '#333',
    fontSize: 22,
  },
  timeSeparator: {
    color: '#333',
    fontSize: 24,
    marginHorizontal: 5,
  },
});

export default CustomDateTimePicker;