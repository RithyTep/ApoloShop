"use client";

import { useState } from "react";
import { useReferralInfo, type ReferralInfo } from "@/lib/api-hooks";
import { translations } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Gift,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Facebook,
} from "lucide-react";

interface ReferralDashboardProps {
  customerId: string;
  language?: "EN" | "KH";
  currency?: "USD" | "KHR";
  compact?: boolean;
  showHistory?: boolean;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  COMPLETED: "bg-green-500",
  EXPIRED: "bg-gray-500",
  CANCELLED: "bg-red-500",
};

const statusIcons: Record<string, typeof Clock> = {
  PENDING: Clock,
  COMPLETED: CheckCircle2,
  EXPIRED: XCircle,
  CANCELLED: XCircle,
};

function formatDate(dateString: string, language: "EN" | "KH"): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(language === "EN" ? "en-US" : "km-KH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number, currency: "USD" | "KHR"): string {
  if (currency === "KHR") {
    return `${Math.round(amount * 4000).toLocaleString()} KHR`;
  }
  return `$${amount.toFixed(2)}`;
}

export function ReferralDashboard({
  customerId,
  language = "EN",
  currency = "USD",
  compact = false,
  showHistory = false,
}: ReferralDashboardProps) {
  const [showReferrals, setShowReferrals] = useState(showHistory);
  const [copied, setCopied] = useState(false);
  const t = translations[language === "EN" ? "en" : "kh"];
  const referralT = t.referral;

  const { data, isLoading, error } = useReferralInfo(customerId, {
    includeHistory: showReferrals,
    lang: language === "EN" ? "en" : "kh",
  });

  const handleCopyCode = async () => {
    if (!data?.code) return;

    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyLink = async () => {
    if (!data?.shareLinks.copyText) return;

    try {
      await navigator.clipboard.writeText(data.shareLinks.copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShareTelegram = () => {
    if (data?.shareLinks.telegram) {
      window.open(data.shareLinks.telegram, "_blank");
    }
  };

  const handleShareFacebook = () => {
    if (data?.shareLinks.facebook) {
      window.open(data.shareLinks.facebook, "_blank");
    }
  };

  if (isLoading) {
    return (
      <Card className={compact ? "p-3" : ""}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={compact ? "p-3" : ""}>
        <CardContent className="py-6 text-center text-muted-foreground">
          {referralT.errorLoading}
        </CardContent>
      </Card>
    );
  }

  const { code, stats, config, shareLinks, history } = data;

  if (compact) {
    return (
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Gift className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">{referralT.yourCode}</div>
              <div className="font-mono text-lg font-bold">{code}</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            className="gap-1"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {stats.completedReferrals} {referralT.completed}
          </span>
          <span className="font-medium text-green-600">
            {formatCurrency(stats.totalEarned, currency)} {referralT.earned}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {referralT.title}
        </CardTitle>
        <CardDescription>{referralT.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Code Section */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="mb-2 text-sm text-muted-foreground">
            {referralT.yourCode}
          </div>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={code}
              className="font-mono text-lg font-bold text-center"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyCode}
              title={referralT.copyCode}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {stats.totalReferrals}
            </div>
            <div className="text-xs text-muted-foreground">
              {referralT.totalReferrals}
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.completedReferrals}
            </div>
            <div className="text-xs text-muted-foreground">
              {referralT.completed}
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingReferrals}
            </div>
            <div className="text-xs text-muted-foreground">
              {referralT.pending}
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalEarned, currency)}
            </div>
            <div className="text-xs text-muted-foreground">
              {referralT.totalEarned}
            </div>
          </div>
        </div>

        {/* Rewards Info */}
        <div className="rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-5 w-5 text-primary" />
            <span className="font-medium">{referralT.howItWorks}</span>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 mt-0.5 text-green-500" />
              {referralT.youGet.replace("{amount}", formatCurrency(config.referrerReward, currency))}
            </li>
            <li className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 mt-0.5 text-green-500" />
              {referralT.friendGets.replace("{amount}", formatCurrency(config.refereeReward, currency))}
            </li>
          </ul>
        </div>

        {/* Share Buttons */}
        <div className="space-y-3">
          <div className="text-sm font-medium">{referralT.shareWith}</div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none gap-2"
              onClick={handleShareTelegram}
            >
              <MessageCircle className="h-4 w-4" />
              Telegram
            </Button>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none gap-2"
              onClick={handleShareFacebook}
            >
              <Facebook className="h-4 w-4" />
              Facebook
            </Button>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none gap-2"
              onClick={handleCopyLink}
            >
              <Share2 className="h-4 w-4" />
              {referralT.copyLink}
            </Button>
          </div>
        </div>

        {/* Monthly Limit */}
        {!stats.canReferMore && (
          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700">
            {referralT.monthlyLimitReached.replace("{limit}", String(config.maxReferralsPerMonth))}
          </div>
        )}

        {/* Referral History */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowReferrals(!showReferrals)}
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {referralT.referralHistory}
            </span>
            {showReferrals ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {showReferrals && history && history.length > 0 && (
            <div className="space-y-2">
              {history.map((referral: ReferralInfo) => {
                const StatusIcon = statusIcons[referral.status];
                return (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${statusColors[referral.status]}`} />
                      <div>
                        <div className="font-medium">
                          {referral.referee?.name || referralT.unknownFriend}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(referral.createdAt, language)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={referral.status === "COMPLETED" ? "border-green-500 text-green-600" : ""}
                      >
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {referralT.statuses[referral.status as keyof typeof referralT.statuses]}
                      </Badge>
                      {referral.status === "COMPLETED" && (
                        <span className="text-sm font-medium text-green-600">
                          +{formatCurrency(referral.referrerReward, currency)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showReferrals && (!history || history.length === 0) && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {referralT.noReferralsYet}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
