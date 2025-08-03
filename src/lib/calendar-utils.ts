import { CalendarEvent } from './types';

// iCal format utilities
export function parseICalDate(dateString: string): Date {
  // Handle YYYYMMDD format
  if (dateString.length === 8) {
    return new Date(
      parseInt(dateString.substring(0, 4)),
      parseInt(dateString.substring(4, 6)) - 1,
      parseInt(dateString.substring(6, 8))
    );
  }
  
  // Handle YYYYMMDDTHHMMSS format
  if (dateString.length === 15 && dateString.includes('T')) {
    const date = dateString.substring(0, 8);
    const time = dateString.substring(9, 15);
    return new Date(
      parseInt(date.substring(0, 4)),
      parseInt(date.substring(4, 6)) - 1,
      parseInt(date.substring(6, 8)),
      parseInt(time.substring(0, 2)),
      parseInt(time.substring(2, 4)),
      parseInt(time.substring(4, 6))
    );
  }
  
  return new Date(dateString);
}

export function formatICalDate(date: Date, allDay: boolean = false): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  if (allDay) {
    return `${year}${month}${day}`;
  }
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

export function parseICalFile(icalContent: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = icalContent.split('\n').map(line => line.trim());
  
  let currentEvent: Partial<CalendarEvent> = {};
  let inEvent = false;
  
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (line === 'END:VEVENT' && inEvent) {
      if (currentEvent.summary && currentEvent.startDate) {
        events.push(currentEvent as CalendarEvent);
      }
      inEvent = false;
    } else if (inEvent) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':');
      
      switch (key) {
        case 'SUMMARY':
          currentEvent.summary = value;
          break;
        case 'DESCRIPTION':
          currentEvent.description = value;
          break;
        case 'DTSTART':
        case 'DTSTART;VALUE=DATE':
          const startDate = parseICalDate(value);
          currentEvent.startDate = startDate.toISOString().split('T')[0];
          if (key === 'DTSTART' && value.includes('T')) {
            currentEvent.startTime = startDate.toTimeString().substring(0, 5);
            currentEvent.allDay = false;
          } else {
            currentEvent.allDay = true;
          }
          break;
        case 'DTEND':
        case 'DTEND;VALUE=DATE':
          const endDate = parseICalDate(value);
          currentEvent.endDate = endDate.toISOString().split('T')[0];
          if (key === 'DTEND' && value.includes('T')) {
            currentEvent.endTime = endDate.toTimeString().substring(0, 5);
          }
          break;
        case 'LOCATION':
          currentEvent.location = value;
          break;
      }
    }
  }
  
  return events;
}

