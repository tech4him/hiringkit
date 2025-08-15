"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Shield, 
  Star, 
  ArrowLeft,
  Loader2,
  CreditCard,
  Lock
} from "lucide-react";

interface Kit {
  id: string;
  title: string;
  role_title: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const kitId = params.id as string;
  
  const [selectedPlan, setSelectedPlan] = useState<"solo" | "pro">("solo");
  const [isLoading, setIsLoading] = useState(false);
  const [kit, setKit] = useState<Kit | null>(null);

  useEffect(() => {
    // Load kit details for display only if we have a valid kitId
    if (kitId && kitId !== 'undefined') {
      // For now, we'll use placeholder data
      setKit({
        id: kitId,
        title: "Marketing Manager Hiring Kit",
        role_title: "Marketing Manager"
      });
    }
  }, [kitId]);

  const handleCheckout = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kit_id: kitId,
          plan_type: selectedPlan,
          success_url: `${window.location.origin}/kit/${kitId}/success`,
          cancel_url: window.location.href
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const responseData = await response.json();
      const { url } = responseData.data || responseData;
      
      console.log('Checkout response:', { responseData, url });
      
      if (!url) {
        console.error('No URL in checkout response:', responseData);
        throw new Error('No checkout URL received from server');
      }
      
      // Redirect to Stripe Checkout
      console.log('Redirecting to Stripe:', url);
      window.location.href = url;

    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
              The kit ID is missing or invalid. Please start over with a new kit.
            </p>
            <Button
              onClick={() => router.push("/kit")}
              className="w-full"
            >
              Create New Kit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Preview
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">
                Unlock Your Hiring Kit
              </h1>
              <p className="text-sm text-gray-600">
                Marketing Manager • Complete professional kit
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">Money-back guarantee</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Plan Selection */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
              <p className="text-gray-600">
                Select the option that best fits your needs. Both include the complete hiring kit.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Solo Plan */}
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedPlan === "solo" 
                    ? "ring-2 ring-[#1F4B99] border-[#1F4B99]" 
                    : "hover:shadow-md"
                }`}
                onClick={() => setSelectedPlan("solo")}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Solo Kit</CardTitle>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedPlan === "solo" 
                        ? "bg-[#1F4B99] border-[#1F4B99]" 
                        : "border-gray-300"
                    }`}>
                      {selectedPlan === "solo" && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                      )}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-[#1F4B99]">
                    $49
                    <span className="text-lg font-normal text-gray-600">/kit</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Complete 9-document hiring kit</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Professional PDF export</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Separate files ZIP option</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Editable sections</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Instant download</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Money-back guarantee</span>
                    </li>
                  </ul>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs text-gray-500">
                      Perfect for small teams and solo hiring managers
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card 
                className={`cursor-pointer transition-all relative ${
                  selectedPlan === "pro" 
                    ? "ring-2 ring-[#1F4B99] border-[#1F4B99]" 
                    : "hover:shadow-md"
                }`}
                onClick={() => setSelectedPlan("pro")}
              >
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-[#1F4B99] text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
                
                <CardHeader className="pt-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Pro Kit + Review</CardTitle>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedPlan === "pro" 
                        ? "bg-[#1F4B99] border-[#1F4B99]" 
                        : "border-gray-300"
                    }`}>
                      {selectedPlan === "pro" && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                      )}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-[#1F4B99]">
                    $129
                    <span className="text-lg font-normal text-gray-600">/kit</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Everything in Solo Kit</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Human expert review</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Style & tone optimization</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Industry-specific customization</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Delivery in 4 business hours</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs text-gray-500">
                      Best for organizations requiring polished, reviewed materials
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Features Comparison */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">What&apos;s Included in Every Kit</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Role Scorecard
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Job Post
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  3-Stage Interview Pack
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Work Sample
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Reference Script
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  EEO Guidelines
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Process Map
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Cover & Quick Start
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Export Options
                </div>
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Marketing Manager Kit</span>
                  <span className="font-medium">
                    ${selectedPlan === "solo" ? "49" : "129"}
                  </span>
                </div>
                
                {selectedPlan === "pro" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Includes human review</span>
                    <span className="text-green-600">+$80 value</span>
                  </div>
                )}
                
                <hr />
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${selectedPlan === "solo" ? "49" : "129"}</span>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={isLoading}
                  className="w-full bg-[#1F4B99] hover:brightness-110 h-12 text-base font-semibold"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Secure Checkout
                    </>
                  )}
                </Button>

                <div className="text-xs text-gray-500 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="h-3 w-3" />
                    Secure payment powered by Stripe
                  </div>
                  <div>
                    30-day money-back guarantee • No hidden fees
                  </div>
                </div>

                {selectedPlan === "pro" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm">
                      <strong>Pro Review Process:</strong>
                      <ul className="mt-1 text-xs text-gray-600 space-y-1">
                        <li>• Expert review within 4 hours</li>
                        <li>• Style and tone optimization</li>
                        <li>• Industry-specific improvements</li>
                        <li>• Final quality assurance</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}