"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowRight,
  Loader2,
  ShoppingCart,
  Eye,
  FileText
} from "lucide-react";

interface Kit {
  id: string;
  title: string;
  status: string;
  created_at: string;
  intake_json?: {
    role_title?: string;
    organization?: string;
    mission?: string;
  };
  artifacts_json?: Record<string, unknown>;
}

export default function KitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kitId = params.id as string;
  
  const [kit, setKit] = useState<Kit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadKit = async () => {
      try {
        const response = await fetch(`/api/kits/${kitId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Kit not found. It may have been deleted or the link is invalid.");
          } else {
            setError("Failed to load kit details.");
          }
          return;
        }
        
        const data = await response.json();
        setKit(data.kit || data);
      } catch (err) {
        console.error("Error loading kit:", err);
        setError("Failed to load kit details.");
      } finally {
        setIsLoading(false);
      }
    };

    if (kitId) {
      loadKit();
    }
  }, [kitId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your hiring kit...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-lg font-semibold text-red-900 mb-2">
              Unable to Load Kit
            </h1>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="space-y-2">
              <Button
                onClick={() => router.push("/kit")}
                className="w-full"
              >
                Create New Kit
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push("/")}
                className="w-full"
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {kit?.title || "Hiring Kit"}
              </h1>
              <p className="text-sm text-gray-600">
                Kit ID: {kitId} • Status: {kit?.status || "Unknown"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6">
          {/* Kit Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Kit Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button
                  onClick={() => router.push(`/kit`)}
                  variant="secondary"
                  className="flex items-center gap-2 h-12"
                >
                  <Eye className="h-4 w-4" />
                  Back to Kit Builder
                </Button>
                
                <Button
                  onClick={() => {
                    if (!kitId) {
                      console.error('No kit ID available for checkout navigation');
                      return;
                    }
                    router.push(`/kit/${kitId}/checkout`);
                  }}
                  className="flex items-center gap-2 h-12 bg-[#1F4B99] text-white hover:brightness-110"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Purchase Kit
                </Button>

                {kit?.status === "paid" && (
                  <Button
                    onClick={() => {
                      if (!kitId) {
                        console.error('No kit ID available for success navigation');
                        return;
                      }
                      router.push(`/kit/${kitId}/success`);
                    }}
                    variant="secondary"
                    className="flex items-center gap-2 h-12"
                  >
                    <FileText className="h-4 w-4" />
                    Download Kit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Kit Information */}
          <Card>
            <CardHeader>
              <CardTitle>Kit Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kit?.intake_json && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Role Details</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Role:</strong> {kit.intake_json.role_title}</p>
                      {kit.intake_json.organization && (
                        <p><strong>Organization:</strong> {kit.intake_json.organization}</p>
                      )}
                      {kit.intake_json.mission && (
                        <p><strong>Mission:</strong> {kit.intake_json.mission}</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Created</h3>
                  <p className="text-sm text-gray-600">
                    {kit?.created_at ? new Date(kit.created_at).toLocaleString() : "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push("/kit")}
                  variant="secondary"
                  className="w-full flex items-center justify-between"
                >
                  Create Another Kit
                  <ArrowRight className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={() => router.push("/")}
                  variant="secondary"
                  className="w-full flex items-center justify-between"
                >
                  Go to Homepage
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}