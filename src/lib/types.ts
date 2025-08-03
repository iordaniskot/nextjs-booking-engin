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
  date: string; // YYYY-MM-DD format
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
}

export interface BookingSettings {
  businessName: string;
  defaultPrice: number;
  defaultQuantity: number;
  useHourlyBooking: boolean;
  workingHours: {
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  slotDuration: number; // minutes
  advanceBookingDays: number;
  timezone: string;
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
  startTime?: string;
  endTime?: string;
  quantity: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
}