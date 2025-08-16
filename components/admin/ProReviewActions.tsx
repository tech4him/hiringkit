"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  CheckCircle, 
  RefreshCw,
  AlertTriangle,
  FileEdit
} from "lucide-react";

interface AdminOrder {
  id: string;
  kit_id: string;
  status: string;
  total_cents: number;
  kits?: {
    status: string;
    qa_notes?: string;
    regen_counts?: Record<string, number>;
  };
}

interface ProReviewActionsProps {
  order: AdminOrder;
}

export function ProReviewActions({ order }: ProReviewActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleOpenEditor = () => {
    // Navigate to the admin kit editor
    window.open(`/admin/kits/${order.kit_id}/edit`, '_blank');
  };

  const handleApproveAndPublish = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/kits/${order.kit_id}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        setActionMessage("Kit approved and published successfully! Customer will be notified.");
        // Refresh page to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error("Failed to approve kit");
      }
    } catch (error) {
      console.error("Approve error:", error);
      setActionMessage("Failed to approve kit. Please try again.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleRegenerate = async (section: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/kits/${order.kit_id}/sections/${section}/regenerate`, {
        method: 'POST',
      });

      if (response.ok) {
        setActionMessage(`${section} regenerated successfully`);
        // Optionally refresh to show updated content
      } else {
        throw new Error(`Failed to regenerate ${section}`);
      }
    } catch (error) {
      console.error("Regenerate error:", error);
      setActionMessage(`Failed to regenerate ${section}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const getQAStatusBadge = () => {
    if (!order.kits) return null;
    
    switch (order.kits.status) {
      case 'qa_pending':
        return (
          <Badge className="admin-badge-pending border">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Needs Review
          </Badge>
        );
      case 'editing':
        return (
          <Badge className="admin-badge-awaiting border">
            <Edit className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case 'published':
        return (
          <Badge className="admin-badge-ready border">
            <CheckCircle className="h-3 w-3 mr-1" />
            Published
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="border">
            {order.kits.status}
          </Badge>
        );
    }
  };

  const revisionCounts = order.kits?.regen_counts || {};
  const totalRevisions = Object.values(revisionCounts).reduce((sum, count) => sum + count, 0);

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <FileEdit className="h-5 w-5" />
              Pro Review Workflow
            </CardTitle>
            <p className="text-sm text-orange-700 mt-1">
              This Pro order requires manual review and approval before delivery
            </p>
          </div>
          {getQAStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Message */}
        {actionMessage && (
          <div className="bg-white border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-900">{actionMessage}</p>
          </div>
        )}

        {/* QA Notes */}
        {order.kits?.qa_notes && (
          <div className="bg-white border border-orange-200 rounded-lg p-3">
            <h4 className="font-medium text-orange-900 mb-2">QA Notes:</h4>
            <p className="text-sm text-orange-800">{order.kits.qa_notes}</p>
          </div>
        )}

        {/* Revision Information */}
        {totalRevisions > 0 && (
          <div className="bg-white border border-orange-200 rounded-lg p-3">
            <h4 className="font-medium text-orange-900 mb-2">Revisions Made:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(revisionCounts).map(([section, count]) => (
                <Badge key={section} variant="secondary" className="text-xs">
                  {section}: {count}x
                </Badge>
              ))}
              <Badge className="text-xs">
                Total: {totalRevisions} revisions
              </Badge>
            </div>
          </div>
        )}

        {/* Primary Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button 
            onClick={handleOpenEditor}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Edit className="h-4 w-4 mr-2" />
            Open Editor
          </Button>

          <Button 
            onClick={handleApproveAndPublish}
            disabled={isLoading || order.kits?.status === 'published'}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isLoading ? 'Publishing...' : 'Approve & Publish'}
          </Button>
        </div>

        {/* Quick Regeneration Actions */}
        <div className="border-t border-orange-200 pt-4">
          <h4 className="font-medium text-orange-900 mb-3">Quick Actions:</h4>
          <div className="flex flex-wrap gap-2">
            {['scorecard', 'job_post', 'interview', 'work_sample'].map((section) => (
              <Button
                key={section}
                variant="secondary"
                size="sm"
                onClick={() => handleRegenerate(section)}
                disabled={isLoading}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Regen {section.replace('_', ' ')}
              </Button>
            ))}
          </div>
          <p className="text-xs text-orange-600 mt-2">
            Use these to quickly regenerate specific sections if needed
          </p>
        </div>

        {/* Workflow Info */}
        <div className="bg-white border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
          <h5 className="font-medium mb-1">Pro Workflow:</h5>
          <ol className="list-decimal list-inside space-y-1">
            <li>Review generated content in the editor</li>
            <li>Make edits or regenerate sections as needed</li>
            <li>Approve & Publish to notify customer</li>
            <li>Customer receives &ldquo;Ready&rdquo; email with download links</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}