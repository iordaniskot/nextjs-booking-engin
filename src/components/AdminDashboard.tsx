import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Calendar as CalendarIcon,
  Plus,
  Minus,
  Clock,
  DollarSign,
  Users,
  Eye,
  Edit
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { DayAvailability, Booking, TimeSlot } from '@/lib/types';
import { formatDateForDisplay, formatTimeForDisplay, generateTimeSlots } from '@/lib/calendar-utils';

interface AdminDashboardProps {
  availability: DayAvailability[];
  bookings: Booking[];
  onUpdateAvailability: (updatedAvailability: DayAvailability[]) => void;
  defaultSettings: {
    defaultPrice: number;
    defaultQuantity: number;
    workingHours: { start: string; end: string };
    slotDuration: number;
  };
}

interface CalendarCellProps {
  day: DayAvailability;
  bookingsForDay: Booking[];
  onEditDay: (day: DayAvailability) => void;
  onPreviewBookings: (bookings: Booking[]) => void;
}

const CalendarCell: React.FC<CalendarCellProps> = ({ 
  day, 
  bookingsForDay, 
  onEditDay, 
  onPreviewBookings 
}) => {
  const date = new Date(day.date);
  const dayOfMonth = date.getDate();
  const isToday = day.date === new Date().toISOString().split('T')[0];
  const hasBookings = bookingsForDay.length > 0;
  const totalRevenue = bookingsForDay.reduce((sum, booking) => sum + booking.totalPrice, 0);
  
  const availableQuantity = day.useHourlyBooking && day.timeSlots
    ? day.timeSlots.reduce((sum, slot) => sum + (slot.quantity - slot.bookedQuantity), 0)
    : day.maxQuantity - day.bookedQuantity;

  return (
    <div className={`
      relative min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all
      ${isToday ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted/50'}
      ${!day.isAvailable ? 'opacity-50 bg-muted' : ''}
    `}>
      <div className="flex justify-between items-start mb-2">
        <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
          {dayOfMonth}
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onEditDay(day);
            }}
          >
            <Edit size={12} />
          </Button>
          {hasBookings && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onPreviewBookings(bookingsForDay);
              }}
            >
              <Eye size={12} />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1 text-xs">
        {day.isAvailable ? (
          <>
            <div className="flex items-center gap-1">
              <DollarSign size={10} />
              <span>${day.basePrice}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={10} />
              <span>{availableQuantity}/{day.maxQuantity}</span>
            </div>
            {day.useHourlyBooking && (
              <Badge variant="secondary" className="text-xs">
                <Clock size={8} className="mr-1" />
                Hourly
              </Badge>
            )}
            {hasBookings && (
              <div className="mt-2">
                <Badge variant="default" className="text-xs">
                  {bookingsForDay.length} booking{bookingsForDay.length !== 1 ? 's' : ''}
                </Badge>
                {totalRevenue > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ${totalRevenue}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <Badge variant="destructive" className="text-xs">
            Unavailable
          </Badge>
        )}
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  availability,
  bookings,
  onUpdateAvailability,
  defaultSettings
}) => {
  const [selectedDay, setSelectedDay] = useState<DayAvailability | null>(null);
  const [showDayEditor, setShowDayEditor] = useState(false);
  const [showBookingPreview, setShowBookingPreview] = useState(false);
  const [previewBookings, setPreviewBookings] = useState<Booking[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get days for current month view
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
  
  const calendarDays: (DayAvailability | null)[] = [];
  const currentDate = new Date(startDate);
  
  for (let i = 0; i < 42; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayData = availability.find(day => day.date === dateStr);
    
    if (currentDate.getMonth() === currentMonth.getMonth()) {
      calendarDays.push(dayData || createEmptyDay(dateStr));
    } else {
      calendarDays.push(null);
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  function createEmptyDay(date: string): DayAvailability {
    return {
      date,
      isAvailable: true,
      basePrice: defaultSettings.defaultPrice,
      maxQuantity: defaultSettings.defaultQuantity,
      bookedQuantity: 0,
      useHourlyBooking: false
    };
  }

  const handleEditDay = (day: DayAvailability) => {
    setSelectedDay({ ...day });
    setShowDayEditor(true);
  };

  const handlePreviewBookings = (dayBookings: Booking[]) => {
    setPreviewBookings(dayBookings);
    setShowBookingPreview(true);
  };

  const handleSaveDay = (updatedDay: DayAvailability) => {
    const updatedAvailability = availability.map(day => 
      day.date === updatedDay.date ? updatedDay : day
    );
    
    // If day doesn't exist in availability, add it
    if (!availability.find(day => day.date === updatedDay.date)) {
      updatedAvailability.push(updatedDay);
    }
    
    onUpdateAvailability(updatedAvailability);
    setShowDayEditor(false);
    setSelectedDay(null);
    toast.success('Day updated successfully');
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin Calendar</h2>
          <p className="text-muted-foreground">
            Manage availability, pricing, and view bookings
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigateMonth('prev')}
          >
            ←
          </Button>
          
          <h3 className="text-lg font-semibold min-w-[200px] text-center">
            {currentMonth.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </h3>
          
          <Button
            variant="outline"
            onClick={() => navigateMonth('next')}
          >
            →
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Week Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => (
              <div key={index}>
                {day ? (
                  <CalendarCell
                    day={day}
                    bookingsForDay={bookings.filter(booking => booking.date === day.date)}
                    onEditDay={handleEditDay}
                    onPreviewBookings={handlePreviewBookings}
                  />
                ) : (
                  <div className="min-h-[120px] p-2 opacity-30" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Day Editor Dialog */}
      {selectedDay && (
        <DayEditorDialog
          day={selectedDay}
          open={showDayEditor}
          onOpenChange={setShowDayEditor}
          onSave={handleSaveDay}
          defaultSettings={defaultSettings}
        />
      )}

      {/* Booking Preview Dialog */}
      <BookingPreviewDialog
        bookings={previewBookings}
        open={showBookingPreview}
        onOpenChange={setShowBookingPreview}
      />
    </div>
  );
};

interface DayEditorDialogProps {
  day: DayAvailability;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (day: DayAvailability) => void;
  defaultSettings: {
    defaultPrice: number;
    defaultQuantity: number;
    workingHours: { start: string; end: string };
    slotDuration: number;
  };
}

const DayEditorDialog: React.FC<DayEditorDialogProps> = ({
  day,
  open,
  onOpenChange,
  onSave,
  defaultSettings
}) => {
  const [editingDay, setEditingDay] = useState<DayAvailability>(day);

  React.useEffect(() => {
    setEditingDay(day);
  }, [day]);

  const handleToggleHourlyBooking = (useHourly: boolean) => {
    if (useHourly && !editingDay.timeSlots) {
      // Generate default time slots
      const slots = generateTimeSlots(
        defaultSettings.workingHours.start,
        defaultSettings.workingHours.end,
        defaultSettings.slotDuration
      );

      const timeSlots: TimeSlot[] = slots.map((startTime, index) => {
        const startDate = new Date(`1970-01-01T${startTime}:00`);
        const endDate = new Date(startDate.getTime() + defaultSettings.slotDuration * 60000);
        const endTime = endDate.toTimeString().substring(0, 5);

        return {
          id: `slot-${index}`,
          startTime,
          endTime,
          available: true,
          quantity: defaultSettings.defaultQuantity,
          bookedQuantity: 0,
          price: defaultSettings.defaultPrice
        };
      });

      setEditingDay(prev => ({
        ...prev,
        useHourlyBooking: true,
        timeSlots
      }));
    } else {
      setEditingDay(prev => ({
        ...prev,
        useHourlyBooking: useHourly,
        timeSlots: useHourly ? prev.timeSlots : undefined
      }));
    }
  };

  const handleUpdateTimeSlot = (slotId: string, updates: Partial<TimeSlot>) => {
    setEditingDay(prev => ({
      ...prev,
      timeSlots: prev.timeSlots?.map(slot =>
        slot.id === slotId ? { ...slot, ...updates } : slot
      )
    }));
  };

  const handleAddTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      startTime: '09:00',
      endTime: '10:00',
      available: true,
      quantity: defaultSettings.defaultQuantity,
      bookedQuantity: 0,
      price: defaultSettings.defaultPrice
    };

    setEditingDay(prev => ({
      ...prev,
      timeSlots: [...(prev.timeSlots || []), newSlot]
    }));
  };

  const handleRemoveTimeSlot = (slotId: string) => {
    setEditingDay(prev => ({
      ...prev,
      timeSlots: prev.timeSlots?.filter(slot => slot.id !== slotId)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Day - {formatDateForDisplay(editingDay.date)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="available"
                  checked={editingDay.isAvailable}
                  onCheckedChange={(checked) =>
                    setEditingDay(prev => ({ ...prev, isAvailable: checked }))
                  }
                />
                <Label htmlFor="available">Day Available for Booking</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Price ($)</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    value={editingDay.basePrice}
                    onChange={(e) =>
                      setEditingDay(prev => ({ 
                        ...prev, 
                        basePrice: parseInt(e.target.value) || 0 
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxQuantity">Max Quantity</Label>
                  <Input
                    id="maxQuantity"
                    type="number"
                    value={editingDay.maxQuantity}
                    onChange={(e) =>
                      setEditingDay(prev => ({ 
                        ...prev, 
                        maxQuantity: parseInt(e.target.value) || 0 
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="hourlyBooking"
                  checked={editingDay.useHourlyBooking}
                  onCheckedChange={handleToggleHourlyBooking}
                />
                <Label htmlFor="hourlyBooking">Enable Hourly Time Slots</Label>
              </div>
            </CardContent>
          </Card>

          {/* Time Slots Management */}
          {editingDay.useHourlyBooking && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Time Slots</CardTitle>
                <Button onClick={handleAddTimeSlot} size="sm">
                  <Plus size={16} className="mr-1" />
                  Add Slot
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {editingDay.timeSlots?.map((slot, index) => (
                  <div key={slot.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="grid grid-cols-4 gap-3 flex-1">
                      <div className="space-y-1">
                        <Label className="text-xs">Start Time</Label>
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleUpdateTimeSlot(slot.id, { startTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End Time</Label>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleUpdateTimeSlot(slot.id, { endTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Price ($)</Label>
                        <Input
                          type="number"
                          value={slot.price}
                          onChange={(e) => handleUpdateTimeSlot(slot.id, { 
                            price: parseInt(e.target.value) || 0 
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          value={slot.quantity}
                          onChange={(e) => handleUpdateTimeSlot(slot.id, { 
                            quantity: parseInt(e.target.value) || 0 
                          })}
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Switch
                        checked={slot.available}
                        onCheckedChange={(checked) => handleUpdateTimeSlot(slot.id, { available: checked })}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveTimeSlot(slot.id)}
                      >
                        <Minus size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {(!editingDay.timeSlots || editingDay.timeSlots.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    No time slots configured. Add a slot to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => onSave(editingDay)}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface BookingPreviewDialogProps {
  bookings: Booking[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BookingPreviewDialog: React.FC<BookingPreviewDialogProps> = ({
  bookings,
  open,
  onOpenChange
}) => {
  if (!bookings.length) return null;

  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
  const totalQuantity = bookings.reduce((sum, booking) => sum + booking.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Bookings for {formatDateForDisplay(bookings[0]?.date)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{bookings.length}</p>
                    <p className="text-xs text-muted-foreground">Bookings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{totalQuantity}</p>
                    <p className="text-xs text-muted-foreground">Total Quantity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">${totalRevenue}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Booking List */}
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{booking.customerName}</h4>
                      <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
                      {booking.customerPhone && (
                        <p className="text-sm text-muted-foreground">{booking.customerPhone}</p>
                      )}
                      {booking.startTime && (
                        <p className="text-sm text-muted-foreground">
                          {formatTimeForDisplay(booking.startTime)}
                          {booking.endTime && ` - ${formatTimeForDisplay(booking.endTime)}`}
                        </p>
                      )}
                      {booking.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{booking.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${booking.totalPrice}</p>
                      <p className="text-sm text-muted-foreground">Qty: {booking.quantity}</p>
                      <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};