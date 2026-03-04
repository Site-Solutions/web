"use client";

import { CheckCircle2, Clock, Circle, Ticket } from "lucide-react";
import { colors } from "@/lib/colors";

interface SummaryStatsProps {
  completeWoids: number;
  inProgressWoids: number;
  voidWoids: number;
  totalTickets: number;
}

export default function SummaryStats({
  completeWoids,
  inProgressWoids,
  voidWoids,
  totalTickets,
}: SummaryStatsProps) {
  const stats = [
    {
      label: "Complete",
      value: completeWoids,
      icon: CheckCircle2,
      borderColor: "#22c55e",
      iconColor: "#16a34a",
      bgColor: "#f0fdf4",
    },
    {
      label: "In Progress",
      value: inProgressWoids,
      icon: Clock,
      borderColor: "#3b82f6",
      iconColor: "#2563eb",
      bgColor: "#eff6ff",
    },
    {
      label: "Void",
      value: voidWoids,
      icon: Circle,
      borderColor: "#f97316",
      iconColor: "#ea580c",
      bgColor: "#fff7ed",
    },
    {
      label: "Tickets",
      value: totalTickets,
      icon: Ticket,
      borderColor: colors.primary,
      iconColor: colors.primaryDark,
      bgColor: `${colors.primary}12`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3 shadow-sm"
          style={{ borderLeftWidth: "4px", borderLeftColor: stat.borderColor }}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
            style={{ backgroundColor: stat.bgColor }}
          >
            <stat.icon className="w-5 h-5" style={{ color: stat.iconColor }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 leading-none">
              {stat.value}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
