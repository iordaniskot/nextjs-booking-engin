import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from '@phosphor-icons/react';
import { DayAvailability, ViewMode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CalendarProps {
  availability: DayAvailability[];
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function Calendar({ 
  availability, 
  selectedDate, 
  onDateSelect, 
  viewMode = 'month',
  onViewModeChange 
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const availabilityMap = useMemo(() => {
    const map = new Map<string, DayAvailability>();
    availability.forEach(day => {
      map.set(day.date, day);
    });
    return map;
  }, [availability]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDayInfo = (date: Date) => {
    const dateKey = formatDateKey(date);
    const dayAvailability = availabilityMap.get(dateKey);
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    
    // Calculate availability considering hourly slots
    let isAvailable = dayAvailability?.isAvailable && !isPast;
    let availableQuantity = 0;
    let hasBookings = false;
    
    if (dayAvailability) {
      if (dayAvailability.useHourlyBooking && dayAvailability.timeSlots) {
        // For hourly booking, check if any time slots are available
        const availableSlots = dayAvailability.timeSlots.filter(slot => 
          slot.available && slot.quantity > slot.bookedQuantity
        );
        isAvailable = isAvailable && availableSlots.length > 0;
        availableQuantity = dayAvailability.timeSlots.reduce(
          (sum, slot) => sum + Math.max(0, slot.quantity - slot.bookedQuantity), 0
        );
        hasBookings = dayAvailability.timeSlots.some(slot => slot.bookedQuantity > 0);
      } else {
        // For whole day booking
        availableQuantity = dayAvailability.maxQuantity - dayAvailability.bookedQuantity;
        hasBookings = dayAvailability.bookedQuantity > 0;
        isAvailable = isAvailable && availableQuantity > 0;
      }
    }
    
    return {
      dateKey,
      dayAvailability,
      isPast,
      isToday: dateKey === new Date().toISOString().split('T')[0],
      isSelected: dateKey === selectedDate,
      isAvailable,
      hasBookings,
      availableQuantity
    };
  };

  const renderDayCell = (date: Date | null) => {
    if (!date) {
      return <div key="empty" className="h-20 p-1" />;
    }

    const dayInfo = getDayInfo(date);
    
    return (
      <Button
        key={dayInfo.dateKey}
        variant={dayInfo.isSelected ? "default" : "ghost"}
        className={cn(
          "h-20 p-1 flex flex-col items-start justify-start relative hover:bg-muted transition-colors",
          dayInfo.isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
          dayInfo.isPast && "opacity-50 cursor-not-allowed",
          !dayInfo.isAvailable && !dayInfo.isPast && "cursor-not-allowed",
          dayInfo.isToday && "ring-2 ring-accent"
        )}
        onClick={() => {
          if (dayInfo.isAvailable) {
            onDateSelect(dayInfo.dateKey);
          }
        }}
        disabled={!dayInfo.isAvailable}
      >
        <span className={cn(
          "text-sm font-medium",
          dayInfo.isSelected ? "text-primary-foreground" : "text-foreground"
        )}>
          {date.getDate()}
        </span>
        
        {dayInfo.dayAvailability && (
          <div className="flex flex-col gap-1 mt-1 w-full">
            <div className="text-xs">
              ${dayInfo.dayAvailability.basePrice}
            </div>
            
            {dayInfo.isAvailable && (
              <Badge 
                variant="secondary" 
                className="text-xs px-1 py-0 h-4"
              >
                {dayInfo.availableQuantity} left
              </Badge>
            )}
            
            {dayInfo.hasBookings && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
            )}
          </div>
        )}
      </Button>
    );
  };

  const monthName = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysInMonth = getDaysInMonth(currentDate);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon size={24} className="text-primary" />
            <h2 className="text-2xl font-semibold">{monthName}</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft size={16} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="h-8 flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground">
              {day}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((date, index) => (
          <div key={index}>
            {renderDayCell(date)}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 mt-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-accent rounded-full" />
          <span>Has bookings</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-muted border border-border rounded" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-muted opacity-50 rounded" />
          <span>Unavailable</span>
        </div>
      </div>
    </Card>
  );
}