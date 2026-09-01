"use client";

/**
 * Web version of the mobile app's WeekCalendarStrip: Sun–Sat row with
 * chevron week paging, the selected day in a filled brand circle, today's
 * label tinted, and a dot under days that have activity.
 */

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { colors } from "@/lib/colors";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function atMidnight(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export default function WeekStrip({
  selectedDate,
  onSelect,
  hasDot,
}: {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  hasDot?: (date: Date) => boolean;
}) {
  const today = atMidnight(new Date());
  const [weekOffset, setWeekOffset] = useState(() => {
    const sel = atMidnight(selectedDate);
    const diffDays = Math.round((sel.getTime() - today.getTime()) / 86400000);
    return Math.floor((diffDays + today.getDay()) / 7);
  });

  const weekDates = useMemo(() => {
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [weekOffset, today.getTime()]);

  const isSame = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center">
        <button
          aria-label="Previous week"
          onClick={() => setWeekOffset((w) => w - 1)}
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="grid flex-1 grid-cols-7">
          {weekDates.map((d) => {
            const selected = isSame(d, atMidnight(selectedDate));
            const isToday = isSame(d, today);
            const dot = hasDot?.(d) ?? false;
            return (
              <button
                key={d.toISOString()}
                onClick={() => onSelect(d)}
                className="flex flex-col items-center gap-1 py-1"
              >
                <span
                  className="text-xs font-medium"
                  style={{ color: isToday ? colors.primary : "#9CA3AF" }}
                >
                  {DAY_NAMES[d.getDay()]}
                </span>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-base ${
                    selected ? "font-bold text-white" : "font-semibold text-gray-800"
                  }`}
                  style={selected ? { backgroundColor: colors.primary } : undefined}
                >
                  {d.getDate()}
                </span>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: dot && !selected ? colors.primary : "transparent" }}
                />
              </button>
            );
          })}
        </div>
        <button
          aria-label="Next week"
          onClick={() => setWeekOffset((w) => w + 1)}
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
