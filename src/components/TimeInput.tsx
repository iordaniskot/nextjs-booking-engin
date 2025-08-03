import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TimeInputProps {
  value?: string; // 24-hour format "HH:MM"
  onChange: (value: string) => void; // Returns 24-hour format "HH:MM"
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function TimeInput({ 
  value, 
  onChange, 
  placeholder, 
  className, 
  disabled = false,
  id 
}: TimeInputProps) {
  const [hour, setHour] = useState<string>('');
  const [minute, setMinute] = useState<string>('');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  // Convert 24-hour format to 12-hour format for display
  useEffect(() => {
    if (value && value.includes(':')) {
      const [hourStr, minuteStr] = value.split(':');
      const hour24 = parseInt(hourStr);
      const minute24 = parseInt(minuteStr);
      
      if (hour24 === 0) {
        setHour('12');
        setPeriod('AM');
      } else if (hour24 < 12) {
        setHour(hour24.toString());
        setPeriod('AM');
      } else if (hour24 === 12) {
        setHour('12');
        setPeriod('PM');
      } else {
        setHour((hour24 - 12).toString());
        setPeriod('PM');
      }
      
      setMinute(minute24.toString().padStart(2, '0'));
    } else if (placeholder && placeholder.includes(':')) {
      // Use placeholder for initial values
      const [hourStr, minuteStr] = placeholder.split(':');
      const hour24 = parseInt(hourStr);
      const minute24 = parseInt(minuteStr);
      
      if (hour24 === 0) {
        setHour('12');
        setPeriod('AM');
      } else if (hour24 < 12) {
        setHour(hour24.toString());
        setPeriod('AM');
      } else if (hour24 === 12) {
        setHour('12');
        setPeriod('PM');
      } else {
        setHour((hour24 - 12).toString());
        setPeriod('PM');
      }
      
      setMinute(minute24.toString().padStart(2, '0'));
    }
  }, [value, placeholder]);

  // Convert 12-hour format back to 24-hour format when values change
  useEffect(() => {
    if (hour && minute && period) {
      let hour24 = parseInt(hour);
      
      if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
      } else if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
      }
      
      const timeString = `${hour24.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
      onChange(timeString);
    }
  }, [hour, minute, period, onChange]);

  // Generate hour options (1-12)
  const hourOptions = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  
  // Generate minute options (00, 15, 30, 45)
  const minuteOptions = ['00', '15', '30', '45'];

  return (
    <div className={`flex gap-2 ${className || ''}`}>
      <Select value={hour} onValueChange={setHour} disabled={disabled}>
        <SelectTrigger className="w-20">
          <SelectValue placeholder="Hr" />
        </SelectTrigger>
        <SelectContent>
          {hourOptions.map(h => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={minute} onValueChange={setMinute} disabled={disabled}>
        <SelectTrigger className="w-20">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent>
          {minuteOptions.map(m => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={period} onValueChange={(value) => setPeriod(value as 'AM' | 'PM')} disabled={disabled}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}