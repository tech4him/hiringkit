"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Mail, 
  DollarSign, 
  MessageSquare,
  CheckCircle,
  AlertCircle,
  FileText
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  created_at: string;
  metadata?: {
    note?: string;
    previous_status?: string;
    new_status?: string;
    [key: string]: unknown;
  };
}

interface OrderTimelineProps {
  events: AuditLogEntry[];
}

export function OrderTimeline({ events }: OrderTimelineProps) {
  const getEventIcon = (action: string) => {
    switch (action) {
      case 'email_resent':
        return Mail;
      case 'note_added':
        return MessageSquare;
      case 'mark_as_paid':
        return DollarSign;
      case 'status_changed_to_ready':
      case 'status_changed_to_delivered':
        return CheckCircle;
      case 'status_changed_to_qa_pending':
        return Clock;
      default:
        if (action.startsWith('status_changed_to_')) {
          return AlertCircle;
        }
        return FileText;
    }
  };

  const getEventColor = (action: string) => {
    switch (action) {
      case 'email_resent':
        return 'text-blue-600 bg-blue-100';
      case 'note_added':
        return 'text-purple-600 bg-purple-100';
      case 'mark_as_paid':
        return 'text-green-600 bg-green-100';
      case 'status_changed_to_ready':
      case 'status_changed_to_delivered':
        return 'text-green-600 bg-green-100';
      case 'status_changed_to_qa_pending':
        return 'text-orange-600 bg-orange-100';
      default:
        if (action.startsWith('status_changed_to_')) {
          return 'text-gray-600 bg-gray-100';
        }
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatAction = (action: string, metadata?: Record<string, unknown>) => {
    switch (action) {
      case 'email_resent':
        return 'Email resent to customer';
      case 'note_added':
        return metadata?.note ? `Note: ${metadata.note}` : 'Note added';
      case 'mark_as_paid':
        return 'Order marked as paid';
      default:
        if (action.startsWith('status_changed_to_')) {
          const newStatus = action.replace('status_changed_to_', '');
          const previousStatus = metadata?.previous_status;
          return `Status changed${previousStatus ? ` from ${previousStatus}` : ''} to ${newStatus}`;
        }
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No activity recorded yet</p>
            <p className="text-sm">Events will appear here as actions are taken on this order</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => {
            const IconComponent = getEventIcon(event.action);
            const colorClasses = getEventColor(event.action);
            
            return (
              <div key={event.id} className="flex gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`rounded-full p-2 ${colorClasses}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  {index < events.length - 1 && (
                    <div className="w-px h-8 bg-gray-200 mt-2" />
                  )}
                </div>
                
                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {formatAction(event.action, event.metadata)}
                    </p>
                    <time className="text-xs text-gray-500">
                      {formatDate(event.created_at)}
                    </time>
                  </div>
                  
                  {/* Additional metadata */}
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-1">
                      {event.metadata.note && event.action !== 'note_added' && (
                        <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 mt-1">
                          {event.metadata.note}
                        </p>
                      )}
                      
                      {event.metadata.previous_status && event.metadata.new_status && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {event.metadata.previous_status}
                          </Badge>
                          <span className="text-xs text-gray-400">→</span>
                          <Badge variant="secondary" className="text-xs">
                            {event.metadata.new_status}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}