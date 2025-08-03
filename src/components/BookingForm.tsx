import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, DollarSign, User } from '@phosphor-icons/react';
import { BookingFormData, DayAvailability, TimeSlot } from '@/lib/types';
import { formatDateForDisplay, formatTimeForDisplay } from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';

interface BookingFormProps {
  selectedDate: string;
  availability: DayAvailability;
  onSubmit: (booking: BookingFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function BookingForm({ 
  selectedDate, 
  availability, 
  onSubmit, 
  onCancel,
  isSubmitting = false 
}: BookingFormProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    date: selectedDate,
    quantity: 1,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: ''
  });

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    calculateTotalPrice();
  }, [formData.quantity, selectedTimeSlot, availability]);

  const calculateTotalPrice = () => {
    const pricePerUnit = selectedTimeSlot?.price || availability.basePrice;
    const total = pricePerUnit * formData.quantity;
    setTotalPrice(total);
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
    const maxAvailable = selectedTimeSlot 
      ? selectedTimeSlot.quantity - selectedTimeSlot.bookedQuantity
      : availability.maxQuantity - availability.bookedQuantity;
    
    const validQuantity = Math.min(Math.max(1, quantity), maxAvailable);
    setFormData(prev => ({ ...prev, quantity: validQuantity }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerEmail) {
      return;
    }

    if (availability.useHourlyBooking && !selectedTimeSlot) {
      return;
    }

    onSubmit({
      ...formData,
      startTime: selectedTimeSlot?.startTime || formData.startTime,
      endTime: selectedTimeSlot?.endTime || formData.endTime
    });
  };

  const maxQuantity = selectedTimeSlot 
    ? selectedTimeSlot.quantity - selectedTimeSlot.bookedQuantity
    : availability.maxQuantity - availability.bookedQuantity;

  const isFormValid = formData.customerName && formData.customerEmail && 
    (!availability.useHourlyBooking || selectedTimeSlot);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar size={24} className="text-primary" />
          New Booking
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date and Time Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Calendar size={20} />
              {formatDateForDisplay(selectedDate)}
            </div>

            {availability.useHourlyBooking && availability.timeSlots && (
              <div className="space-y-2">
                <Label>Select Time Slot</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availability.timeSlots
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
                
                {availability.timeSlots.filter(slot => slot.available && slot.quantity > slot.bookedQuantity).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No available time slots for this date.
                  </div>
                )}
              </div>
            )}
            
            {availability.useHourlyBooking && (!availability.timeSlots || availability.timeSlots.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                No time slots configured for this date. Please contact the administrator.
              </div>
            )}
          </div>

          <Separator />

          {/* Quantity Selection */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
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
          </div>

          <Separator />

          {/* Customer Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <User size={20} />
              Customer Information
            </div>

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
          </div>

          <Separator />

          {/* Price Summary */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <DollarSign size={20} />
              Booking Summary
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Price per unit:</span>
                <span>${selectedTimeSlot?.price || availability.basePrice}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span>{formData.quantity}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${totalPrice}</span>
              </div>
            </div>
          </div>

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
      </CardContent>
    </Card>
  );
}