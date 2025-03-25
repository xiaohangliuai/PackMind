import React, { useState, useEffect } from 'react';
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

  // Handle initial time values for Android wheel picker
  useEffect(() => {
    if (Platform.OS === 'android') {
      setSelectedHour(initialDate.getHours());
      setSelectedMinute(initialDate.getMinutes());
    }
  }, [initialDate]);

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
    const newDate = new Date(day.dateString);
    setDate(newDate);
    setCalendarVisible(false);
    setView('main');
  };

  // Handle time change for iOS
  const handleTimeChange = (event, selectedTime) => {
    if (selectedTime) {
      setTime(selectedTime);
    }
    if (Platform.OS === 'ios') {
      setTimePickerVisible(false);
      setView('main');
    }
  };

  // Handle time selection for Android
  const handleAndroidTimeConfirm = () => {
    const newTime = new Date();
    newTime.setHours(selectedHour);
    newTime.setMinutes(selectedMinute);
    setTime(newTime);
    setTimePickerVisible(false);
    setView('main');
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

  // Format time display
  const formatTimeDisplay = () => {
    if (Platform.OS === 'android') {
      const hour = selectedHour.toString().padStart(2, '0');
      const minute = selectedMinute.toString().padStart(2, '0');
      return `${hour}:${minute}`;
    } else {
      return format(time, 'h:mm a');
    }
  };

  // Render the main view
  const renderMainView = () => (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Reminder</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Ionicons name="checkmark" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Recurrence */}
        <TouchableOpacity 
          style={styles.optionRow}
          onPress={() => setView('frequency')}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="repeat" size={24} color="white" />
            <Text style={styles.optionLabel}>Recurrence</Text>
          </View>
          <View style={styles.optionRight}>
            <Text style={styles.optionValue}>
              {FREQUENCIES.find(f => f.id === recurrence.type)?.label}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </View>
        </TouchableOpacity>

        {/* Date */}
        <TouchableOpacity 
          style={styles.optionRow}
          onPress={() => setView('calendar')}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="calendar-outline" size={24} color="white" />
            <Text style={styles.optionLabel}>Date</Text>
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {format(date, 'MMM d')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Time */}
        <TouchableOpacity 
          style={styles.optionRow}
          onPress={() => setView('time')}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="time-outline" size={24} color="white" />
            <Text style={styles.optionLabel}>Time</Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {formatTimeDisplay()}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Push Notification */}
        <TouchableOpacity 
          style={[styles.optionRow, styles.lastRow]}
          onPress={() => setNotificationsEnabled(!notificationsEnabled)}
        >
          <View style={styles.optionLeft}>
            <Ionicons name="notifications-outline" size={24} color="white" />
            <Text style={styles.optionLabel}>Push notification</Text>
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
          <Ionicons name="chevron-back" size={24} color="#86a637" />
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
          [format(date, 'yyyy-MM-dd')]: { selected: true, selectedColor: '#86a637' }
        }}
        theme={{
          backgroundColor: '#1c2935',
          calendarBackground: '#1c2935',
          textSectionTitleColor: 'white',
          selectedDayBackgroundColor: '#86a637',
          selectedDayTextColor: 'white',
          todayTextColor: '#86a637',
          dayTextColor: 'white',
          textDisabledColor: '#555',
          monthTextColor: 'white',
          indicatorColor: '#86a637',
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
    // Different implementations for iOS and Android
    if (Platform.OS === 'ios') {
      return (
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerHeader}>
            <TouchableOpacity onPress={() => setView('main')}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.timePickerTitle}>Select Time</Text>
            <TouchableOpacity onPress={() => {
              handleTimeChange(null, time);
            }}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={time}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
            textColor="white"
            style={styles.iosTimePicker}
            themeVariant="dark"
            accentColor="#86a637"
          />
        </View>
      );
    } else {
      // Android wheel picker
      return (
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerHeader}>
            <TouchableOpacity onPress={() => setView('main')}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.timePickerTitle}>Select Time</Text>
            <TouchableOpacity onPress={handleAndroidTimeConfirm}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.androidTimePickerContainer}>
            <ScrollPicker
              dataSource={HOURS}
              selectedIndex={selectedHour}
              renderItem={(data, index) => {
                return (
                  <View style={styles.androidTimePickerItem}>
                    <Text style={[
                      styles.androidTimePickerText,
                      selectedHour === parseInt(data) && styles.androidTimePickerTextSelected
                    ]}>{data}</Text>
                  </View>
                );
              }}
              onValueChange={(data, selectedIndex) => {
                setSelectedHour(parseInt(data));
              }}
              wrapperHeight={180}
              wrapperBackground="#1c2935"
              itemHeight={60}
              highlightColor="#2d3b47"
              highlightBorderWidth={1}
              activeItemColor="#86a637"
              itemColor="white"
            />
            
            <Text style={styles.androidTimePickerColon}>:</Text>
            
            <ScrollPicker
              dataSource={MINUTES}
              selectedIndex={selectedMinute}
              renderItem={(data, index) => {
                return (
                  <View style={styles.androidTimePickerItem}>
                    <Text style={[
                      styles.androidTimePickerText,
                      selectedMinute === parseInt(data) && styles.androidTimePickerTextSelected
                    ]}>{data}</Text>
                  </View>
                );
              }}
              onValueChange={(data, selectedIndex) => {
                setSelectedMinute(parseInt(data));
              }}
              wrapperHeight={180}
              wrapperBackground="#1c2935"
              itemHeight={60}
              highlightColor="#2d3b47"
              highlightBorderWidth={1}
              activeItemColor="#86a637"
              itemColor="white"
            />
          </View>
        </View>
      );
    }
  };

  // Render the frequency selection view
  const renderFrequencyView = () => (
    <View style={styles.frequencyContainer}>
      <View style={styles.frequencyHeader}>
        <TouchableOpacity onPress={() => setView('main')}>
          <Ionicons name="chevron-back" size={24} color="#86a637" />
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
    backgroundColor: '#1c2935',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1c2935',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 15,
  },
  content: {
    padding: 20,
    paddingBottom: 30,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
    color: 'white',
    marginLeft: 15,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionValue: {
    fontSize: 16,
    color: '#86a637',
    marginRight: 5,
  },
  dateContainer: {
    backgroundColor: '#2d3b47',
    borderRadius: 8,
    padding: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: 'white',
  },
  timeContainer: {
    backgroundColor: '#2d3b47',
    borderRadius: 8,
    padding: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    color: 'white',
  },
  notificationSwitch: {
    width: 60,
    height: 30,
    backgroundColor: '#86a637',
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationSwitchDisabled: {
    backgroundColor: '#555',
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
  recurrenceOptions: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#2d3b47',
    borderRadius: 10,
  },
  recurrenceTitle: {
    fontSize: 16,
    color: 'white',
    marginBottom: 15,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekdayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3a4b5a',
  },
  weekdayButtonSelected: {
    backgroundColor: '#86a637',
  },
  weekdayText: {
    color: 'white',
    fontSize: 12,
  },
  weekdayTextSelected: {
    fontWeight: 'bold',
  },
  clearButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  clearText: {
    fontSize: 16,
    color: '#86a637',
    fontWeight: 'bold',
  },
  calendarContainer: {
    backgroundColor: '#1c2935',
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
    borderBottomColor: '#333',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  todayText: {
    color: '#86a637',
    fontSize: 16,
  },
  timePickerContainer: {
    backgroundColor: '#1c2935',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    paddingBottom: 30,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  cancelText: {
    color: '#888',
    fontSize: 16,
  },
  doneText: {
    color: '#86a637',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iosTimePicker: {
    backgroundColor: '#1c2935',
    height: 200,
  },
  androidTimePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  androidTimePickerItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidTimePickerText: {
    color: 'white',
    fontSize: 22,
  },
  androidTimePickerTextSelected: {
    color: '#86a637',
    fontWeight: 'bold',
  },
  androidTimePickerColon: {
    color: 'white',
    fontSize: 24,
    marginHorizontal: 5,
  },
  frequencyContainer: {
    backgroundColor: '#1c2935',
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
    borderBottomColor: '#333',
  },
  frequencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  frequencyOptions: {
    padding: 10,
  },
  frequencyOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    borderRadius: 10,
    margin: 5,
  },
  frequencyOptionSelected: {
    backgroundColor: '#2d3b47',
  },
  frequencyText: {
    fontSize: 16,
    color: 'white',
  },
  frequencyTextSelected: {
    color: '#86a637',
    fontWeight: 'bold',
  },
});

export default CustomDateTimePicker; 