export interface TimeSlot {
  id: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  available: boolean;
  quantity: number;
  bookedQuantity: number;
  price: number;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD format
  isAvailable: boolean;
  basePrice: number;
  maxQuantity: number;
  bookedQuantity: number;
  timeSlots?: TimeSlot[];
  useHourlyBooking: boolean;
}

export interface Booking {
  id: string;
  date: string; // YYYY-MM-DD format (check-in date for range bookings)
  checkInDate?: string; // YYYY-MM-DD format
  checkOutDate?: string; // YYYY-MM-DD format
  checkInTime?: string; // Check-in time for range bookings (HH:MM format)
  checkOutTime?: string; // Check-out time for range bookings (HH:MM format)
  startTime?: string; // HH:MM format (optional for all-day bookings)
  endTime?: string; // HH:MM format
  quantity: number;
  totalPrice: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  isRangeBooking?: boolean; // true if this is a multi-day booking
  numberOfNights?: number; // calculated field for range bookings
  earlyCheckInFee?: number; // Additional fee for early check-in
  lateCheckOutFee?: number; // Additional fee for late check-out
  isEarlyCheckIn?: boolean; // Whether this booking includes early check-in
  isLateCheckOut?: boolean; // Whether this booking includes late check-out
}

export interface BookingSettings {
  businessName: string;
  defaultPrice: number;
  defaultQuantity: number;
  useHourlyBooking: boolean;
  allowRangeBooking: boolean; // new setting for multi-day bookings
  minimumNights: number; // minimum nights required for multi-day bookings
  workingHours: {
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  slotDuration: number; // minutes
  advanceBookingDays: number;
  timezone: string;
  checkInTime?: string; // Default check-in time for multi-day bookings (HH:MM format)
  checkOutTime?: string; // Default check-out time for multi-day bookings (HH:MM format)
  requireCheckInOutTimes: boolean; // Whether to enforce check-in/out times for range bookings
  earlyCheckInFee: number; // Fee for checking in before standard time
  lateCheckOutFee: number; // Fee for checking out after standard time
  earlyCheckInEnabled: boolean; // Whether early check-in is available
  lateCheckOutEnabled: boolean; // Whether late check-out is available
}

export interface CalendarEvent {
  summary: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  location?: string;
}

export type ViewMode = 'month' | 'week' | 'day';

export interface BookingFormData {
  date: string;
  checkInDate?: string;
  checkOutDate?: string;
  checkInTime?: string; // Check-in time for range bookings
  checkOutTime?: string; // Check-out time for range bookings
  startTime?: string;
  endTime?: string;
  quantity: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  isRangeBooking?: boolean;
  isEarlyCheckIn?: boolean; // Whether early check-in is requested
  isLateCheckOut?: boolean; // Whether late check-out is requested
}