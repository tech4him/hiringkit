"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft,
  Save,
  RefreshCw,
  CheckCircle,
  FileText,
  Users,
  MessageSquare,
  Briefcase,
  Phone,
  MapPin,
  Eye,
  Edit3
} from "lucide-react";
import Link from "next/link";
import type { User } from "@/types";

interface KitData {
  id: string;
  title: string;
  status: string;
  intake_json?: Record<string, unknown>;
  artifacts_json?: Record<string, unknown>;
  edited_json?: Record<string, unknown>;
  qa_notes?: string;
  orders?: Array<{
    id: string;
    status: string;
    total_cents: number;
    users?: {
      id: string;
      email: string;
      name?: string;
    };
  }>;
}

interface AdminKitEditorProps {
  kit: KitData;
  currentUser: User;
}

export function AdminKitEditor({ kit }: AdminKitEditorProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('scorecard');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, unknown>>(kit.edited_json || kit.artifacts_json || {});
  const [hasChanges, setHasChanges] = useState(false);

  const order = kit.orders?.[0];

  const sections = [
    { id: 'scorecard', name: 'Scorecard', icon: FileText },
    { id: 'job_post', name: 'Job Post', icon: Briefcase },
    { id: 'interview_stage1', name: 'Interview Stage 1', icon: MessageSquare },
    { id: 'interview_stage2', name: 'Interview Stage 2', icon: MessageSquare },
    { id: 'interview_stage3', name: 'Interview Stage 3', icon: MessageSquare },
    { id: 'work_sample', name: 'Work Sample', icon: Users },
    { id: 'reference_check', name: 'Reference Check', icon: Phone },
    { id: 'process_map', name: 'Process Map', icon: MapPin },
  ];

  const handleContentChange = useCallback((section: string, field: string, value: string | string[]) => {
    setEditedContent((prev: Record<string, unknown>) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setHasChanges(true);
  }, []);

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      console.log('Saving changes:', { 
        edited_json: editedContent, 
        qa_notes: kit.qa_notes 
      });
      
      const response = await fetch(`/api/admin/kits/${kit.id}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          edited_json: editedContent,
          qa_notes: kit.qa_notes
        }),
      });

      if (response.ok) {
        setHasChanges(false);
        setActionMessage("Changes saved successfully");
      } else {
        const errorData = await response.json();
        console.error("Save failed:", errorData);
        throw new Error(errorData.error?.message || "Failed to save changes");
      }
    } catch (error) {
      console.error("Save error:", error);
      setActionMessage("Failed to save changes");
    } finally {
      setIsLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleRegenerateSection = async (section: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/kits/${kit.id}/sections/${section}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}) // Empty body, using existing intake data
      });

      if (response.ok) {
        const result = await response.json();
        setEditedContent((prev: Record<string, unknown>) => ({
          ...prev,
          [section]: result.data.section
        }));
        setHasChanges(true);
        setActionMessage(`${section} regenerated successfully`);
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

  const handleApproveAndPublish = async () => {
    if (hasChanges) {
      setActionMessage("Please save changes before publishing");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/kits/${kit.id}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        setActionMessage("Kit approved and published successfully! Customer will be notified.");
        setTimeout(() => {
          router.push(`/admin/orders/${order?.id}`);
        }, 2000);
      } else {
        throw new Error("Failed to approve kit");
      }
    } catch (error) {
      console.error("Approve error:", error);
      setActionMessage("Failed to approve kit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderSectionEditor = (sectionId: string) => {
    const sectionData = editedContent[sectionId] || {};
    
    switch (sectionId) {
      case 'scorecard':
        return (
          <div className="space-y-4">
            <div>
              <Label>Mission</Label>
              <Textarea
                value={sectionData.mission || ''}
                onChange={(e) => handleContentChange(sectionId, 'mission', e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Key Outcomes (one per line)</Label>
              <Textarea
                value={Array.isArray(sectionData.outcomes) ? sectionData.outcomes.join('\n') : ''}
                onChange={(e) => handleContentChange(sectionId, 'outcomes', e.target.value.split('\n').filter(line => line.trim()))}
                rows={5}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Responsibilities (one per line)</Label>
              <Textarea
                value={Array.isArray(sectionData.responsibilities) ? sectionData.responsibilities.join('\n') : ''}
                onChange={(e) => handleContentChange(sectionId, 'responsibilities', e.target.value.split('\n'))}
                rows={5}
                className="mt-1"
              />
            </div>
          </div>
        );

      case 'job_post':
        return (
          <div className="space-y-4">
            <div>
              <Label>Introduction</Label>
              <Textarea
                value={sectionData.intro || ''}
                onChange={(e) => handleContentChange(sectionId, 'intro', e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Role Summary</Label>
              <Textarea
                value={sectionData.summary || ''}
                onChange={(e) => handleContentChange(sectionId, 'summary', e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Must-Have Requirements (one per line)</Label>
              <Textarea
                value={Array.isArray(sectionData.must) ? sectionData.must.join('\n') : ''}
                onChange={(e) => handleContentChange(sectionId, 'must', e.target.value.split('\n'))}
                rows={5}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Nice-to-Have Requirements (one per line)</Label>
              <Textarea
                value={Array.isArray(sectionData.nice) ? sectionData.nice.join('\n') : ''}
                onChange={(e) => handleContentChange(sectionId, 'nice', e.target.value.split('\n'))}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Section editor for {sectionId} is being built</p>
              <p className="text-sm">Use the Regenerate button to refresh this section&apos;s content</p>
            </div>
            {sectionData && (
              <div>
                <Label>Current Content (Read-only preview)</Label>
                <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(sectionData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={order ? `/admin/orders/${order.id}` : '/admin/kits'}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {order ? 'Order' : 'Kits'}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Kit Editor</h1>
            <p className="text-gray-600">{kit.title || kit.intake_json?.role_title || 'Untitled Kit'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-900">
              Unsaved Changes
            </Badge>
          )}
          <Badge variant="secondary">{kit.status}</Badge>
        </div>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900">{actionMessage}</p>
        </div>
      )}

      {/* Order Info */}
      {order && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Order #{order.id.slice(0, 8)} - ${(order.total_cents / 100).toFixed(0)} Pro Plan</p>
                <p className="text-sm text-gray-600">Customer: {order.users?.name || order.users?.email}</p>
              </div>
              <Link href={`/admin/orders/${order.id}`}>
                <Button variant="secondary" size="sm">
                  <Eye className="h-3 w-3 mr-1" />
                  View Order
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kit Sections</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {sections.map((section) => {
                  const IconComponent = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        isActive ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700' : ''
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span className="text-sm font-medium">{section.name}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mt-4 space-y-2">
            <Button
              onClick={handleSaveChanges}
              disabled={!hasChanges || isLoading}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            
            <Button
              onClick={handleApproveAndPublish}
              disabled={hasChanges || isLoading || kit.status === 'published'}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Publish
            </Button>
          </div>
        </div>

        {/* Section Editor */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  {sections.find(s => s.id === activeSection)?.name || activeSection}
                </CardTitle>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRegenerateSection(activeSection)}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(activeSection)}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}