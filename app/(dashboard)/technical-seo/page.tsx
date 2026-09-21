'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/components/shell/context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Cpu,
  Globe,
  FileCode,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Shield,
  Layers,
  Code2,
  Sliders,
  Check,
  X,
  Clock
} from 'lucide-react';

export default function TechnicalSeoPage() {
  const { activeWebsite, setAddWebsiteOpen } = useShell();

  const [activeTab, setActiveTab] = useState<'sitemap' | 'robots' | 'llms'>('sitemap');

  // Sitemap state
  const [sitemapLoading, setSitemapLoading] = useState(true);
  const [sitemapData, setSitemapData] = useState<any>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [sitemapSuccess, setSitemapSuccess] = useState<string | null>(null);

  // Robots.txt state
  const [robotsLoading, setRobotsLoading] = useState(true);
  const [robotsFile, setRobotsFile] = useState<any>(null);
  const [robotsMode, setRobotsMode] = useState<'safe' | 'advanced'>('safe');
  const [robotsContent, setRobotsContent] = useState('');
  const [initialRobotsContent, setInitialRobotsContent] = useState('');
  const [allowPaths, setAllowPaths] = useState<string[]>(['/']);
  const [disallowPaths, setDisallowPaths] = useState<string[]>(['/wp-admin/', '/api/']);
  const [crawlDelay, setCrawlDelay] = useState<string>('');
  const [savingRobots, setSavingRobots] = useState(false);
  const [applyingRobots, setApplyingRobots] = useState(false);
  const [robotsSuccess, setRobotsSuccess] = useState<string | null>(null);
  const [showDiffModal, setShowDiffModal] = useState(false);

  // llms.txt state
  const [llmsLoading, setLlmsLoading] = useState(true);
  const [llmsContent, setLlmsContent] = useState('');
  const [savingLlms, setSavingLlms] = useState(false);
  const [llmsSuccess, setLlmsSuccess] = useState<string | null>(null);

  // Load Sitemap data
  const loadSitemap = async () => {
    if (!activeWebsite) return;
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/sitemap`);
      if (res.ok) {
        const json = await res.json();
        setSitemapData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSitemapLoading(false);
    }
  };

  // Load Robots.txt
  const loadRobots = async () => {
    if (!activeWebsite) return;
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/technical-files/robots_txt`);
      if (res.ok) {
        const json = await res.json();
        const f = json.data?.file;
        setRobotsFile(f);
        setRobotsContent(f?.content || '');
        setInitialRobotsContent(f?.content || '');
        setRobotsMode((f?.mode as any) || 'safe');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRobotsLoading(false);
    }
  };

  // Load llms.txt
  const loadLlms = async () => {
    if (!activeWebsite) return;
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/technical-files/llms_txt`);
      if (res.ok) {
        const json = await res.json();
        setLlmsContent(json.data?.file?.content || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLlmsLoading(false);
    }
  };

  useEffect(() => {
    setSitemapLoading(true);
    setRobotsLoading(true);
    setLlmsLoading(true);
    loadSitemap();
    loadRobots();
    loadLlms();
  }, [activeWebsite?.id]);

  // Compile safe mode form to robots.txt content
  useEffect(() => {
    if (robotsMode === 'safe') {
      const rawDomain = (activeWebsite?.domain || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
      let compiled = `User-agent: *\n`;
      allowPaths.forEach((p) => {
        if (p.trim()) compiled += `Allow: ${p.trim()}\n`;
      });
      disallowPaths.forEach((p) => {
        if (p.trim()) compiled += `Disallow: ${p.trim()}\n`;
      });
      if (crawlDelay.trim()) {
        compiled += `Crawl-delay: ${crawlDelay.trim()}\n`;
      }
      compiled += `\nSitemap: https://${rawDomain}/sitemap.xml`;
      setRobotsContent(compiled);
    }
  }, [allowPaths, disallowPaths, crawlDelay, robotsMode, activeWebsite?.domain]);

  const handleRegenerateSitemap = async () => {
    if (!activeWebsite) return;
    setRegenerating(true);
    setSitemapSuccess(null);
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/sitemap/regenerate`, {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to regenerate sitemap');
      }
      setSitemapSuccess(`Sitemap generated successfully with ${json.data?.urlCount} URLs!`);
      loadSitemap();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveRobotsDraft = async () => {
    if (!activeWebsite) return;
    setSavingRobots(true);
    setRobotsSuccess(null);
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/technical-files/robots_txt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: robotsContent, mode: robotsMode })
      });
      if (res.ok) {
        setRobotsSuccess('Robots.txt draft saved.');
        loadRobots();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingRobots(false);
    }
  };

  const handleApplyRobotsConfirm = async () => {
    if (!activeWebsite) return;
    setApplyingRobots(true);
    setShowDiffModal(false);
    setRobotsSuccess(null);
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/technical-files/robots_txt/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: robotsContent, mode: robotsMode })
      });
      if (res.ok) {
        setRobotsSuccess('Robots.txt changes applied live to the website!');
        loadRobots();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setApplyingRobots(false);
    }
  };

  const handleSaveLlms = async () => {
    if (!activeWebsite) return;
    setSavingLlms(true);
    setLlmsSuccess(null);
    try {
      const res = await fetch(`/api/websites/${activeWebsite.id}/technical-files/llms_txt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: llmsContent, mode: 'safe' })
      });
      if (res.ok) {
        setLlmsSuccess('llms.txt file saved successfully.');
        loadLlms();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingLlms(false);
    }
  };

  if (!activeWebsite) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <EmptyState
          icon={<Globe className="w-6 h-6" />}
          title="No website selected"
          description="Select or connect a website to manage Technical SEO files."
          actionLabel="+ Add Website"
          onAction={() => setAddWebsiteOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-text-primary tracking-tight">
              Technical SEO
            </h1>
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-surface-hover text-text-muted border border-border">
              Crawlers & Indexing
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 font-sans">
            Manage your XML Sitemap, crawl directives (Robots.txt), and AI crawler files (llms.txt).
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        {[
          { id: 'sitemap', label: 'XML Sitemap', icon: Layers },
          { id: 'robots', label: 'Robots.txt', icon: Shield },
          { id: 'llms', label: 'llms.txt (AI Index)', icon: Sparkles }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium font-display transition-colors border-b-2 -mb-1.5 ${
                isActive
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SITEMAP */}
      {activeTab === 'sitemap' && (
        <div className="space-y-6">
          {sitemapSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{sitemapSuccess}</span>
            </div>
          )}

          {/* Status KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-surface border border-border space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
                Sitemap URLs
              </div>
              <div className="text-3xl font-bold font-display text-text-primary">
                {sitemapData?.latestRun?.urlCount ?? sitemapData?.publishedCount ?? 0}
              </div>
              <div className="text-xs text-text-muted">Published pages and posts</div>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-border space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
                Last Generated
              </div>
              <div className="text-sm font-semibold text-text-primary mt-1">
                {sitemapData?.latestRun
                  ? new Date(sitemapData.latestRun.generatedAt).toLocaleString()
                  : 'Not yet generated'}
              </div>
              <div className="text-xs text-text-muted">Automatic sync via connector</div>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-border flex flex-col justify-between">
              <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
                Live Sitemap URL
              </div>
              <a
                href={sitemapData?.sitemapUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent hover:underline flex items-center gap-1 truncate mt-1"
              >
                <span className="truncate">{sitemapData?.sitemapUrl}</span>
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
              <Button
                onClick={handleRegenerateSitemap}
                disabled={regenerating}
                size="sm"
                className="mt-3 text-xs bg-accent text-white hover:bg-accent-hover flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                <span>{regenerating ? 'Generating XML...' : 'Regenerate & Publish'}</span>
              </Button>
            </div>
          </div>

          {/* Recent Runs Table */}
          <div className="p-5 rounded-xl bg-surface border border-border space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted">
              Recent Generation Runs
            </h3>

            {sitemapData?.recentRuns?.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted bg-surface-hover/20 rounded-lg">
                No previous sitemap generation runs recorded.
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-lg border border-border/80 overflow-hidden text-xs">
                {(sitemapData?.recentRuns || []).map((run: any) => (
                  <div key={run.id} className="p-3 flex items-center justify-between hover:bg-surface-hover/30">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-semibold text-text-primary">
                          Sitemap Generated ({run.urlCount} URLs)
                        </div>
                        <div className="text-[11px] text-text-muted font-mono">
                          ID: {run.id}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-text-muted font-mono">
                      {new Date(run.generatedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ROBOTS.TXT */}
      {activeTab === 'robots' && (
        <div className="space-y-6">
          {robotsSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{robotsSuccess}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface border border-border">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Robots.txt Directive Mode</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Safe Mode offers structured controls. Advanced Mode permits raw directive editing.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-surface-hover border border-border rounded-lg">
              <button
                type="button"
                onClick={() => setRobotsMode('safe')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  robotsMode === 'safe'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Safe Mode (Guided)
              </button>
              <button
                type="button"
                onClick={() => setRobotsMode('advanced')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  robotsMode === 'advanced'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Advanced (Raw Text)
              </button>
            </div>
          </div>

          {/* Form / Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              {robotsMode === 'safe' ? (
                <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-text-primary">Allowed Paths</label>
                    {allowPaths.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={p}
                          onChange={(e) => {
                            const list = [...allowPaths];
                            list[idx] = e.target.value;
                            setAllowPaths(list);
                          }}
                          className="w-full px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-text-primary">Disallowed (Blocked) Paths</label>
                      <button
                        type="button"
                        onClick={() => setDisallowPaths([...disallowPaths, '/'])}
                        className="text-xs text-accent hover:underline font-mono"
                      >
                        + Add Path
                      </button>
                    </div>
                    {disallowPaths.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={p}
                          onChange={(e) => {
                            const list = [...disallowPaths];
                            list[idx] = e.target.value;
                            setDisallowPaths(list);
                          }}
                          className="w-full px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...disallowPaths];
                            list.splice(idx, 1);
                            setDisallowPaths(list);
                          }}
                          className="p-1 text-text-muted hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-primary">Crawl Delay (seconds, optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 5"
                      value={crawlDelay}
                      onChange={(e) => setCrawlDelay(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface-hover border border-border rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-surface border border-border space-y-3">
                  <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Warning: Incorrect directives in robots.txt can de-index your entire site from Google Search.
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    value={robotsContent}
                    onChange={(e) => setRobotsContent(e.target.value)}
                    className="w-full p-3 bg-[#18181b] border border-border rounded-lg text-xs font-mono text-emerald-400 focus:outline-none focus:border-accent resize-none leading-relaxed"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveRobotsDraft}
                  disabled={savingRobots}
                  className="text-xs"
                >
                  Save Draft
                </Button>

                <Button
                  size="sm"
                  onClick={() => setShowDiffModal(true)}
                  disabled={applyingRobots}
                  className="text-xs bg-accent text-white hover:bg-accent-hover flex items-center gap-1.5"
                >
                  <span>Apply Changes to Live Site →</span>
                </Button>
              </div>
            </div>

            {/* Compiled View (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="p-5 rounded-xl bg-surface border border-border space-y-3">
                <div className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted">
                  Compiled robots.txt Preview
                </div>
                <pre className="p-3.5 rounded-lg bg-[#0f1117] border border-border text-emerald-400 text-xs font-mono overflow-x-auto min-h-[220px] leading-relaxed">
                  <code>{robotsContent}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Diff Confirmation Modal */}
          {showDiffModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-border bg-amber-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Confirm Live Robots.txt Changes (High-Risk Action)</span>
                  </div>
                  <button onClick={() => setShowDiffModal(false)} className="text-text-muted hover:text-text-primary">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  <p className="text-text-muted">
                    You are about to push new crawling rules to the live website. Review the exact content being published:
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="font-mono text-[10px] text-text-muted uppercase">Current Live Content</div>
                      <pre className="p-3 rounded bg-surface-hover border border-border text-[11px] font-mono text-text-muted max-h-48 overflow-y-auto">
                        {initialRobotsContent || '(Empty)'}
                      </pre>
                    </div>

                    <div className="space-y-1">
                      <div className="font-mono text-[10px] text-accent uppercase">New Content to Publish</div>
                      <pre className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400 max-h-48 overflow-y-auto">
                        {robotsContent}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-border bg-surface-hover/30 flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => setShowDiffModal(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApplyRobotsConfirm}
                    disabled={applyingRobots}
                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
                  >
                    {applyingRobots ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Publishing to Connector...</span>
                      </>
                    ) : (
                      <span>Yes, Publish Robots.txt to Live Site</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LLMS.TXT */}
      {activeTab === 'llms' && (
        <div className="space-y-6">
          {llmsSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{llmsSuccess}</span>
            </div>
          )}

          <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">llms.txt AI Agent Index</h3>
              <p className="text-xs text-text-muted mt-0.5">
                The emerging standard for guiding LLM agents and AI search engines (ChatGPT Search, Perplexity, Gemini) on how to index and cite your website content.
              </p>
            </div>

            <textarea
              rows={14}
              value={llmsContent}
              onChange={(e) => setLlmsContent(e.target.value)}
              placeholder="# llms.txt format..."
              className="w-full p-4 bg-[#18181b] border border-border rounded-lg text-xs font-mono text-emerald-400 focus:outline-none focus:border-accent resize-none leading-relaxed"
            />

            <div className="flex justify-end">
              <Button
                onClick={handleSaveLlms}
                disabled={savingLlms}
                size="sm"
                className="text-xs bg-accent text-white hover:bg-accent-hover"
              >
                {savingLlms ? 'Saving...' : 'Save llms.txt'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
