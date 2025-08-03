import React from 'react';
import { AdminDashboard } from './src/components/AdminDashboard';
import { DayAvailability, Booking, TimeSlot } from './src/lib/types';

// This is a simple test to verify the bulk edit functionality works
function TestBulkEdit() {
  const mockAvailability: DayAvailability[] = [
    {
      date: '2024-01-15',
      isAvailable: true,
      basePrice: 100,
      maxQuantity: 10,
      bookedQuantity: 2,
      useHourlyBooking: false
    },
    {
      date: '2024-01-16',
      isAvailable: true,
      basePrice: 120,
      maxQuantity: 8,
      bookedQuantity: 0,
      useHourlyBooking: true,
      timeSlots: [
        {
          id: 'slot-1',
          startTime: '09:00',
          endTime: '10:00',
          available: true,
          quantity: 5,
          bookedQuantity: 0,
          price: 120
        },
        {
          id: 'slot-2',
          startTime: '10:00',
          endTime: '11:00',
          available: true,
          quantity: 5,
          bookedQuantity: 0,
          price: 120
        }
      ]
    }
  ];

  const mockBookings: Booking[] = [];

  const handleUpdateAvailability = (updatedAvailability: DayAvailability[]) => {
    console.log('Updated availability:', updatedAvailability);
  };

  const defaultSettings = {
    defaultPrice: 100,
    defaultQuantity: 10,
    workingHours: { start: '09:00', end: '17:00' },
    slotDuration: 60
  };

  return (
    <AdminDashboard
      availability={mockAvailability}
      bookings={mockBookings}
      onUpdateAvailability={handleUpdateAvailability}
      defaultSettings={defaultSettings}
    />
  );
}

export default TestBulkEdit;