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
import { Calendar, Clock, DollarSign, User, CalendarBlank } from '@phosphor-icons/react';
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
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    date: selectedDate,
    checkInDate: selectedDate,
    checkOutDate: '',
    quantity: 1,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
    isRangeBooking: false
  });

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);

  // Get the availability for the selected/check-in date
  const dayAvailability = Array.isArray(availability) 
    ? availability.find(day => day.date === (isRangeMode ? formData.checkInDate : selectedDate))
    : availability;

  useEffect(() => {
    calculateTotalPrice();
  }, [formData.quantity, formData.checkInDate, formData.checkOutDate, selectedTimeSlot, isRangeMode]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      isRangeBooking: isRangeMode,
      date: isRangeMode ? prev.checkInDate || selectedDate : selectedDate
    }));
  }, [isRangeMode, selectedDate]);

  const calculateTotalPrice = () => {
    if (!dayAvailability) {
      setTotalPrice(0);
      return;
    }

    const pricePerUnit = selectedTimeSlot?.price || dayAvailability.basePrice;
    
    if (isRangeMode && formData.checkInDate && formData.checkOutDate) {
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

    if (isRangeMode && (!formData.checkInDate || !formData.checkOutDate)) {
      return;
    }

    const submissionData: BookingFormData = {
      ...formData,
      startTime: selectedTimeSlot?.startTime || formData.startTime,
      endTime: selectedTimeSlot?.endTime || formData.endTime,
      isRangeBooking: isRangeMode
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
    (!isRangeMode || (formData.checkInDate && formData.checkOutDate));

  const numberOfNights = isRangeMode && formData.checkInDate && formData.checkOutDate 
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
        {/* Booking Type Selection */}
        {allowRangeBooking && (
          <Card>
            <CardHeader>
              <CardTitle>Booking Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch
                  id="range-mode"
                  checked={isRangeMode}
                  onCheckedChange={setIsRangeMode}
                />
                <Label htmlFor="range-mode" className="flex items-center gap-2">
                  <CalendarBlank size={16} />
                  Multi-day booking (Check-in/Check-out)
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} />
              {isRangeMode ? 'Check-in & Check-out Dates' : formatDateForDisplay(selectedDate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isRangeMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkin-date">Check-in Date</Label>
                  <Input
                    id="checkin-date"
                    type="date"
                    value={formData.checkInDate || selectedDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, checkInDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout-date">Check-out Date</Label>
                  <Input
                    id="checkout-date"
                    type="date"
                    value={formData.checkOutDate}
                    onChange={(e) => handleCheckOutDateChange(e.target.value)}
                    min={formData.checkInDate ? 
                      new Date(new Date(formData.checkInDate).getTime() + 86400000).toISOString().split('T')[0] 
                      : new Date(new Date().getTime() + 86400000).toISOString().split('T')[0]
                    }
                  />
                </div>
                {formData.checkInDate && formData.checkOutDate && (
                  <div className="col-span-full">
                    <Badge variant="secondary" className="text-sm">
                      {formatDateRange(formData.checkInDate, formData.checkOutDate)}
                    </Badge>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} />
              Booking Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Price per unit:</span>
                <span>${selectedTimeSlot?.price || dayAvailability.basePrice}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span>{formData.quantity}</span>
              </div>
              {isRangeMode && numberOfNights > 1 && (
                <div className="flex justify-between">
                  <span>Number of nights:</span>
                  <span>{numberOfNights}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${totalPrice}</span>
              </div>
              {isRangeMode && numberOfNights > 1 && (
                <div className="text-xs text-muted-foreground">
                  ${selectedTimeSlot?.price || dayAvailability.basePrice} × {formData.quantity} × {numberOfNights} nights
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
            className="flex-1"
          >
            {isSubmitting ? "Creating Booking..." : "Confirm Booking"}
          </Button>
        </div>
      </form>
    </div>
  );
}