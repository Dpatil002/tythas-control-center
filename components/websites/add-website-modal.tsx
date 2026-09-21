'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  ArrowRight,
  Layers,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShell } from '@/components/shell/context';

type Step = 1 | 2 | 3 | 4 | 5;

interface ClientOption {
  id: string;
  name: string;
}

export const AddWebsiteModal: React.FC = () => {
  const router = useRouter();
  const { isAddWebsiteOpen, setAddWebsiteOpen, refreshWebsites, setActiveWebsite } = useShell();

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1 Form Data
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [websiteName, setWebsiteName] = useState('');
  const [websiteDomain, setWebsiteDomain] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Created website & analysis references
  const [createdWebsiteId, setCreatedWebsiteId] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [progressStage, setProgressStage] = useState<string>('initializing');
  const [progressLabel, setProgressLabel] = useState<string>('Initializing analysis...');
  const [pagesCrawled, setPagesCrawled] = useState(0);
  const [pagesTotal, setPagesTotal] = useState(0);

  // Step 4 Verification State
  const [verificationMethod, setVerificationMethod] = useState<'DNS_TXT' | 'FILE_UPLOAD' | 'META_TAG'>('DNS_TXT');
  const [verificationData, setVerificationData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load clients on modal open
  useEffect(() => {
    if (isAddWebsiteOpen) {
      setStep(1);
      setFormError(null);
      setVerificationError(null);
      setAnalysisData(null);
      fetch('/api/clients')
        .then((res) => res.json())
        .then((res) => {
          if (res.data?.clients) {
            setClients(res.data.clients);
            if (res.data.clients.length > 0) {
              setSelectedClientId(res.data.clients[0].id);
              setIsCreatingClient(false);
            } else {
              setIsCreatingClient(true);
            }
          }
        })
        .catch(console.error);
    }
  }, [isAddWebsiteOpen]);

  // Polling for Step 2 Analysis
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && createdWebsiteId) {
      const poll = async () => {
        try {
          const res = await fetch(`/api/websites/${createdWebsiteId}/analysis/latest`);
          if (res.ok) {
            const data = await res.json();
            const analysis = data.data?.analysis;
            if (analysis) {
              setAnalysisData(analysis);
              if (analysis.progress) {
                setProgressStage(analysis.progress.stage);
                setProgressLabel(analysis.progress.stageLabel);
                setPagesCrawled(analysis.progress.pagesCrawled || 0);
                setPagesTotal(analysis.progress.pagesTotal || 0);
              }

              if (analysis.status === 'COMPLETE') {
                setStep(3);
                return;
              } else if (analysis.status === 'FAILED') {
                setFormError(analysis.errorMessage || 'Analysis failed. Please check the domain.');
                setStep(1);
                return;
              }
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
        timer = setTimeout(poll, 1500);
      };

      timer = setTimeout(poll, 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [step, createdWebsiteId]);

  // Step 1: Submit URL & Start Analysis
  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      let finalClientId = selectedClientId;

      if (isCreatingClient) {
        if (!newClientName.trim()) {
          setFormError('Please enter a client name.');
          setIsSubmitting(false);
          return;
        }
        const clientRes = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newClientName }),
        });
        const clientData = await clientRes.json();
        if (!clientRes.ok) {
          throw new Error(clientData.error?.message || 'Failed to create client');
        }
        finalClientId = clientData.data.client.id;
      }

      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: finalClientId,
          name: websiteName,
          domain: websiteDomain,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create website');
      }

      setCreatedWebsiteId(data.data.website.id);
      setStep(2);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred starting website analysis');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3 -> Step 4: Advance to Verification & Request Token
  const handleProceedToVerification = async () => {
    if (!createdWebsiteId) return;
    setVerificationError(null);
    setIsVerifying(true);

    try {
      const res = await fetch(`/api/websites/${createdWebsiteId}/verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: verificationMethod }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to initiate verification');
      }

      setVerificationData(data.data.verification);
      setStep(4);
    } catch (err: any) {
      setVerificationError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Change Verification Method
  const handleMethodChange = async (method: 'DNS_TXT' | 'FILE_UPLOAD' | 'META_TAG') => {
    setVerificationMethod(method);
    if (!createdWebsiteId) return;
    setIsVerifying(true);
    setVerificationError(null);

    try {
      const res = await fetch(`/api/websites/${createdWebsiteId}/verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const data = await res.json();
      if (res.ok) {
        setVerificationData(data.data.verification);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 4: Execute Verification Check
  const handleRunVerificationCheck = async () => {
    if (!createdWebsiteId || !verificationData?.id) return;
    setIsVerifying(true);
    setVerificationError(null);

    try {
      const res = await fetch(
        `/api/websites/${createdWebsiteId}/verification/${verificationData.id}/check`,
        {
          method: 'POST',
        }
      );
      const data = await res.json();
      if (data.data?.verified) {
        await refreshWebsites();
        setStep(5);
      } else {
        setVerificationError(
          data.data?.reason ||
            'Verification check failed. Please double check that the record or tag is active.'
        );
      }
    } catch (err: any) {
      setVerificationError(err.message || 'Verification check timed out or failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopySnippet = () => {
    if (verificationData?.snippet) {
      navigator.clipboard.writeText(verificationData.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinish = async () => {
    const list = await refreshWebsites();
    if (createdWebsiteId) {
      const matching = list.find((s) => s.id === createdWebsiteId);
      if (matching) setActiveWebsite(matching);
    }
    setAddWebsiteOpen(false);
    router.push('/dashboard');
  };

  const handleViewAnalysis = async () => {
    const list = await refreshWebsites();
    if (createdWebsiteId) {
      const matching = list.find((s) => s.id === createdWebsiteId);
      if (matching) setActiveWebsite(matching);
      setAddWebsiteOpen(false);
      router.push(`/websites/${createdWebsiteId}/analysis`);
    } else {
      setAddWebsiteOpen(false);
      router.push('/analysis');
    }
  };

  return (
    <Modal
      isOpen={isAddWebsiteOpen}
      onClose={() => setAddWebsiteOpen(false)}
      title={
        step === 1
          ? 'Add Website — Step 1: Enter URL'
          : step === 2
          ? 'Analyzing Website...'
          : step === 3
          ? 'Analysis Snapshot Results'
          : step === 4
          ? 'Verify Website Ownership'
          : 'Website Connected'
      }
      description={
        step === 1
          ? 'Enter a website domain to crawl its public structure and initiate setup.'
          : step === 2
          ? 'Performing non-destructive public audit of pages, sitemaps, and SSL.'
          : step === 3
          ? 'Review detected technical structure, platform badges, and crawl stats.'
          : step === 4
          ? 'Verify domain control to unlock dashboard management and connector features.'
          : 'Your website has been verified and registered in Tythas Control Center.'
      }
    >
      {/* STEP 1: Enter URL & Client Form */}
      {step === 1 && (
        <form onSubmit={handleStartAnalysis} className="space-y-4">
          {formError && (
            <div className="p-3 bg-critical-soft text-critical-text text-xs rounded-md border border-critical-soft">
              {formError}
            </div>
          )}

          {!isCreatingClient && clients.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Client
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(true)}
                  className="text-xs text-accent hover:underline"
                >
                  + New Client
                </button>
              </div>
              <Select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  New Client Name
                </label>
                {clients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingClient(false)}
                    className="text-xs text-text-tertiary hover:underline"
                  >
                    Select existing
                  </button>
                )}
              </div>
              <Input
                placeholder="e.g. Apex Health Group"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                required
              />
            </div>
          )}

          <Input
            label="Website Name"
            placeholder="e.g. Apex Health Main Portal"
            value={websiteName}
            onChange={(e) => setWebsiteName(e.target.value)}
            required
          />

          <Input
            label="Website Domain or URL"
            placeholder="e.g. apexhealth.example"
            value={websiteDomain}
            onChange={(e) => setWebsiteDomain(e.target.value)}
            hint="Enter root domain or full URL (e.g. https://apexhealth.example)"
            required
          />

          <div className="p-3 bg-surface-2/60 border border-border rounded-md text-xs text-text-secondary space-y-1">
            <div className="font-semibold text-text-primary flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              Non-destructive, polite crawl
            </div>
            <p className="text-text-tertiary">
              Tythas respects robots.txt, limits concurrency, and never mutates site data.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAddWebsiteOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Analyze Website
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </form>
      )}

      {/* STEP 2: Analyzing Live Progress Checklist */}
      {step === 2 && (
        <div className="py-4 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-text-primary font-display flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                {progressLabel}
              </span>
              <span className="font-mono text-text-tertiary">
                {pagesTotal > 0 ? `${pagesCrawled} / ${pagesTotal} pages` : 'Scanning'}
              </span>
            </div>
            <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{
                  width: `${
                    progressStage === 'complete'
                      ? 100
                      : progressStage === 'running_audits'
                      ? 90
                      : progressStage === 'crawling_pages'
                      ? Math.min(85, Math.max(25, (pagesCrawled / (pagesTotal || 1)) * 80))
                      : progressStage === 'discovering_sitemaps'
                      ? 20
                      : progressStage === 'fetching_robots'
                      ? 10
                      : 5
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Staged Checklist */}
          <div className="bg-surface border border-border rounded-lg p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck
                  className={`w-4 h-4 ${
                    ['discovering_sitemaps', 'crawling_pages', 'running_audits', 'complete'].includes(
                      progressStage
                    )
                      ? 'text-success'
                      : 'text-text-tertiary'
                  }`}
                />
                <span
                  className={
                    ['discovering_sitemaps', 'crawling_pages', 'running_audits', 'complete'].includes(
                      progressStage
                    )
                      ? 'text-text-primary font-medium'
                      : 'text-text-tertiary'
                  }
                >
                  DNS & TLS/SSL security verification
                </span>
              </div>
              {['discovering_sitemaps', 'crawling_pages', 'running_audits', 'complete'].includes(
                progressStage
              ) && <Check className="w-3.5 h-3.5 text-success" />}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText
                  className={`w-4 h-4 ${
                    ['crawling_pages', 'running_audits', 'complete'].includes(progressStage)
                      ? 'text-success'
                      : 'text-text-tertiary'
                  }`}
                />
                <span
                  className={
                    ['crawling_pages', 'running_audits', 'complete'].includes(progressStage)
                      ? 'text-text-primary font-medium'
                      : 'text-text-tertiary'
                  }
                >
                  Robots.txt & XML sitemap parsing
                </span>
              </div>
              {['crawling_pages', 'running_audits', 'complete'].includes(progressStage) && (
                <Check className="w-3.5 h-3.5 text-success" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Search
                  className={`w-4 h-4 ${
                    ['running_audits', 'complete'].includes(progressStage)
                      ? 'text-success'
                      : progressStage === 'crawling_pages'
                      ? 'text-accent animate-pulse'
                      : 'text-text-tertiary'
                  }`}
                />
                <span
                  className={
                    ['running_audits', 'complete'].includes(progressStage)
                      ? 'text-text-primary font-medium'
                      : progressStage === 'crawling_pages'
                      ? 'text-accent font-medium'
                      : 'text-text-tertiary'
                  }
                >
                  Public page spider & DOM parsing
                </span>
              </div>
              {['running_audits', 'complete'].includes(progressStage) ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : progressStage === 'crawling_pages' ? (
                <span className="text-[11px] font-mono text-accent">crawling...</span>
              ) : null}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers
                  className={`w-4 h-4 ${
                    progressStage === 'complete'
                      ? 'text-success'
                      : progressStage === 'running_audits'
                      ? 'text-accent animate-pulse'
                      : 'text-text-tertiary'
                  }`}
                />
                <span
                  className={
                    progressStage === 'complete'
                      ? 'text-text-primary font-medium'
                      : progressStage === 'running_audits'
                      ? 'text-accent font-medium'
                      : 'text-text-tertiary'
                  }
                >
                  Technical, performance, and SEO checks
                </span>
              </div>
              {progressStage === 'complete' && <Check className="w-3.5 h-3.5 text-success" />}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Results Summary & Platform Badges */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-2/60 border border-border rounded-lg p-3 text-center">
              <div className="text-xl font-bold font-display text-text-primary">
                {analysisData?.counts?.pages || 0}
              </div>
              <div className="text-[11px] text-text-tertiary font-medium">Pages Found</div>
            </div>
            <div className="bg-surface-2/60 border border-border rounded-lg p-3 text-center">
              <div className="text-xl font-bold font-display text-text-primary">
                {analysisData?.counts?.indexable || 0}
              </div>
              <div className="text-[11px] text-text-tertiary font-medium">Indexable</div>
            </div>
            <div className="bg-surface-2/60 border border-border rounded-lg p-3 text-center">
              <div className="text-xl font-bold font-display text-text-primary">
                {analysisData?.counts?.totalIssues || 0}
              </div>
              <div className="text-[11px] text-text-tertiary font-medium">Discovered Issues</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-3.5 space-y-2.5">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Detected Platform & Signals
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded bg-surface-2 border border-border font-medium text-text-primary flex items-center gap-1.5">
                <span className="text-text-tertiary">CMS:</span>
                <span className="font-semibold text-accent">
                  {analysisData?.detectedCms || 'Custom'}
                </span>
              </span>

              {analysisData?.detectedBuilder && (
                <span className="px-2.5 py-1 rounded bg-surface-2 border border-border font-medium text-text-primary flex items-center gap-1.5">
                  <span className="text-text-tertiary">Builder:</span>
                  <span>{analysisData.detectedBuilder}</span>
                </span>
              )}

              <span
                className={`px-2.5 py-1 rounded border font-medium flex items-center gap-1.5 ${
                  analysisData?.sslValid
                    ? 'bg-success-soft text-success-text border-success-soft'
                    : 'bg-critical-soft text-critical-text border-critical-soft'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                SSL: {analysisData?.sslValid ? 'Valid' : 'Invalid'}
              </span>

              <span
                className={`px-2.5 py-1 rounded border font-medium flex items-center gap-1.5 ${
                  analysisData?.sitemapFound
                    ? 'bg-success-soft text-success-text border-success-soft'
                    : 'bg-warning-soft text-warning-text border-warning-soft'
                }`}
              >
                Sitemap: {analysisData?.sitemapFound ? 'Found' : 'Missing'}
              </span>

              <span
                className={`px-2.5 py-1 rounded border font-medium flex items-center gap-1.5 ${
                  analysisData?.robotsFound
                    ? 'bg-success-soft text-success-text border-success-soft'
                    : 'bg-warning-soft text-warning-text border-warning-soft'
                }`}
              >
                Robots.txt: {analysisData?.robotsFound ? 'Found' : 'Missing'}
              </span>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-text-secondary uppercase tracking-wider">
                Auditing Summary
              </span>
              <span className="text-text-tertiary">
                {analysisData?.counts?.critical || 0} critical ·{' '}
                {analysisData?.counts?.attention || 0} attention
              </span>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {analysisData?.issues?.slice(0, 4).map((iss: any) => (
                <div
                  key={iss.id}
                  className="flex items-center justify-between p-1.5 rounded bg-surface-2/40 text-[11px]"
                >
                  <span className="text-text-primary font-medium truncate pr-2">
                    {iss.title}
                  </span>
                  <Badge variant={iss.severity} size="sm">
                    {iss.detail}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-surface-2 text-xs text-text-tertiary rounded-md border border-border">
            <p>
              Snapshot data from public crawl. Website is currently in{' '}
              <strong className="text-text-secondary">Audit Only</strong> mode. Verifying ownership
              unlocks full management.
            </p>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={handleProceedToVerification} isLoading={isVerifying}>
              Proceed to Verify Ownership
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Verify Ownership */}
      {step === 4 && (
        <div className="space-y-4">
          {verificationError && (
            <div className="p-3 bg-critical-soft text-critical-text text-xs rounded-md border border-critical-soft flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>{verificationError}</div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleMethodChange('DNS_TXT')}
              className={`p-3 rounded-lg border text-left transition-colors ${
                verificationMethod === 'DNS_TXT'
                  ? 'border-accent bg-accent-soft text-text-primary ring-1 ring-accent'
                  : 'border-border bg-surface hover:bg-surface-2 text-text-secondary'
              }`}
            >
              <div className="font-semibold text-xs font-display text-text-primary flex items-center justify-between">
                DNS TXT
                {verificationMethod === 'DNS_TXT' && <Check className="w-3.5 h-3.5 text-accent" />}
              </div>
              <p className="text-[10px] text-text-tertiary mt-1">Recommended</p>
            </button>

            <button
              type="button"
              onClick={() => handleMethodChange('FILE_UPLOAD')}
              className={`p-3 rounded-lg border text-left transition-colors ${
                verificationMethod === 'FILE_UPLOAD'
                  ? 'border-accent bg-accent-soft text-text-primary ring-1 ring-accent'
                  : 'border-border bg-surface hover:bg-surface-2 text-text-secondary'
              }`}
            >
              <div className="font-semibold text-xs font-display text-text-primary flex items-center justify-between">
                File Upload
                {verificationMethod === 'FILE_UPLOAD' && (
                  <Check className="w-3.5 h-3.5 text-accent" />
                )}
              </div>
              <p className="text-[10px] text-text-tertiary mt-1">Upload .txt file</p>
            </button>

            <button
              type="button"
              onClick={() => handleMethodChange('META_TAG')}
              className={`p-3 rounded-lg border text-left transition-colors ${
                verificationMethod === 'META_TAG'
                  ? 'border-accent bg-accent-soft text-text-primary ring-1 ring-accent'
                  : 'border-border bg-surface hover:bg-surface-2 text-text-secondary'
              }`}
            >
              <div className="font-semibold text-xs font-display text-text-primary flex items-center justify-between">
                Meta Tag
                {verificationMethod === 'META_TAG' && (
                  <Check className="w-3.5 h-3.5 text-accent" />
                )}
              </div>
              <p className="text-[10px] text-text-tertiary mt-1">&lt;head&gt; tag</p>
            </button>
          </div>

          <div className="bg-surface border border-border rounded-lg p-4 space-y-3 text-xs">
            <p className="text-text-secondary">{verificationData?.instructions}</p>

            <div className="relative">
              <pre className="p-3 bg-surface-2 rounded-md font-mono text-[11px] text-text-primary overflow-x-auto border border-border">
                <code>{verificationData?.snippet}</code>
              </pre>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="absolute right-2 top-2 p-1.5 rounded bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors flex items-center gap-1 text-[10px]"
                title="Copy to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-success" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button onClick={handleRunVerificationCheck} isLoading={isVerifying}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isVerifying ? 'animate-spin' : ''}`} />
              Verify Ownership
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Connected / Audit Only Confirmation */}
      {step === 5 && (
        <div className="py-4 space-y-5 text-center">
          <div className="w-12 h-12 bg-success-soft text-success rounded-full flex items-center justify-center mx-auto border border-success-soft">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold font-display text-text-primary">
              Website Ownership Verified!
            </h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Website added. Editing pages, SEO and forms unlocks as soon as the connector finishes
              its first sync (Phase 3).
            </p>
          </div>

          <div className="bg-surface border border-border rounded-lg p-3.5 text-xs text-left space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-border">
              <span className="text-text-tertiary">Domain</span>
              <span className="font-mono font-medium text-text-primary">
                {websiteDomain.replace(/^https?:\/\//i, '')}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border">
              <span className="text-text-tertiary">Status</span>
              <Badge variant="AUDIT_ONLY" size="sm" showDot>
                Audit Only
              </Badge>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-text-tertiary">Platform</span>
              <span className="font-medium text-text-primary">
                {analysisData?.detectedCms || 'Custom'}
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="secondary" onClick={handleViewAnalysis}>
              View Website Analysis
            </Button>
            <Button onClick={handleFinish}>
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
