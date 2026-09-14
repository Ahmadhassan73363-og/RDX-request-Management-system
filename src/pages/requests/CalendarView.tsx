import React, { useState } from 'react';
import { RequestRecord } from '../../types/request';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, DollarSign } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';

interface CalendarViewProps {
  requests: RequestRecord[];
  onSelectRequest: (req: RequestRecord) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ requests, onSelectRequest }) => {
  // Current view year and month (March 2026)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // March 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Days grid
  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Format YYYY-MM-DD
  const formatDay = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header Controls */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/80 shadow-xs">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">
            {monthNames[month]} {year}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={prevMonth} leftIcon={<ChevronLeft className="w-4 h-4" />}>
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(2026, 2, 1))}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth} rightIcon={<ChevronRight className="w-4 h-4" />}>
            Next
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-xs font-bold text-muted-foreground py-2.5">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-28 bg-muted/10" />;
            }

            const dateStr = formatDay(day);
            const dayRequests = requests.filter(r => r.requestDate === dateStr || r.deliveryTargetDate === dateStr);
            const isToday = dateStr === '2026-03-07';

            return (
              <div
                key={dateStr}
                className={`h-28 p-1.5 flex flex-col justify-between transition-colors overflow-hidden ${
                  isToday ? 'bg-primary/[0.04]' : 'hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      isToday
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'text-foreground'
                    }`}
                  >
                    {day}
                  </span>
                  {dayRequests.length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {dayRequests.length} item{dayRequests.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-20 no-scrollbar mt-1">
                  {dayRequests.map(r => (
                    <div
                      key={r.id}
                      onClick={() => onSelectRequest(r)}
                      className="px-1.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-medium truncate cursor-pointer transition-colors"
                      title={`${r.trackingNumber}: ${r.customerCompany} - $${r.budgetAmount}`}
                    >
                      <span className="font-bold">{r.trackingNumber}</span>: {r.customerCompany}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
