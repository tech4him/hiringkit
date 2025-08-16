"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle, 
  Download, 
  Mail, 
  FileText, 
  Loader2,
  Clock,
  Star
} from "lucide-react";

export default function SuccessPage() {
  const params = useParams();
  const kitId = params.id as string;
  
  const [order, setOrder] = useState<{
    id: string;
    status: string;
    plan_type: string;
    total_cents: number;
    created_at: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const checkOrderStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${kitId}/status`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      }
    } catch (error) {
      console.error("Error checking order status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [kitId]);

  // Add comprehensive logging to track navigation issues
  console.log('SuccessPage loaded:', {
    kitId,
    params,
    url: typeof window !== 'undefined' ? window.location.href : 'server',
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    checkOrderStatus();
  }, [checkOrderStatus]);

  // Add logging to track any navigation attempts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;
      
      window.history.pushState = function(...args) {
        console.log('History pushState called:', args);
        return originalPushState.apply(this, args);
      };
      
      window.history.replaceState = function(...args) {
        console.log('History replaceState called:', args);
        return originalReplaceState.apply(this, args);
      };
      
      return () => {
        window.history.pushState = originalPushState;
        window.history.replaceState = originalReplaceState;
      };
    }
  }, []);

  // Validate kitId after hooks declaration
  if (!kitId || kitId === 'undefined') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-lg font-semibold text-red-900 mb-2">
              Invalid Kit ID
            </h1>
            <p className="text-red-700 mb-4">
              The kit ID is missing or invalid. Please check your order confirmation email for the correct link.
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => window.location.href = "/kit"}
                className="w-full"
              >
                Create New Kit
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.href = "/"}
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

  const handleDownload = async (exportType: "combined_pdf" | "zip") => {
    setIsExporting(true);
    
    try {
      const response = await fetch(`/api/kits/${kitId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ export_type: exportType }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const { download_url } = await response.json();
      
      // Download the file
      const link = document.createElement("a");
      link.href = download_url;
      // Don't set download attribute - let the server determine the filename
      // This ensures the correct file extension is used
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download. Please try again or contact support.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isPro = order?.plan_type === "pro";
  const isQaPending = order?.status === "qa_pending";
  const isReady = order?.status === "ready" || order?.status === "paid" || order?.status === "delivered";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600">
            Thank you for your purchase. Your hiring kit is ready.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">Marketing Manager Hiring Kit</h3>
                    <p className="text-sm text-gray-600">
                      {isPro ? "Pro Kit + Human Review" : "Solo Kit"} • ${isPro ? "129" : "49"}
                    </p>
                  </div>
                  <div className="text-right">
                    {isQaPending ? (
                      <div className="flex items-center gap-2 text-orange-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">Under Review</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Ready</span>
                      </div>
                    )}
                  </div>
                </div>

                {isQaPending && (
                  <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Star className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-900">Expert Review in Progress</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          Our hiring experts are reviewing and optimizing your kit. You&apos;ll receive an email 
                          when it&apos;s ready (typically within 4 business hours).
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Download Options */}
            {isReady && (
              <Card>
                <CardHeader>
                  <CardTitle>Download Your Kit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => handleDownload("combined_pdf")}
                      disabled={isExporting}
                      className="flex items-center justify-center gap-2 h-12"
                      variant="secondary"
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      Combined PDF
                    </Button>
                    
                    <Button
                      onClick={() => handleDownload("zip")}
                      disabled={isExporting}
                      className="flex items-center justify-center gap-2 h-12 bg-[#1F4B99] text-white hover:brightness-110"
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Separate Files ZIP
                    </Button>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    Both formats include all 9 documents. The ZIP file contains separate PDFs for each section.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Email Confirmation */}
            <Card>
              <CardHeader>
                <CardTitle>Email Confirmation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm">
                      A confirmation email with download links has been sent to your email address.
                      {isQaPending && " You'll receive another email when your Pro review is complete."}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Check your spam folder if you don&apos;t see it within a few minutes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What's Next */}
            <Card>
              <CardHeader>
                <CardTitle>What&apos;s Next?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#1F4B99] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <p>Review your complete hiring kit and customize any sections as needed</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#1F4B99] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <p>Share the job post and process map with your team</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#1F4B99] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <p>Start interviewing with structured questions and rubrics</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#1F4B99] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      4
                    </div>
                    <p>Use the reference check script for consistent candidate evaluation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Support */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Questions about your hiring kit or need customizations?
                </p>
                <Button variant="secondary" className="w-full">
                  Contact Support
                </Button>
              </CardContent>
            </Card>

            {/* Create Another Kit */}
            <Card>
              <CardHeader>
                <CardTitle>Hire for Another Role?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Create additional hiring kits for other positions.
                </p>
                <Button 
                  onClick={() => window.location.href = "/"}
                  className="w-full bg-[#1F4B99] text-white hover:brightness-110"
                >
                  Create New Kit
                </Button>
              </CardContent>
            </Card>

            {/* Testimonial */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-2">
                    &quot;This saved us 20+ hours per role and the quality is amazing.&quot;
                  </p>
                  <p className="text-blue-700">— Sarah, People Ops</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}