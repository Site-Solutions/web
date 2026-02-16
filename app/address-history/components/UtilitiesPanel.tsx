"use client";

import { Ticket } from "lucide-react";

interface TicketData {
  _id: string;
  ticketId: string;
  startDate?: number;
  updates: Array<{
    _creationTime: number;
    utilityCompany: string;
    status: string;
  }>;
}

interface UtilitiesPanelProps {
  tickets: TicketData[];
  formatDate: (timestamp: number) => string;
}

function getStatusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes("clear") || s.includes("marked")) return "#22c55e";
  if (s.includes("pending") || s.includes("wait")) return "#eab308";
  return "#9ca3af";
}

function getStatusBg(status: string) {
  const s = status.toLowerCase();
  if (s.includes("clear") || s.includes("marked")) return "bg-green-50 border-green-200";
  if (s.includes("pending") || s.includes("wait")) return "bg-yellow-50 border-yellow-200";
  return "bg-gray-50 border-gray-200";
}

export default function UtilitiesPanel({ tickets, formatDate }: UtilitiesPanelProps) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Ticket className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No tickets found for this address</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Utility Clearance Status</h3>
        <span className="text-xs text-gray-400">
          {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-5">
        {tickets.map((ticket) => {
          // Deduplicate to latest status per utility company
          const utilities = new Map<string, { status: string; updateDate: number }>();
          ticket.updates.forEach((update) => {
            const existing = utilities.get(update.utilityCompany);
            if (!existing || update._creationTime > existing.updateDate) {
              utilities.set(update.utilityCompany, {
                status: update.status,
                updateDate: update._creationTime,
              });
            }
          });

          const clearCount = Array.from(utilities.values()).filter(
            (u) => u.status.toLowerCase().includes("clear") || u.status.toLowerCase().includes("marked")
          ).length;

          return (
            <div key={ticket._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Ticket header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-white border border-gray-200 text-gray-900 rounded-md text-sm font-mono font-medium">
                    #{ticket.ticketId}
                  </span>
                  {ticket.startDate && (
                    <span className="text-xs text-gray-500">
                      Start: {formatDate(ticket.startDate)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {clearCount}/{utilities.size} clear
                  </span>
                  <span className="text-xs text-gray-400">
                    {ticket.updates.length} updates
                  </span>
                </div>
              </div>

              {/* Utility grid */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Array.from(utilities.entries()).map(([company, data]) => (
                  <div
                    key={company}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusBg(data.status)}`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getStatusColor(data.status) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{company}</div>
                      <div className="text-xs text-gray-600 truncate">{data.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
