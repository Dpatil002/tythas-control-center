'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Star,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface ReviewItem {
  id: string;
  externalReviewId: string;
  reviewerName: string;
  rating: number;
  excerpt: string | null;
  postedAt: string;
  replyStatus: string;
}

interface LocalSeoTabProps {
  websiteId: string;
  websiteDomain: string;
  websiteName: string;
}

export const LocalSeoTab: React.FC<LocalSeoTabProps> = ({
  websiteId,
  websiteDomain,
  websiteName,
}) => {
  const [profileData, setProfileData] = useState<any>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<{ totalReviews: number; averageRating: number }>({
    totalReviews: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Business info form state
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [infoSaved, setInfoSaved] = useState(false);

  const fetchProfileAndReviews = async () => {
    try {
      setLoading(true);
      const [profileRes, reviewsRes] = await Promise.all([
        fetch(`/api/websites/${websiteId}/local-seo/profile`),
        fetch(`/api/websites/${websiteId}/local-seo/reviews`),
      ]);

      if (profileRes.ok) {
        const pResJson = await profileRes.json();
        const pData = pResJson.data || pResJson;
        setProfileData(pData);
        setBusinessName(pData.businessInfo?.businessName || websiteName);
        setPhone(pData.businessInfo?.phone || '+91 98765 43210');
        setCategory(pData.businessInfo?.category || 'Digital Agency & E-Commerce');
        setAddress(pData.businessInfo?.address || 'Baner, Pune, Maharashtra 411045, India');
      }

      if (reviewsRes.ok) {
        const rResJson = await reviewsRes.json();
        const rData = rResJson.data || rResJson;
        setReviews(rData.reviews || []);
        setStats(rData.stats || { totalReviews: 0, averageRating: 0 });
      }
    } catch (err) {
      console.error('Failed to load Local SEO data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndReviews();
  }, [websiteId]);

  const handleSaveBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading('save_info');
      const res = await fetch(`/api/websites/${websiteId}/local-seo/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          phone,
          category,
          address,
        }),
      });

      if (res.ok) {
        setInfoSaved(true);
        setTimeout(() => setInfoSaved(false), 2500);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectGbp = async () => {
    try {
      setActionLoading('connect_gbp');
      const res = await fetch(`/api/websites/${websiteId}/integrations/GOOGLE_BUSINESS_PROFILE/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedAccountId: `locations/${websiteId.replace(/[^a-zA-Z0-9]/g, '')}`,
          selectedAccountName: `${businessName || websiteName} (Main Branch)`,
        }),
      });

      if (res.ok) {
        await handleSyncReviews();
        fetchProfileAndReviews();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnectGbp = async () => {
    try {
      setActionLoading('disconnect_gbp');
      const res = await fetch(`/api/websites/${websiteId}/integrations/GOOGLE_BUSINESS_PROFILE`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchProfileAndReviews();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncReviews = async () => {
    try {
      setActionLoading('sync_reviews');
      const res = await fetch(`/api/websites/${websiteId}/local-seo/reviews/sync`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchProfileAndReviews();
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <RefreshCw className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  const isConnected = profileData?.connection?.status === 'CONNECTED';

  return (
    <div className="space-y-6">
      {/* GBP Connection Header Card */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-display font-semibold text-text-primary text-base">
                  Google Business Profile (Local SEO)
                </h3>
                {isConnected ? (
                  <Badge variant="success" className="font-mono text-[10px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="font-mono text-[10px] text-text-tertiary">
                    Not Connected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-1 max-w-xl">
                Link your Google Business Profile listing to monitor customer reviews, track local search signals, and manage location business details.
              </p>
              {isConnected && profileData?.connection?.externalAccountName && (
                <div className="mt-2 font-mono text-xs text-text-primary bg-surface-2/60 border border-border px-2.5 py-1 rounded-md inline-block">
                  Linked: {profileData.connection.externalAccountName}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            {isConnected ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={actionLoading === 'sync_reviews'}
                  onClick={handleSyncReviews}
                  className="text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Sync Reviews
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-critical text-xs hover:bg-critical-soft"
                  isLoading={actionLoading === 'disconnect_gbp'}
                  onClick={handleDisconnectGbp}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="primary"
                isLoading={actionLoading === 'connect_gbp'}
                onClick={handleConnectGbp}
              >
                Connect Google Business Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Business Info Form + What's Available Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Business Info Form (7 cols) */}
        <div className="lg:col-span-7 bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h4 className="font-display font-semibold text-sm text-text-primary">
              Location & Business Information
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">
              Primary location metadata used for local business schema and directory alignment.
            </p>
          </div>

          <form onSubmit={handleSaveBusinessInfo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-primary">
                  Business Name
                </label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Amary Beaute Salon"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-primary">
                  Primary Category
                </label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Beauty Salon / Digital Agency"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-primary">
                  Phone Number
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-primary">
                  Address & Region
                </label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Baner, Pune, Maharashtra 411045"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-border">
              {infoSaved ? (
                <span className="text-xs text-success font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Business details updated
                </span>
              ) : (
                <span className="text-[11px] text-text-tertiary">
                  Stored securely and referenced across your Local SEO schema.
                </span>
              )}

              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={actionLoading === 'save_info'}
              >
                Save Details
              </Button>
            </div>
          </form>
        </div>

        {/* Integration Capabilities Scope (5 cols) */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h4 className="font-display font-semibold text-sm text-text-primary">
              Integration Scope & Boundaries
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">
              Clear distinction of API-supported features vs manual portal actions.
            </p>
          </div>

          {/* Available through API */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-text-tertiary">
              Available Through API
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-surface-2/60 border border-border flex items-start gap-2 text-xs">
                <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isConnected ? 'text-success' : 'text-text-tertiary'}`} />
                <div>
                  <span className="font-semibold text-text-primary">Profile Connection Status</span>
                  <p className="text-text-secondary text-[11px] mt-0.5">
                    Live connection state tracking and location ID binding.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-2/60 border border-border flex items-start gap-2 text-xs">
                <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isConnected ? 'text-success' : 'text-text-tertiary'}`} />
                <div>
                  <span className="font-semibold text-text-primary">New-Review Alerts & Read-Only Feed</span>
                  <p className="text-text-secondary text-[11px] mt-0.5">
                    Continuous sync of star ratings, reviewer feedback, and timestamps.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Requires Manual Action */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-text-tertiary">
              Requires Manual Action in Google
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-surface-2/40 border border-border/80 flex items-start justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-text-primary">Replying to Reviews</span>
                  <p className="text-text-secondary text-[11px]">
                    Responses must be authored directly within Google Business Profile.
                  </p>
                </div>
                <Badge variant="neutral" className="text-[9px] font-mono flex-shrink-0 text-text-secondary bg-surface">
                  Requires manual action
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-2/40 border border-border/80 flex items-start justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-text-primary">Editing Operating Hours & Attributes</span>
                  <p className="text-text-secondary text-[11px]">
                    Special holiday hours and amenities must be updated directly in GBP.
                  </p>
                </div>
                <Badge variant="neutral" className="text-[9px] font-mono flex-shrink-0 text-text-secondary bg-surface">
                  Requires manual action
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Feed */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border bg-surface-2/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h4 className="font-display font-semibold text-sm text-text-primary">
              Google Customer Reviews
            </h4>
            {stats.totalReviews > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning-soft text-warning-text border border-border text-xs font-mono font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{stats.averageRating} / 5.0</span>
                <span className="text-text-tertiary">({stats.totalReviews})</span>
              </div>
            )}
          </div>

          <span className="text-[11px] text-text-tertiary">
            Read-only mirror of Google Business Profile reviews.
          </span>
        </div>

        <div className="divide-y divide-border">
          {reviews.map((rev) => {
            const isReplied = rev.replyStatus === 'Replied';

            return (
              <div key={rev.id} className="p-4 sm:px-6 hover:bg-surface-2/30 transition-colors space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-display font-semibold text-xs text-text-primary">
                      {rev.reviewerName}
                    </span>
                    {/* Star Rating */}
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-border'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isReplied ? 'success' : 'neutral'}
                      className="text-[10px] font-mono"
                    >
                      {rev.replyStatus}
                    </Badge>
                    <span className="text-[10px] text-text-tertiary font-mono">
                      {new Date(rev.postedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {rev.excerpt && (
                  <p className="text-xs text-text-secondary leading-relaxed pl-1 italic">
                    &ldquo;{rev.excerpt}&rdquo;
                  </p>
                )}
              </div>
            );
          })}

          {reviews.length === 0 && (
            <div className="p-8 text-center text-xs text-text-secondary space-y-2">
              <div>No reviews synced yet.</div>
              {isConnected && (
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={actionLoading === 'sync_reviews'}
                  onClick={handleSyncReviews}
                  className="text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Fetch Latest Reviews
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
