"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Archive, 
  Mail, 
  DollarSign, 
  MessageSquare,
  Clock,
  CheckCircle,
  User as UserIcon,
  Building,
  ArrowLeft
} from "lucide-react";
import { OrderTimeline } from "./OrderTimeline";
import { ProReviewActions } from "./ProReviewActions";
import Link from "next/link";
import type { User } from "@/types";

// Type definitions for order data
interface OrderUser {
  id: string;
  email: string;
  name?: string;
}

interface OrderOrganization {
  id: string;
  name: string;
  brand_logo_url?: string;
}

interface OrderKit {
  id: string;
  title: string;
  status: string;
  intake_json?: {
    role_title?: string;
    organization?: string;
    mission?: string;
    [key: string]: unknown;
  };
  artifacts_json?: Record<string, unknown>;
  edited_json?: Record<string, unknown>;
}

interface AdminOrder {
  id: string;
  kit_id: string;
  user_id: string;
  status: "draft" | "awaiting_payment" | "paid" | "qa_pending" | "ready" | "delivered";
  total_cents: number;
  created_at: string;
  kits?: OrderKit;
  users?: OrderUser;
  organizations?: OrderOrganization;
}

interface AuditLogEntry {
  id: string;
  action: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface OrderDetailProps {
  order: AdminOrder;
  auditLog: AuditLogEntry[];
  currentUser: User;
}

export function OrderDetail({ order, auditLog }: OrderDetailProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const badgeConfig = {
      qa_pending: {
        icon: Clock,
        label: "Pending Review",
        className: "admin-badge-pending border"
      },
      ready: {
        icon: CheckCircle,
        label: "Ready",
        className: "admin-badge-ready border"
      },
      paid: {
        icon: DollarSign,
        label: "Paid",
        className: "admin-badge-paid border"
      },
      delivered: {
        icon: CheckCircle,
        label: "Delivered",
        className: "admin-badge-delivered border"
      },
      awaiting_payment: {
        icon: Clock,
        label: "Awaiting Payment",
        className: "admin-badge-awaiting border"
      }
    };

    const config = badgeConfig[status as keyof typeof badgeConfig];
    
    if (!config) {
      return <Badge variant="secondary" className="border">{status}</Badge>;
    }

    const IconComponent = config.icon;
    
    return (
      <Badge className={cn(config.className)}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadPDF = async () => {
    if (!order.kit_id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/kits/${order.kit_id}/export?format=pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hiring-kit-${order.id.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setActionMessage("PDF downloaded successfully");
      } else {
        throw new Error("Failed to download PDF");
      }
    } catch (error) {
      console.error("Download error:", error);
      setActionMessage("Failed to download PDF");
    } finally {
      setIsLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleDownloadZip = async () => {
    if (!order.kit_id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/kits/${order.kit_id}/export?format=zip`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hiring-kit-${order.id.slice(0, 8)}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setActionMessage("ZIP downloaded successfully");
      } else {
        throw new Error("Failed to download ZIP");
      }
    } catch (error) {
      console.error("Download error:", error);
      setActionMessage("Failed to download ZIP");
    } finally {
      setIsLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/resend-email`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setActionMessage("Email resent successfully");
      } else {
        throw new Error("Failed to resend email");
      }
    } catch (error) {
      console.error("Resend email error:", error);
      setActionMessage("Failed to resend email");
    } finally {
      setIsLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleMarkAsPaid = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/mark-paid`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setActionMessage("Order marked as paid successfully");
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        throw new Error("Failed to mark as paid");
      }
    } catch (error) {
      console.error("Mark as paid error:", error);
      setActionMessage("Failed to mark as paid");
    } finally {
      setIsLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleAddNote = async () => {
    const note = prompt("Enter a note for this order:");
    if (!note) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/add-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
      });
      
      if (response.ok) {
        setActionMessage("Note added successfully");
        // Refresh to show new note in timeline
        window.location.reload();
      } else {
        throw new Error("Failed to add note");
      }
    } catch (error) {
      console.error("Add note error:", error);
      setActionMessage("Failed to add note");
    } finally {
      setIsLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const isPro = order.total_cents >= 10000;
  const canDownload = order.kits?.status === 'published' || order.status === 'ready' || order.status === 'delivered';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-900">{actionMessage}</p>
        </div>
      )}

      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
              <p className="text-muted-foreground">
                Created {formatDate(order.created_at)}
              </p>
            </div>
            <div className="flex gap-2">
              {getStatusBadge(order.status)}
              <Badge variant={isPro ? "default" : "secondary"}>
                {isPro ? "Pro" : "Solo"} Plan
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Info */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Customer
            </h3>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{order.users?.name || "N/A"}</p>
              <p className="text-muted-foreground">{order.users?.email || "N/A"}</p>
            </div>
          </div>
          
          {/* Organization */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Building className="h-4 w-4" />
              Organization
            </h3>
            <p className="text-sm">{order.organizations?.name || order.kits?.intake_json?.organization || "N/A"}</p>
          </div>
          
          {/* Payment */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment
            </h3>
            <p className="text-2xl font-bold">${(order.total_cents / 100).toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Kit Details */}
      {order.kits && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Hiring Kit Details</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Role Title</Label>
                  <p className="mt-1">{order.kits.intake_json?.role_title || "N/A"}</p>
                </div>
                <div>
                  <Label>Kit Status</Label>
                  <div className="mt-1">
                    <Badge variant="secondary">{order.kits.status}</Badge>
                  </div>
                </div>
              </div>
              
              {order.kits.intake_json?.mission && (
                <div>
                  <Label>Mission</Label>
                  <p className="mt-1 text-sm text-gray-700">{order.kits.intake_json.mission}</p>
                </div>
              )}
              
              {/* Downloads Section */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={!canDownload || isLoading}
                  variant={canDownload ? "default" : "secondary"}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  variant="secondary"
                  onClick={handleDownloadZip}
                  disabled={!canDownload || isLoading}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Download ZIP
                </Button>
                {!canDownload && (
                  <p className="text-sm text-muted-foreground self-center ml-2">
                    Downloads available when kit is published
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Pro Review Actions */}
      {isPro && order.status === 'qa_pending' && (
        <ProReviewActions order={order} />
      )}
      
      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Admin Actions</h2>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button 
            onClick={handleResendEmail}
            disabled={isLoading}
            variant="secondary"
          >
            <Mail className="h-4 w-4 mr-2" />
            Resend Email
          </Button>
          
          {order.status === 'awaiting_payment' && (
            <Button 
              onClick={handleMarkAsPaid}
              disabled={isLoading}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          
          <Button 
            variant="secondary"
            onClick={handleAddNote}
            disabled={isLoading}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </CardContent>
      </Card>
      
      {/* Timeline/Audit Log */}
      <OrderTimeline events={auditLog} />
    </div>
  );
}