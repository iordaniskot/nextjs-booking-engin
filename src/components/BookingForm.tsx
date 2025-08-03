import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, DollarSign, User, CalendarBlank, Bed, MapPin } from '@phosphor-icons/react';
import { BookingFormData, DayAvailability, TimeSlot } from '@/lib/types';
import { 
  formatDateForDisplay, 
  formatTimeForDisplay, 
  calculateNumberOfNights, 
  generateDateRange,
  formatDateRange 
} from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface BookingFormProps {
  selectedDate: string;
  availability: DayAvailability[];  // Changed to array to support range bookings
  onSubmit: (booking: BookingFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  allowRangeBooking?: boolean;
}

export function BookingForm({ 
  selectedDate, 
  availability, 
  onSubmit, 
  onCancel,
  isSubmitting = false,
  allowRangeBooking = false
}: BookingFormProps) {
  // Get the availability for the selected date first
  const initialDayAvailability = Array.isArray(availability) 
    ? availability.find(day => day.date === selectedDate)
    : availability;

  // When allowRangeBooking is true, force range mode and don't allow switching
  const [isRangeMode, setIsRangeMode] = useState(allowRangeBooking);
  
  const [formData, setFormData] = useState<BookingFormData>({
    date: selectedDate,
    checkInDate: selectedDate,
    checkOutDate: '',
    quantity: 1,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
    isRangeBooking: allowRangeBooking
  });

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);

  // Get the availability for the selected/check-in date
  const dayAvailability = Array.isArray(availability) 
    ? availability.find(day => day.date === (allowRangeBooking ? formData.checkInDate : selectedDate))
    : availability;

  useEffect(() => {
    calculateTotalPrice();
  }, [formData.quantity, formData.checkInDate, formData.checkOutDate, selectedTimeSlot, allowRangeBooking]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      isRangeBooking: allowRangeBooking,
      date: allowRangeBooking ? prev.checkInDate || selectedDate : selectedDate
    }));
  }, [allowRangeBooking, selectedDate]);

  const calculateTotalPrice = () => {
    if (!dayAvailability) {
      setTotalPrice(0);
      return;
    }

    const pricePerUnit = selectedTimeSlot?.price || dayAvailability.basePrice;
    
    if (allowRangeBooking && formData.checkInDate && formData.checkOutDate) {
      const nights = calculateNumberOfNights(formData.checkInDate, formData.checkOutDate);
      const total = pricePerUnit * formData.quantity * nights;
      setTotalPrice(total);
    } else {
      const total = pricePerUnit * formData.quantity;
      setTotalPrice(total);
    }
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setFormData(prev => ({
      ...prev,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime
    }));
  };

  const handleQuantityChange = (quantity: number) => {
    if (!dayAvailability) return;
    
    const maxAvailable = selectedTimeSlot 
      ? selectedTimeSlot.quantity - selectedTimeSlot.bookedQuantity
      : dayAvailability.maxQuantity - dayAvailability.bookedQuantity;
    
    const validQuantity = Math.min(Math.max(1, quantity), maxAvailable);
    setFormData(prev => ({ ...prev, quantity: validQuantity }));
  };

  const handleCheckOutDateChange = (checkOutDate: string) => {
    const checkInDate = new Date(formData.checkInDate || selectedDate);
    const checkOut = new Date(checkOutDate);
    
    // Ensure check-out is after check-in
    if (checkOut <= checkInDate) {
      const nextDay = new Date(checkInDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setFormData(prev => ({ ...prev, checkOutDate: nextDay.toISOString().split('T')[0] }));
    } else {
      setFormData(prev => ({ ...prev, checkOutDate }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerEmail) {
      return;
    }

    if (dayAvailability?.useHourlyBooking && !selectedTimeSlot) {
      return;
    }

    if (allowRangeBooking && (!formData.checkInDate || !formData.checkOutDate)) {
      return;
    }

    const submissionData: BookingFormData = {
      ...formData,
      startTime: selectedTimeSlot?.startTime || formData.startTime,
      endTime: selectedTimeSlot?.endTime || formData.endTime,
      isRangeBooking: allowRangeBooking
    };

    onSubmit(submissionData);
  };

  const maxQuantity = dayAvailability 
    ? (selectedTimeSlot 
        ? selectedTimeSlot.quantity - selectedTimeSlot.bookedQuantity
        : dayAvailability.maxQuantity - dayAvailability.bookedQuantity)
    : 0;

  const isFormValid = formData.customerName && formData.customerEmail && 
    (!dayAvailability?.useHourlyBooking || selectedTimeSlot) &&
    (!allowRangeBooking || (formData.checkInDate && formData.checkOutDate));

  const numberOfNights = allowRangeBooking && formData.checkInDate && formData.checkOutDate 
    ? calculateNumberOfNights(formData.checkInDate, formData.checkOutDate)
    : 1;

  if (!dayAvailability) {
    return (
      <div className="w-full max-w-4xl mx-auto text-center py-8">
        <p className="text-muted-foreground">No availability information found for this date.</p>
        <Button onClick={onCancel} className="mt-4">Close</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Calendar size={24} className="text-primary" />
        <h2 className="text-2xl font-semibold">New Booking</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Only show booking type selection if range booking is NOT enforced */}
        {!allowRangeBooking && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={20} />
                Single Day Booking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  This booking is for a single day: {formatDateForDisplay(selectedDate)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Range booking is enforced - show information */}
        {allowRangeBooking && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bed size={20} className="text-primary" />
                Multi-day Booking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Select your check-in and check-out dates for your stay. Perfect for extended bookings!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date Selection */}
        <Card className={cn(
          allowRangeBooking && "border-2 border-primary/20 bg-primary/5"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {allowRangeBooking ? <Bed size={20} className="text-primary" /> : <Calendar size={20} />}
              {allowRangeBooking ? 'Check-in & Check-out Dates' : formatDateForDisplay(selectedDate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allowRangeBooking ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkin-date" className="flex items-center gap-2">
                      <MapPin size={14} />
                      Check-in Date
                    </Label>
                    <Input
                      id="checkin-date"
                      type="date"
                      value={formData.checkInDate || selectedDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, checkInDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkout-date" className="flex items-center gap-2">
                      <MapPin size={14} />
                      Check-out Date
                    </Label>
                    <Input
                      id="checkout-date"
                      type="date"
                      value={formData.checkOutDate}
                      onChange={(e) => handleCheckOutDateChange(e.target.value)}
                      min={formData.checkInDate ? 
                        new Date(new Date(formData.checkInDate).getTime() + 86400000).toISOString().split('T')[0] 
                        : new Date(new Date().getTime() + 86400000).toISOString().split('T')[0]
                      }
                      className="text-lg"
                    />
                  </div>
                </div>
                
                {formData.checkInDate && formData.checkOutDate && (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Stay Duration</span>
                      <Badge variant="secondary" className="text-sm">
                        {numberOfNights} {numberOfNights === 1 ? 'night' : 'nights'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDateRange(formData.checkInDate, formData.checkOutDate)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Selected date: {formatDateForDisplay(selectedDate)}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Time Slot Selection */}
        {dayAvailability.useHourlyBooking && dayAvailability.timeSlots && (
          <Card>
            <CardHeader>
              <CardTitle>Select Time Slot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {dayAvailability.timeSlots
                  .filter(slot => slot.available && slot.quantity > slot.bookedQuantity)
                  .map(slot => (
                    <Button
                      key={slot.id}
                      type="button"
                      variant={selectedTimeSlot?.id === slot.id ? "default" : "outline"}
                      className="h-auto p-3 flex flex-col items-start"
                      onClick={() => handleTimeSlotSelect(slot)}
                    >
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Clock size={14} />
                        {formatTimeForDisplay(slot.startTime)} - {formatTimeForDisplay(slot.endTime)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ${slot.price} • {slot.quantity - slot.bookedQuantity} available
                      </div>
                    </Button>
                  ))}
              </div>
              
              {dayAvailability.timeSlots.filter(slot => slot.available && slot.quantity > slot.bookedQuantity).length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No available time slots for this date.
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {dayAvailability.useHourlyBooking && (!dayAvailability.timeSlots || dayAvailability.timeSlots.length === 0) && (
          <Card>
            <CardContent>
              <div className="text-center py-4 text-muted-foreground">
                No time slots configured for this date. Please contact the administrator.
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Quantity Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(formData.quantity - 1)}
                disabled={formData.quantity <= 1}
              >
                -
              </Button>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={maxQuantity}
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="w-20 text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(formData.quantity + 1)}
                disabled={formData.quantity >= maxQuantity}
              >
                +
              </Button>
              <Badge variant="secondary" className="ml-2">
                {maxQuantity} available
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Full Name *</Label>
                <Input
                  id="customerName"
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email Address *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone Number</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="Enter phone number (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special requests or notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Price Summary */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} className="text-primary" />
              Booking Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-background p-4 rounded-lg space-y-3 border">
              {allowRangeBooking && formData.checkInDate && formData.checkOutDate && (
                <div className="space-y-2 pb-3 border-b">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Stay Period:</span>
                    <span className="text-sm">{formatDateRange(formData.checkInDate, formData.checkOutDate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Duration:</span>
                    <span className="text-sm">{numberOfNights} {numberOfNights === 1 ? 'night' : 'nights'}</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between">
                <span>Rate per {allowRangeBooking ? 'night' : 'unit'}:</span>
                <span>${selectedTimeSlot?.price || dayAvailability?.basePrice || 0}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span>{formData.quantity}</span>
              </div>
              
              {allowRangeBooking && numberOfNights > 1 && (
                <div className="flex justify-between">
                  <span>Number of nights:</span>
                  <span>{numberOfNights}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-lg font-semibold text-primary">
                <span>Total Amount:</span>
                <span>${totalPrice}</span>
              </div>
              
              {allowRangeBooking && numberOfNights > 1 && (
                <div className="text-xs text-muted-foreground text-center">
                  ${selectedTimeSlot?.price || dayAvailability?.basePrice || 0} × {formData.quantity} × {numberOfNights} nights
                </div>
              )}
              
              {!allowRangeBooking && (
                <div className="text-xs text-muted-foreground text-center">
                  ${selectedTimeSlot?.price || dayAvailability?.basePrice || 0} × {formData.quantity}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="flex-1 bg-primary hover:bg-primary/90"
            size="lg"
          >
            {isSubmitting 
              ? "Processing Booking..." 
              : allowRangeBooking 
                ? `Book ${numberOfNights} ${numberOfNights === 1 ? 'Night' : 'Nights'} - $${totalPrice}`
                : `Confirm Booking - $${totalPrice}`
            }
          </Button>
        </div>
      </form>
    </div>
  );
}