export function generateICalFile(events: CalendarEvent[], filename: string = 'bookings.ics'): void {
  let icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Booking Engine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ].join('\r\n');
  
  events.forEach(event => {
    const startDate = new Date(event.startDate + (event.startTime ? `T${event.startTime}` : ''));
    const endDate = new Date(event.endDate + (event.endTime ? `T${event.endTime}` : ''));
    
    icalContent += '\r\n' + [
      'BEGIN:VEVENT',
      `DTSTART${event.allDay ? ';VALUE=DATE' : ''}:${formatICalDate(startDate, event.allDay)}`,
      `DTEND${event.allDay ? ';VALUE=DATE' : ''}:${formatICalDate(endDate, event.allDay)}`,
      `SUMMARY:${event.summary}`,
      event.description ? `DESCRIPTION:${event.description}` : '',
      event.location ? `LOCATION:${event.location}` : '',
      `UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}@bookingengine.com`,
      `DTSTAMP:${formatICalDate(new Date())}`,
      'END:VEVENT'
    ].filter(Boolean).join('\r\n');
  });
  
  icalContent += '\r\nEND:VCALENDAR';
  
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTimeForDisplay(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function generateTimeSlots(start: string, end: string, duration: number): string[] {
  const slots: string[] = [];
  const startTime = new Date(`1970-01-01T${start}:00`);
  const endTime = new Date(`1970-01-01T${end}:00`);
  
  let currentTime = new Date(startTime);
  
  while (currentTime < endTime) {
    slots.push(currentTime.toTimeString().substring(0, 5));
    currentTime.setMinutes(currentTime.getMinutes() + duration);
  }
  
  return slots;
}

// Date range utility functions
export function calculateNumberOfNights(checkInDate: string, checkOutDate: string): number {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const timeDiff = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  
  return dates;
}

export function formatDateRange(checkInDate: string, checkOutDate: string): string {
  const checkIn = formatDateForDisplay(checkInDate);
  const checkOut = formatDateForDisplay(checkOutDate);
  const nights = calculateNumberOfNights(checkInDate, checkOutDate);
  
  return `${checkIn} - ${checkOut} (${nights} night${nights !== 1 ? 's' : ''})`;
}

export function isDateInRange(date: string, checkInDate: string, checkOutDate: string): boolean {
  const targetDate = new Date(date);
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  
  return targetDate >= checkIn && targetDate < checkOut;
}

// Early check-in and late check-out utilities
export function isEarlyCheckIn(checkInTime: string | undefined, standardCheckInTime: string | undefined): boolean {
  if (!checkInTime || !standardCheckInTime) return false;
  
  const checkIn = new Date(`1970-01-01T${checkInTime}:00`);
  const standard = new Date(`1970-01-01T${standardCheckInTime}:00`);
  
  return checkIn < standard;
}

export function isLateCheckOut(checkOutTime: string | undefined, standardCheckOutTime: string | undefined): boolean {
  if (!checkOutTime || !standardCheckOutTime) return false;
  
  const checkOut = new Date(`1970-01-01T${checkOutTime}:00`);
  const standard = new Date(`1970-01-01T${standardCheckOutTime}:00`);
  
  return checkOut > standard;
}

// Calculate if stay duration exceeds 24 hours when using custom times
export function calculateStayDuration(
  checkInDate: string,
  checkOutDate: string,
  checkInTime: string | undefined,
  checkOutTime: string | undefined
): number {
  if (!checkInTime || !checkOutTime) return 0;
  
  const checkIn = new Date(`${checkInDate}T${checkInTime}:00`);
  const checkOut = new Date(`${checkOutDate}T${checkOutTime}:00`);
  
  const durationMs = checkOut.getTime() - checkIn.getTime();
  const durationHours = durationMs / (1000 * 60 * 60); // Convert to hours
  
  return durationHours;
}

export function isStayOver24Hours(
  checkInDate: string,
  checkOutDate: string,
  checkInTime: string | undefined,
  checkOutTime: string | undefined
): boolean {
  const duration = calculateStayDuration(checkInDate, checkOutDate, checkInTime, checkOutTime);
  return duration > 24;
}

export function calculateAdditionalFees(
  checkInTime: string | undefined,
  checkOutTime: string | undefined,
  standardCheckInTime: string | undefined,
  standardCheckOutTime: string | undefined,
  earlyCheckInFee: number,
  lateCheckOutFee: number,
  checkInDate?: string,
  checkOutDate?: string,
  dayPrice?: number
): { 
  earlyCheckInFee: number; 
  lateCheckOutFee: number; 
  over24HoursPenalty: number;
  totalAdditionalFees: number 
} {
  const earlyCheckIn = isEarlyCheckIn(checkInTime, standardCheckInTime);
  const lateCheckOut = isLateCheckOut(checkOutTime, standardCheckOutTime);
  
  const earlyFee = earlyCheckIn ? earlyCheckInFee : 0;
  const lateFee = lateCheckOut ? lateCheckOutFee : 0;
  
  // Calculate over 24 hours penalty when custom times are used
  let over24HoursPenalty = 0;
  if (checkInDate && checkOutDate && checkInTime && checkOutTime && dayPrice) {
    const isOver24Hours = isStayOver24Hours(checkInDate, checkOutDate, checkInTime, checkOutTime);
    over24HoursPenalty = isOver24Hours ? dayPrice : 0;
  }
  
  return {
    earlyCheckInFee: earlyFee,
    lateCheckOutFee: lateFee,
    over24HoursPenalty,
    totalAdditionalFees: earlyFee + lateFee + over24HoursPenalty
  };
}