'use client';

import { type FC } from 'react';

interface Event {
  id: string;
  type: string;
  source: string;
  target?: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

interface EventFeedProps {
  events: Event[];
}

const eventIcons: Record<string, string> = {
  'task.created': '📋',
  'task.assigned': '👤',
  'task.started': '🚀',
  'task.completed': '✅',
  'task.failed': '❌',
  'payment.sent': '💸',
  'payment.received': '💰',
  'artifact.produced': '📦',
  'message.sent': '💬',
  'agent.status': '🔔',
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const EventFeed: FC<EventFeedProps> = ({ events }) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Live Event Feed
        </h3>
        <span className="text-xs text-gray-500">{events.length} events</span>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No events yet</p>
            <p className="text-sm">Start a project to see agent communication</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {events.map((event) => (
              <li
                key={event.id}
                className="p-4 hover:bg-gray-800/50 transition event-enter"
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">{eventIcons[event.type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{event.source}</span>
                      {event.target && (
                        <>
                          <span className="text-gray-500">→</span>
                          <span className="font-medium text-sm">{event.target}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {event.type}: {JSON.stringify(event.payload).substring(0, 100)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
