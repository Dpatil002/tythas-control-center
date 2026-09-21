'use client';

import React from 'react';
import { Sparkles, Layers, Rocket, HelpCircle, MessageSquare, Mail, Zap, ShieldCheck, Search, ChevronDown, Check } from 'lucide-react';

interface SectionRendererProps {
  sections: Array<{
    id?: string;
    type: string;
    order: number;
    content: any;
  }>;
  previewMode?: boolean;
}

export function SectionRenderer({ sections, previewMode = false }: SectionRendererProps) {
  if (!sections || sections.length === 0) {
    return (
      <div className="p-12 text-center text-text-tertiary border-2 border-dashed border-border rounded-xl bg-surface-2/30">
        <Layers className="w-10 h-10 mx-auto mb-3 opacity-30 text-brand" />
        <p className="text-sm font-medium">No sections added to this page yet.</p>
        <p className="text-xs text-text-tertiary mt-1">Add sections in the visual editor to build your page.</p>
      </div>
    );
  }

  const sorted = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 w-full font-sans">
      {sorted.map((section, idx) => (
        <div key={section.id || idx} className="rounded-xl overflow-hidden border border-border bg-surface shadow-sm">
          {renderSectionContent(section)}
        </div>
      ))}
    </div>
  );
}

function renderSectionContent(section: { type: string; content: any }) {
  const content = typeof section.content === 'string' ? JSON.parse(section.content || '{}') : (section.content || {});

  switch (section.type) {
    case 'hero':
      return (
        <div
          className="relative px-8 py-16 text-center overflow-hidden bg-gradient-to-b from-brand/10 via-surface to-surface"
          style={content.backgroundImage ? { backgroundImage: `url(${content.backgroundImage})`, backgroundSize: 'cover' } : {}}
        >
          {content.badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand/15 text-brand border border-brand/30 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              {content.badge}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight max-w-2xl mx-auto font-display">
            {content.headline || 'Your Headline Here'}
          </h1>
          {content.subheadline && (
            <p className="text-sm sm:text-base text-text-secondary mt-4 max-w-xl mx-auto">
              {content.subheadline}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            {content.ctaText && (
              <a
                href={content.ctaUrl || '#'}
                className="px-5 py-2.5 rounded-lg bg-brand text-white font-medium text-sm shadow-md hover:bg-brand-hover transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                {content.ctaText}
              </a>
            )}
            {content.secondaryCtaText && (
              <a
                href={content.secondaryCtaUrl || '#'}
                className="px-5 py-2.5 rounded-lg border border-border bg-surface text-text-primary font-medium text-sm hover:bg-surface-2 transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                {content.secondaryCtaText}
              </a>
            )}
          </div>
        </div>
      );

    case 'features':
      const featureItems = Array.isArray(content.items) ? content.items : [];
      return (
        <div className="p-8">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-2xl font-bold text-text-primary font-display">{content.title || 'Key Features'}</h2>
            {content.subtitle && <p className="text-xs sm:text-sm text-text-secondary mt-1">{content.subtitle}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featureItems.map((item: any, i: number) => (
              <div key={i} className="p-5 rounded-lg border border-border bg-surface-2/40 hover:border-brand/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-3">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">{item.title || `Feature ${i + 1}`}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="p-8 sm:p-12 text-center bg-gradient-to-r from-brand/15 via-surface to-brand/10">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary font-display">{content.headline || 'Ready to start?'}</h2>
            {content.body && <p className="text-xs sm:text-sm text-text-secondary mt-2">{content.body}</p>}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              {content.primaryButtonText && (
                <button className="px-5 py-2.5 rounded-lg bg-brand text-white font-medium text-sm shadow hover:bg-brand-hover transition-colors">
                  {content.primaryButtonText}
                </button>
              )}
              {content.secondaryButtonText && (
                <button className="px-5 py-2.5 rounded-lg border border-border bg-surface text-text-primary font-medium text-sm hover:bg-surface-2 transition-colors">
                  {content.secondaryButtonText}
                </button>
              )}
            </div>
          </div>
        </div>
      );

    case 'faq':
      const faqItems = Array.isArray(content.items) ? content.items : [];
      return (
        <div className="p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-6 font-display">{content.title || 'Frequently Asked Questions'}</h2>
          <div className="space-y-3">
            {faqItems.map((item: any, i: number) => (
              <details key={i} className="group p-4 rounded-lg border border-border bg-surface-2/30" open={i === 0}>
                <summary className="flex items-center justify-between font-semibold text-sm text-text-primary cursor-pointer list-none">
                  <span>{item.question || `Question ${i + 1}`}</span>
                  <ChevronDown className="w-4 h-4 text-text-tertiary group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-xs text-text-secondary mt-2.5 leading-relaxed pt-2 border-t border-border/50">
                  {item.answer || 'Answer details...'}
                </p>
              </details>
            ))}
          </div>
        </div>
      );

    case 'testimonials':
      const testItems = Array.isArray(content.items) ? content.items : [];
      return (
        <div className="p-8">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-6 font-display">{content.title || 'Client Testimonials'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {testItems.map((t: any, i: number) => (
              <div key={i} className="p-5 rounded-lg border border-border bg-surface-2/30">
                <p className="text-xs sm:text-sm text-text-primary italic leading-relaxed mb-4">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand/20 text-brand flex items-center justify-center font-bold text-xs">
                    {(t.author || 'A').charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary">{t.author}</div>
                    <div className="text-[10px] text-text-tertiary">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'contact':
      return (
        <div className="p-8 max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2 font-display">{content.title || 'Contact Us'}</h2>
          {content.subtitle && <p className="text-xs text-text-secondary mb-6">{content.subtitle}</p>}
          <div className="space-y-2 text-xs text-text-secondary">
            {content.email && <div><span className="font-semibold text-text-primary">Email:</span> {content.email}</div>}
            {content.phone && <div><span className="font-semibold text-text-primary">Phone:</span> {content.phone}</div>}
            {content.address && <div><span className="font-semibold text-text-primary">Address:</span> {content.address}</div>}
          </div>
        </div>
      );

    case 'rich_text':
    default:
      return (
        <div className="p-8 max-w-3xl mx-auto">
          {content.title && <h2 className="text-xl font-bold text-text-primary mb-4 font-display">{content.title}</h2>}
          <div className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {content.content || content.body || 'No content written yet.'}
          </div>
        </div>
      );
  }
}
