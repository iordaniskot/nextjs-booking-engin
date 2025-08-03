import React, { useState, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { Calendar } from './components/Calendar';
import { BookingForm } from './components/BookingForm';
import { AdminDashboard } from './components/AdminDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { 
  Calendar as CalendarIcon, 
  Download, 
  Upload, 
  Settings, 
  Plus,
  DollarSign,
  Clock,
  Users,
  GearSix
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { 
  DayAvailability, 
  Booking, 
  BookingSettings, 
  BookingFormData,
  TimeSlot 
} from '@/lib/types';
import { 
  generateICalFile, 
  parseICalFile, 
  generateTimeSlots,
  formatDateForDisplay,
  formatTimeForDisplay,
  calculateNumberOfNights,
  generateDateRange,
  formatDateRange,
  isDateInRange,
  isEarlyCheckIn,
  isLateCheckOut,
  calculateAdditionalFees,
  isStayOver24Hours,
  calculateStayDuration
} from '@/lib/calendar-utils';

function App() {
  const [bookings, setBookings] = useKV<Booking[]>('bookings', []);
  const [availability, setAvailability] = useKV<DayAvailability[]>('availability', []);
  const [settings, setSettings] = useKV<BookingSettings>('settings', {
    businessName: 'Hotel Booking System',
    defaultPrice: 150,
    defaultQuantity: 5,
    useHourlyBooking: false,
    allowRangeBooking: true, // Enable range booking by default for hotel-style bookings
    minimumNights: 2, // Minimum 2 nights for multi-day bookings
    workingHours: { start: '09:00', end: '17:00' },
    slotDuration: 60,
    advanceBookingDays: 365, // Allow booking up to a year in advance
    timezone: 'UTC',
    checkInTime: '14:00', // Default 2 PM check-in
    checkOutTime: '10:00', // Default 10 AM check-out
    requireCheckInOutTimes: false, // Allow manual time selection if no defaults
    earlyCheckInFee: 50, // Default $50 for early check-in
    lateCheckOutFee: 50, // Default $50 for late check-out
    earlyCheckInEnabled: true, // Allow early check-in by default
    lateCheckOutEnabled: true // Allow late check-out by default
  });

  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');

  useEffect(() => {
    initializeAvailability();
  }, [settings]);

  const initializeAvailability = () => {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + (settings?.advanceBookingDays || 90));

    const existingDates = new Set(availability.map(day => day.date));
    const newAvailability: DayAvailability[] = [...availability];

    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      
      if (!existingDates.has(dateKey)) {
        const dayAvailability: DayAvailability = {
          date: dateKey,
          isAvailable: true,
          basePrice: settings?.defaultPrice || 100,
          maxQuantity: settings?.defaultQuantity || 10,
          bookedQuantity: 0,
          useHourlyBooking: false, // Default to false for new days
          timeSlots: undefined // Start with no time slots
        };
        
        newAvailability.push(dayAvailability);
      }
    }

    if (newAvailability.length > availability.length) {
      setAvailability(newAvailability);
    }
  };

  const generateDefaultTimeSlots = (): TimeSlot[] => {
    if (!settings) return [];
    
    const slots = generateTimeSlots(
      settings.workingHours.start, 
      settings.workingHours.end, 
      settings.slotDuration
    );

    return slots.map((startTime, index) => {
      const startDate = new Date(`1970-01-01T${startTime}:00`);
      const endDate = new Date(startDate.getTime() + settings.slotDuration * 60000);
      const endTime = endDate.toTimeString().substring(0, 5);

      return {
        id: `slot-${index}`,
        startTime,
        endTime,
        available: true,
        quantity: settings.defaultQuantity,
        bookedQuantity: 0,
        price: settings.defaultPrice
      };
    });
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    const dayAvailability = availability.find(day => day.date === date);
    if (dayAvailability?.isAvailable) {
      setShowBookingForm(true);
    }
  };

  const handleBookingSubmit = async (bookingData: BookingFormData) => {
    try {
      // Validation checks
      if (!bookingData.customerName?.trim() || !bookingData.customerEmail?.trim()) {
        toast.error('Please fill in all required customer information');
        return;
      }

      // For range bookings, validate all dates in the range
      if (bookingData.isRangeBooking && bookingData.checkInDate && bookingData.checkOutDate) {
        const numberOfNights = calculateNumberOfNights(bookingData.checkInDate, bookingData.checkOutDate);
        
        // Check minimum nights requirement
        if (settings?.minimumNights && numberOfNights < settings.minimumNights) {
          toast.error(`Minimum stay is ${settings.minimumNights} nights. Your booking is ${numberOfNights} nights.`);
          return;
        }
        
        const datesInRange = generateDateRange(bookingData.checkInDate, bookingData.checkOutDate);
        
        // Check availability for all dates in range
        for (const dateInRange of datesInRange) {
          const dayAvailability = availability.find(day => day.date === dateInRange);
          if (!dayAvailability || !dayAvailability.isAvailable) {
            toast.error(`Date ${formatDateForDisplay(dateInRange)} is not available for booking`);
            return;
          }
          
          // Check capacity for each date
          if ((dayAvailability.maxQuantity - dayAvailability.bookedQuantity) < bookingData.quantity) {
            toast.error(`Not enough capacity available for ${formatDateForDisplay(dateInRange)}`);
            return;
          }
        }

        const totalPrice = calculateBookingPrice(bookingData) * numberOfNights;

        // Calculate additional fees for early check-in and late check-out
        const dayPrice = availability.find(day => day.date === bookingData.checkInDate)?.basePrice || settings.defaultPrice;
        const additionalFees = calculateAdditionalFees(
          bookingData.checkInTime,
          bookingData.checkOutTime,
          settings.checkInTime,
          settings.checkOutTime,
          settings.earlyCheckInFee || 0,
          settings.lateCheckOutFee || 0,
          bookingData.checkInDate,
          bookingData.checkOutDate,
          dayPrice
        );

        const finalTotalPrice = totalPrice + additionalFees.totalAdditionalFees;

        const newBooking: Booking = {
          id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: bookingData.checkInDate, // Use check-in date as primary date
          checkInDate: bookingData.checkInDate,
          checkOutDate: bookingData.checkOutDate,
          checkInTime: bookingData.checkInTime,
          checkOutTime: bookingData.checkOutTime,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          quantity: bookingData.quantity,
          totalPrice: finalTotalPrice,
          customerName: bookingData.customerName,
          customerEmail: bookingData.customerEmail,
          customerPhone: bookingData.customerPhone,
          notes: bookingData.notes,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isRangeBooking: true,
          numberOfNights,
          earlyCheckInFee: additionalFees.earlyCheckInFee,
          lateCheckOutFee: additionalFees.lateCheckOutFee,
          over24HoursPenalty: additionalFees.over24HoursPenalty,
          isEarlyCheckIn: bookingData.isEarlyCheckIn,
          isLateCheckOut: bookingData.isLateCheckOut
        };

        setBookings(currentBookings => [...currentBookings, newBooking]);
        
        // Update availability for all dates in range
        setAvailability(currentAvailability => 
          currentAvailability.map(day => {
            if (datesInRange.includes(day.date)) {
              return {
                ...day,
                bookedQuantity: day.bookedQuantity + bookingData.quantity
              };
            }
            return day;
          })
        );

        setShowBookingForm(false);
        setSelectedDate(undefined);
        toast.success(`Range booking confirmed: ${formatDateRange(bookingData.checkInDate, bookingData.checkOutDate)}`);
        return;
      }

      // Single day booking logic (existing logic)
      const dayAvailability = availability.find(day => day.date === bookingData.date);
      if (!dayAvailability || !dayAvailability.isAvailable) {
        toast.error('Selected date is not available for booking');
        return;
      }

      // Check quantity availability
      if (dayAvailability.useHourlyBooking && dayAvailability.timeSlots && bookingData.startTime) {
        const selectedSlot = dayAvailability.timeSlots.find(slot => slot.startTime === bookingData.startTime);
        if (!selectedSlot || !selectedSlot.available) {
          toast.error('Selected time slot is not available');
          return;
        }
        if ((selectedSlot.quantity - selectedSlot.bookedQuantity) < bookingData.quantity) {
          toast.error('Not enough capacity available for selected time slot');
          return;
        }
      } else {
        if ((dayAvailability.maxQuantity - dayAvailability.bookedQuantity) < bookingData.quantity) {
          toast.error('Not enough capacity available for selected date');
          return;
        }
      }

      const newBooking: Booking = {
        id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: bookingData.date,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        quantity: bookingData.quantity,
        totalPrice: calculateBookingPrice(bookingData),
        customerName: bookingData.customerName,
        customerEmail: bookingData.customerEmail,
        customerPhone: bookingData.customerPhone,
        notes: bookingData.notes,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isRangeBooking: false
      };

      setBookings(currentBookings => [...currentBookings, newBooking]);
      
      // Update availability
      setAvailability(currentAvailability => 
        currentAvailability.map(day => {
          if (day.date === bookingData.date) {
            const updatedDay = { ...day };
            
            if (day.useHourlyBooking && day.timeSlots && bookingData.startTime) {
              updatedDay.timeSlots = day.timeSlots.map(slot => {
                if (slot.startTime === bookingData.startTime) {
                  return {
                    ...slot,
                    bookedQuantity: slot.bookedQuantity + bookingData.quantity
                  };
                }
                return slot;
              });
            } else {
              updatedDay.bookedQuantity = day.bookedQuantity + bookingData.quantity;
            }
            
            return updatedDay;
          }
          return day;
        })
      );

      setShowBookingForm(false);
      setSelectedDate(undefined);
      toast.success(`Booking confirmed for ${formatDateForDisplay(bookingData.date)}`);
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to create booking. Please try again.');
    }
  };

  const calculateBookingPrice = (bookingData: BookingFormData): number => {
    const targetDate = bookingData.isRangeBooking ? bookingData.checkInDate : bookingData.date;
    if (!targetDate) return 0;
    
    const dayAvailability = availability.find(day => day.date === targetDate);
    if (!dayAvailability) return 0;

    if (dayAvailability.useHourlyBooking && dayAvailability.timeSlots && bookingData.startTime) {
      const timeSlot = dayAvailability.timeSlots.find(slot => slot.startTime === bookingData.startTime);
      return (timeSlot?.price || dayAvailability.basePrice) * bookingData.quantity;
    }

    return dayAvailability.basePrice * bookingData.quantity;
  };

  const handleExportBookings = () => {
    const events = bookings.map(booking => {
      if (booking.isRangeBooking && booking.checkInDate && booking.checkOutDate) {
        // For range bookings, create a multi-day event
        const checkInTimeDisplay = booking.checkInTime ? ` at ${formatTimeForDisplay(booking.checkInTime)}` : '';
        const checkOutTimeDisplay = booking.checkOutTime ? ` at ${formatTimeForDisplay(booking.checkOutTime)}` : '';
        
        return {
          summary: `Booking - ${booking.customerName} (${booking.numberOfNights} nights)`,
          description: `Customer: ${booking.customerName}\nEmail: ${booking.customerEmail}\nPhone: ${booking.customerPhone || 'N/A'}\nQuantity: ${booking.quantity}\nTotal: $${booking.totalPrice}\nNotes: ${booking.notes || 'N/A'}\nCheck-in: ${formatDateForDisplay(booking.checkInDate)}${checkInTimeDisplay}\nCheck-out: ${formatDateForDisplay(booking.checkOutDate)}${checkOutTimeDisplay}`,
          startDate: booking.checkInDate,
          endDate: booking.checkOutDate,
          startTime: booking.checkInTime,
          endTime: booking.checkOutTime,
          allDay: !booking.checkInTime && !booking.checkOutTime, // Only all-day if no times specified
          location: settings?.businessName || 'Booking Location'
        };
      } else {
        // Single day booking
        return {
          summary: `Booking - ${booking.customerName}`,
          description: `Customer: ${booking.customerName}\nEmail: ${booking.customerEmail}\nPhone: ${booking.customerPhone || 'N/A'}\nQuantity: ${booking.quantity}\nTotal: $${booking.totalPrice}\nNotes: ${booking.notes || 'N/A'}`,
          startDate: booking.date,
          endDate: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          allDay: !booking.startTime,
          location: settings?.businessName || 'Booking Location'
        };
      }
    });

    generateICalFile(events, 'bookings.ics');
    toast.success('Bookings exported successfully');
  };

  const handleImportCalendar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const events = parseICalFile(content);
        
        // Convert events to bookings (simplified)
        const importedBookings: Booking[] = events.map((event, index) => ({
          id: `imported-${Date.now()}-${index}`,
          date: event.startDate,
          startTime: event.startTime,
          endTime: event.endTime,
          quantity: 1,
          totalPrice: settings?.defaultPrice || 100,
          customerName: event.summary || 'Imported Booking',
          customerEmail: 'imported@example.com',
          notes: event.description,
          status: 'confirmed' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        setBookings(currentBookings => [...currentBookings, ...importedBookings]);
        toast.success(`Imported ${importedBookings.length} bookings`);
      } catch (error) {
        toast.error('Failed to import calendar file');
      }
    };
    reader.readAsText(file);
  };

  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
  const todayBookings = bookings.filter(booking => 
    booking.date === new Date().toISOString().split('T')[0]
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {settings?.businessName || 'Booking Engine'}
            </h1>
            <p className="text-muted-foreground">
              {settings?.allowRangeBooking 
                ? `Book your stay with easy check-in and check-out dates${settings?.minimumNights && settings.minimumNights > 1 ? ` (minimum ${settings.minimumNights} nights)` : ''}`
                : 'Manage your bookings and availability'
              }
            </p>
          </div>
          
          <div className="flex gap-2">
            <input
              type="file"
              accept=".ics"
              onChange={handleImportCalendar}
              className="hidden"
              id="import-calendar"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('import-calendar')?.click()}
            >
              <Upload size={16} className="mr-2" />
              Import iCal
            </Button>
            
            <Button
              variant="outline"
              onClick={handleExportBookings}
              disabled={bookings.length === 0}
            >
              <Download size={16} className="mr-2" />
              Export iCal
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowSettings(true)}
            >
              <Settings size={16} className="mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <CalendarIcon size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
              <Clock size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayBookings}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="bookings">Booking List</TabsTrigger>
            <TabsTrigger value="admin">Admin Dashboard</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar" className="mt-6">
            <Calendar
              availability={availability}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          </TabsContent>
          
          <TabsContent value="bookings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No bookings yet. Start by selecting a date on the calendar.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(booking => (
                        <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <div className="font-medium">{booking.customerName}</div>
                            <div className="text-sm text-muted-foreground">
                              {booking.isRangeBooking && booking.checkInDate && booking.checkOutDate
                                ? (() => {
                                    const checkInTime = booking.checkInTime ? ` at ${formatTimeForDisplay(booking.checkInTime)}` : '';
                                    const checkOutTime = booking.checkOutTime ? ` at ${formatTimeForDisplay(booking.checkOutTime)}` : '';
                                    return `${formatDateRange(booking.checkInDate, booking.checkOutDate)}${checkInTime && checkOutTime ? ` (${booking.checkInTime}-${booking.checkOutTime})` : ''}`;
                                  })()
                                : `${formatDateForDisplay(booking.date)}${booking.startTime ? ` at ${formatTimeForDisplay(booking.startTime)}` : ''}`
                              }
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Quantity: {booking.quantity} • Total: ${booking.totalPrice}
                              {booking.isRangeBooking && booking.numberOfNights && ` • ${booking.numberOfNights} nights`}
                              {(booking.earlyCheckInFee || booking.lateCheckOutFee || booking.over24HoursPenalty) && (
                                <span className="text-accent">
                                  {booking.earlyCheckInFee && ` • Early check-in: +$${booking.earlyCheckInFee}`}
                                  {booking.lateCheckOutFee && ` • Late check-out: +$${booking.lateCheckOutFee}`}
                                  {booking.over24HoursPenalty && ` • Over 24hr penalty: +$${booking.over24HoursPenalty}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                              {booking.status}
                            </Badge>
                            {booking.isRangeBooking && (
                              <Badge variant="outline" className="text-xs">
                                Multi-day
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="admin" className="mt-6">
            <AdminDashboard
              availability={availability}
              bookings={bookings}
              onUpdateAvailability={setAvailability}
              defaultSettings={{
                defaultPrice: settings?.defaultPrice || 100,
                defaultQuantity: settings?.defaultQuantity || 10,
                workingHours: settings?.workingHours || { start: '09:00', end: '17:00' },
                slotDuration: settings?.slotDuration || 60
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Booking Form Dialog */}
        <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
          <DialogContent className="w-[90vw] max-w-4xl max-h-[85vh] overflow-y-auto">
            {selectedDate && (
              <BookingForm
                selectedDate={selectedDate}
                availability={availability}
                onSubmit={handleBookingSubmit}
                onCancel={() => {
                  setShowBookingForm(false);
                  setSelectedDate(undefined);
                }}
                allowRangeBooking={settings?.allowRangeBooking || false}
                minimumNights={settings?.minimumNights || 1}
                checkInTime={settings?.checkInTime}
                checkOutTime={settings?.checkOutTime}
                requireCheckInOutTimes={settings?.requireCheckInOutTimes || false}
                earlyCheckInEnabled={settings?.earlyCheckInEnabled || false}
                lateCheckOutEnabled={settings?.lateCheckOutEnabled || false}
                earlyCheckInFee={settings?.earlyCheckInFee || 0}
                lateCheckOutFee={settings?.lateCheckOutFee || 0}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={settings?.businessName || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev!, businessName: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="defaultPrice">Default Price ($)</Label>
                <Input
                  id="defaultPrice"
                  type="number"
                  value={settings?.defaultPrice || 0}
                  onChange={(e) => setSettings(prev => ({ ...prev!, defaultPrice: parseInt(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="defaultQuantity">Default Quantity</Label>
                <Input
                  id="defaultQuantity"
                  type="number"
                  value={settings?.defaultQuantity || 0}
                  onChange={(e) => setSettings(prev => ({ ...prev!, defaultQuantity: parseInt(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="useHourlyBooking"
                  checked={settings?.useHourlyBooking || false}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev!, useHourlyBooking: checked }))}
                />
                <Label htmlFor="useHourlyBooking">Enable Hourly Booking</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allowRangeBooking"
                  checked={settings?.allowRangeBooking || false}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev!, allowRangeBooking: checked }))}
                />
                <Label htmlFor="allowRangeBooking">Allow Multi-day Bookings</Label>
              </div>

              {settings?.allowRangeBooking && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="minimumNights">Minimum Nights</Label>
                    <Input
                      id="minimumNights"
                      type="number"
                      min="1"
                      value={settings?.minimumNights || 1}
                      onChange={(e) => setSettings(prev => ({ ...prev!, minimumNights: parseInt(e.target.value) || 1 }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum number of nights required for multi-day bookings
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Check-in / Check-out Times</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkInTime">Default Check-in Time</Label>
                        <Input
                          id="checkInTime"
                          type="time"
                          value={settings?.checkInTime || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev!, checkInTime: e.target.value }))}
                          placeholder="14:00"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="checkOutTime">Default Check-out Time</Label>
                        <Input
                          id="checkOutTime"
                          type="time"
                          value={settings?.checkOutTime || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev!, checkOutTime: e.target.value }))}
                          placeholder="10:00"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="requireCheckInOutTimes"
                        checked={settings?.requireCheckInOutTimes || false}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev!, requireCheckInOutTimes: checked }))}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="requireCheckInOutTimes">Enforce Default Times</Label>
                        <p className="text-xs text-muted-foreground">
                          When enabled, customers must use default times. When disabled, customers can set custom times.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Early Check-in & Late Check-out Fees</h4>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="earlyCheckInEnabled"
                          checked={settings?.earlyCheckInEnabled || false}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev!, earlyCheckInEnabled: checked }))}
                        />
                        <Label htmlFor="earlyCheckInEnabled">Enable Early Check-in</Label>
                      </div>

                      {settings?.earlyCheckInEnabled && (
                        <div className="space-y-2 ml-6">
                          <Label htmlFor="earlyCheckInFee">Early Check-in Fee ($)</Label>
                          <Input
                            id="earlyCheckInFee"
                            type="number"
                            min="0"
                            value={settings?.earlyCheckInFee || 0}
                            onChange={(e) => setSettings(prev => ({ ...prev!, earlyCheckInFee: parseInt(e.target.value) || 0 }))}
                            placeholder="50"
                          />
                          <p className="text-xs text-muted-foreground">
                            Additional fee for checking in before {settings?.checkInTime ? formatTimeForDisplay(settings.checkInTime) : 'standard time'}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="lateCheckOutEnabled"
                          checked={settings?.lateCheckOutEnabled || false}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev!, lateCheckOutEnabled: checked }))}
                        />
                        <Label htmlFor="lateCheckOutEnabled">Enable Late Check-out</Label>
                      </div>

                      {settings?.lateCheckOutEnabled && (
                        <div className="space-y-2 ml-6">
                          <Label htmlFor="lateCheckOutFee">Late Check-out Fee ($)</Label>
                          <Input
                            id="lateCheckOutFee"
                            type="number"
                            min="0"
                            value={settings?.lateCheckOutFee || 0}
                            onChange={(e) => setSettings(prev => ({ ...prev!, lateCheckOutFee: parseInt(e.target.value) || 0 }))}
                            placeholder="50"
                          />
                          <p className="text-xs text-muted-foreground">
                            Additional fee for checking out after {settings?.checkOutTime ? formatTimeForDisplay(settings.checkOutTime) : 'standard time'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t">
                <Button onClick={() => setShowSettings(false)} className="w-full">
                  Save Settings
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Toaster />
    </div>
  );
}

export default App;