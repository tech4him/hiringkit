"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  FileText, 
  Users, 
  ShieldCheck,
  Download,
  MessageSquare,
  Target,
  Award,
  Globe
} from "lucide-react";
import { useState, useEffect } from "react";

export default function Home() {
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [roleInput, setRoleInput] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      setShowStickyBar(scrollPercent > 0.3);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roleInput.trim()) {
      window.location.href = `/kit?role=${encodeURIComponent(roleInput.trim())}`;
    }
  };

  return (
    <div className="min-h-screen font-inter">
      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="mx-auto max-w-content px-6 py-4 flex items-center justify-between">
          <div className="font-outfit font-semibold text-xl text-ink">
            Hiring Kit
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="hidden lg:inline-flex text-gray-600 hover:text-ink">
              How it works
            </Button>
            <Button variant="ghost" size="sm" className="hidden lg:inline-flex text-gray-600 hover:text-ink">
              Examples
            </Button>
            <Button variant="ghost" size="sm" className="hidden lg:inline-flex text-gray-600 hover:text-ink">
              Support
            </Button>
            <Button className="inline-flex items-center rounded-2xl bg-[#1F4B99] px-5 py-3 text-white shadow hover:brightness-110 focus-visible:ring-2 ring-offset-2">
              Start Free Preview
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white pt-16 pb-24">
        <div className="mx-auto max-w-content px-6 text-center">
          
          <h1 className="text-4xl md:text-6xl font-outfit font-semibold tracking-tight mb-6 text-ink leading-[1.05]">
            Turn any role into a complete hiring kit in minutes
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-text mx-auto leading-relaxed">
            Scorecards, job posts, interview questions with rubrics, and a 1-hour work sample—tailored to your role and ready to use.
          </p>
          
          {/* Primary CTA Block */}
          <form onSubmit={handlePreviewSubmit} className="max-w-2xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input 
                type="text" 
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                placeholder="e.g., Program Manager, Youth Pastor, Office Admin"
                aria-label="Enter role title"
                className="flex-1 rounded-2xl border border-slate-300 px-4 h-14 text-base focus:border-primary focus-visible:ring-2 ring-offset-2"
              />
              <Button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-[#1F4B99] px-8 h-14 text-white font-semibold shadow hover:brightness-110 focus-visible:ring-2 ring-offset-2 whitespace-nowrap">
                Generate Free Preview
              </Button>
            </div>
            
            {/* Microcopy */}
            <p className="text-sm text-gray-500 mt-4">
              No signup required · See page-1 previews · Bias-aware language
            </p>
          </form>

          {/* Trust Row */}
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 text-sm">
            <div className="text-gray-600">
              Trusted by growing teams
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span className="text-gray-900">Money-back guarantee</span>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y bg-gray-50 py-16">
        <div className="mx-auto max-w-content px-6">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium flex-shrink-0">
                S
              </div>
              <div>
                <p className="text-sm font-medium text-ink mb-1">&quot;Saved us 20+ hours per role and the quality is amazing&quot;</p>
                <p className="text-xs text-gray-600">Sarah — People Ops</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium flex-shrink-0">
                D
              </div>
              <div>
                <p className="text-sm font-medium text-ink mb-1">&quot;Much more structured than our old process&quot;</p>
                <p className="text-xs text-gray-600">David — Founder</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium flex-shrink-0">
                M
              </div>
              <div>
                <p className="text-sm font-medium text-ink mb-1">&quot;Love the bias-reduction features&quot;</p>
                <p className="text-xs text-gray-600">Maria — HR Director</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-content px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-outfit font-semibold mb-4 text-ink">
              What You Get
            </h2>
            <p className="text-lg text-gray-600 max-w-text mx-auto">
              Each kit includes 9 professional documents that create a complete, bias-aware hiring process
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
              <Target className="h-6 w-6 text-[#1F4B99] mb-3" />
              <h3 className="font-semibold text-ink mb-2">Role Scorecard</h3>
              <p className="text-sm text-gray-600">Mission, outcomes, competencies, and 90/180/365 metrics.</p>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
              <Globe className="h-6 w-6 text-[#1F4B99] mb-3" />
              <h3 className="font-semibold text-ink mb-2">Job Post</h3>
              <p className="text-sm text-gray-600">Clear, bias-aware description with requirements.</p>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
              <MessageSquare className="h-6 w-6 text-[#1F4B99] mb-3" />
              <h3 className="font-semibold text-ink mb-2">3-Stage Interview Pack</h3>
              <p className="text-sm text-gray-600">Screening, deep-dive, culture—each with a scored rubric.</p>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
              <Award className="h-6 w-6 text-[#1F4B99] mb-3" />
              <h3 className="font-semibold text-ink mb-2">Work Sample</h3>
              <p className="text-sm text-gray-600">1-hour scenario with a scoring guide.</p>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
              <Users className="h-6 w-6 text-[#1F4B99] mb-3" />
              <h3 className="font-semibold text-ink mb-2">Reference Check Script</h3>
              <p className="text-sm text-gray-600">Structured questions for meaningful insights.</p>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
              <ShieldCheck className="h-6 w-6 text-[#1F4B99] mb-3" />
              <h3 className="font-semibold text-ink mb-2">EEO Guidelines</h3>
              <p className="text-sm text-gray-600">Bias-reduction checklist & guardrails.</p>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
              <FileText className="h-6 w-6 text-[#1F4B99] mb-3" />
              <h3 className="font-semibold text-ink mb-2">Process Map</h3>
              <p className="text-sm text-gray-600">Timeline & steps for a complete workflow.</p>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
              <CheckCircle className="h-6 w-6 text-[#1F4B99] mb-3" />
              <h3 className="font-semibold text-ink mb-2">Cover & Quick Start</h3>
              <p className="text-sm text-gray-600">Professional cover + implementation tips.</p>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition">
              <Download className="h-6 w-6 text-[#1F4B99] mb-3" />
              <h3 className="font-semibold text-ink mb-2">Export Options</h3>
              <p className="text-sm text-gray-600">Combined PDF or ZIP by document.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-content px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-outfit font-semibold mb-4 text-ink">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Three simple steps to your complete hiring kit
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
            <div className="flex-1 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1F4B99] text-white font-semibold text-lg mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3 text-ink">Enter role basics</h3>
              <p className="text-gray-600">
                Title + 1–2 mission lines. We pre-fill the rest.
              </p>
            </div>
            
            <div className="flex-1 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1F4B99] text-white font-semibold text-lg mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3 text-ink">Preview & edit</h3>
              <p className="text-gray-600">
                See page-1 previews instantly. Fine-tune any text.
              </p>
            </div>
            
            <div className="flex-1 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1F4B99] text-white font-semibold text-lg mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3 text-ink">Download & use</h3>
              <p className="text-gray-600">
                Unlock pro PDFs (combined or ZIP) and start interviewing today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gated Preview Examples */}
      <section className="py-20 bg-white" onContextMenu={(e) => e.preventDefault()}>
        <div className="mx-auto max-w-content px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-outfit font-semibold mb-4 text-ink">
              Preview Examples
            </h2>
            <p className="text-lg text-gray-600">
              Real samples from generated hiring kits
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="relative select-none">
              <div className="rounded-2xl border border-slate-200 bg-white h-80 relative overflow-hidden">
                <div className="absolute inset-0 p-6">
                  <div className="text-lg font-semibold text-ink mb-4">Role Scorecard — Marketing Manager</div>
                  <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                    <div>
                      <strong>Mission:</strong> Drive brand awareness and lead generation through integrated marketing campaigns across digital and traditional channels...
                    </div>
                    <div>
                      <strong>Key Outcomes (90 days):</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                        <li>Develop comprehensive marketing strategy...</li>
                        <li>Launch 3 digital campaigns with 15% CTR...</li>
                        <li>Increase qualified lead pipeline by 25%...</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Core Competencies:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                        <li>Digital marketing expertise (SEO, SEM, social)...</li>
                        <li>Analytics and performance measurement...</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/95 px-6 py-3 rounded-lg border-2 border-gray-300 rotate-12 font-bold text-gray-700 shadow-lg">
                    PREVIEW
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">Role Scorecard — sample preview</p>
            </div>
            
            <div className="relative select-none">
              <div className="rounded-2xl border border-slate-200 bg-white h-80 relative overflow-hidden">
                <div className="absolute inset-0 p-6">
                  <div className="text-lg font-semibold text-ink mb-4">Interview Pack — Stage 1 (Screening)</div>
                  <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                    <div>
                      <strong>1. Campaign Experience</strong><br/>
                      Walk me through your most successful marketing campaign. What metrics did you use to measure success?
                    </div>
                    <div>
                      <strong>Scoring Rubric:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                        <li><strong>4 - Exceeds:</strong> Detailed campaign with clear ROI...</li>
                        <li><strong>3 - Meets:</strong> Good campaign example with metrics...</li>
                        <li><strong>2 - Partial:</strong> Campaign mentioned but unclear...</li>
                      </ul>
                    </div>
                    <div>
                      <strong>2. Digital Channels</strong><br/>
                      Which digital marketing channels have you found most effective for B2B lead generation?
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/95 px-6 py-3 rounded-lg border-2 border-gray-300 rotate-12 font-bold text-gray-700 shadow-lg">
                    PREVIEW
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">Interview Pack — sample preview</p>
            </div>

            <div className="relative select-none">
              <div className="rounded-2xl border border-slate-200 bg-white h-80 relative overflow-hidden">
                <div className="absolute inset-0 p-6">
                  <div className="text-lg font-semibold text-ink mb-4">Job Post — Marketing Manager</div>
                  <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                    <div>
                      <strong>About the Role:</strong><br/>
                      We&apos;re seeking a data-driven Marketing Manager to join our growing team and lead our brand awareness and lead generation efforts...
                    </div>
                    <div>
                      <strong>What You&apos;ll Do:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                        <li>Develop and execute integrated marketing campaigns...</li>
                        <li>Manage marketing budget and optimize spend across channels...</li>
                        <li>Collaborate with sales team to improve lead quality...</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Requirements:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                        <li>3+ years of marketing experience, preferably B2B...</li>
                        <li>Strong analytical skills and experience with marketing automation...</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/95 px-6 py-3 rounded-lg border-2 border-gray-300 rotate-12 font-bold text-gray-700 shadow-lg">
                    PREVIEW
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">Job Post — sample preview</p>
            </div>

            <div className="relative select-none">
              <div className="rounded-2xl border border-slate-200 bg-white h-80 relative overflow-hidden">
                <div className="absolute inset-0 p-6">
                  <div className="text-lg font-semibold text-ink mb-4">Work Sample — Campaign Planning</div>
                  <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                    <div>
                      <strong>Scenario (1 hour):</strong><br/>
                      You&apos;re launching a new product feature for our project management software. Budget: $15K monthly. Target: small business owners...
                    </div>
                    <div>
                      <strong>Your Task:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                        <li>Create a 3-month campaign strategy with channel mix...</li>
                        <li>Outline key messaging and target personas...</li>
                        <li>Suggest 5 specific tactics with budget allocation...</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Evaluation Criteria:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                        <li>Strategic thinking and budget prioritization...</li>
                        <li>Understanding of small business customer journey...</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/95 px-6 py-3 rounded-lg border-2 border-gray-300 rotate-12 font-bold text-gray-700 shadow-lg">
                    PREVIEW
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">Work Sample — sample preview</p>
            </div>
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-8">
            Truncated & watermarked. Full content unlocks after purchase.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-content px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-outfit font-semibold mb-4 text-ink">
              Simple Pricing
            </h2>
            <p className="text-lg text-gray-600">
              Pay per kit. No subscriptions.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-ink mb-2">Solo Kit</h3>
                <div className="text-3xl font-bold text-[#1F4B99] mb-1">$49</div>
                <p className="text-sm text-gray-600">per complete kit</p>
              </div>
              
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-[#39B3A6] mt-0.5 flex-shrink-0" />
                  <span>Complete 9-doc kit</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-[#39B3A6] mt-0.5 flex-shrink-0" />
                  <span>Express pre-fill</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-[#39B3A6] mt-0.5 flex-shrink-0" />
                  <span>PDF export included</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-[#39B3A6] mt-0.5 flex-shrink-0" />
                  <span>Money-back guarantee</span>
                </li>
              </ul>
              
              <Button className="w-full rounded-2xl bg-[#1F4B99] text-white hover:brightness-110 py-3">
                Start Free Preview
              </Button>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-ink mb-2">Pro Kit + Review</h3>
                <div className="text-3xl font-bold text-[#1F4B99] mb-1">$129</div>
                <p className="text-sm text-gray-600">per reviewed kit</p>
              </div>
              
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-[#39B3A6] mt-0.5 flex-shrink-0" />
                  <span>Everything in Solo</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-[#39B3A6] mt-0.5 flex-shrink-0" />
                  <span><strong>Human expert review</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-[#39B3A6] mt-0.5 flex-shrink-0" />
                  <span>Style & tone optimization</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-[#39B3A6] mt-0.5 flex-shrink-0" />
                  <span>Delivery in 4 business hours</span>
                </li>
              </ul>
              
              <Button className="w-full rounded-2xl bg-[#1F4B99] text-white hover:brightness-110 py-3">
                Start Free Preview
              </Button>
            </div>
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-8">
            Try before you buy — No credit card for preview — Cancel anytime
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-[#1F4B99] text-white">
        <div className="mx-auto max-w-content px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-outfit font-semibold mb-4">
            Ready to build your kit?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-text mx-auto">
            See your complete kit in minutes. Pay only when you&apos;re happy.
          </p>
          
          <form onSubmit={handlePreviewSubmit} className="max-w-2xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input 
                type="text" 
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                placeholder="Enter any role title to start..."
                aria-label="Enter role title for final CTA"
                className="flex-1 px-4 h-14 text-base bg-white text-gray-900 border-0 rounded-2xl"
              />
              <Button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-white text-[#1F4B99] px-8 h-14 font-semibold shadow hover:bg-gray-50 whitespace-nowrap">
                Generate Free Preview
              </Button>
            </div>
          </form>
          
          <p className="text-sm opacity-75">
            No signup required • Preview is completely free • Pay only when you&apos;re happy
          </p>
        </div>
      </section>

      {/* Sticky CTA - Desktop */}
      <div className={`hidden lg:block fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-40 transition-transform duration-300 ${showStickyBar ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="mx-auto max-w-content px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">Get your hiring kit in minutes</span>
          <form onSubmit={handlePreviewSubmit} className="flex items-center gap-3">
            <Input 
              type="text" 
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              placeholder="Enter role title..."
              aria-label="Enter role title for sticky CTA"
              className="w-64 h-10 text-sm border border-gray-200 rounded-xl"
            />
            <Button type="submit" className="inline-flex items-center rounded-xl bg-[#1F4B99] px-4 py-2 text-sm text-white hover:brightness-110 focus-visible:ring-2 ring-offset-2">
              Generate Free Preview
            </Button>
          </form>
        </div>
      </div>

      {/* Sticky CTA - Mobile */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40 p-4 transition-transform duration-300 ${showStickyBar ? 'translate-y-0' : 'translate-y-full'}`}>
        <Button onClick={() => handlePreviewSubmit({ preventDefault: () => {} } as React.FormEvent)} className="w-full rounded-2xl bg-[#1F4B99] py-4 text-white font-semibold hover:brightness-110 focus-visible:ring-2 ring-offset-2">
          Generate Free Preview
        </Button>
      </div>

      {/* Footer */}
      <footer className="border-t py-12 bg-white">
        <div className="mx-auto max-w-content px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="font-outfit font-semibold text-xl text-ink">
              Hiring Kit
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-600">
              <a href="#" className="hover:text-ink transition">How it works</a>
              <a href="#" className="hover:text-ink transition">Examples</a>
              <a href="#" className="hover:text-ink transition">Support</a>
              <a href="#" className="hover:text-ink transition">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
