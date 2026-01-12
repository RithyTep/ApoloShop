"use client";

import { useState } from "react";
import {
  useLoyaltyAccount,
  type LoyaltyTier,
  type LoyaltyTransaction,
} from "@/lib/api-hooks";
import { translations } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Award,
  Gift,
  ChevronRight,
  Star,
  TrendingUp,
  History,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface LoyaltyPointsCardProps {
  customerId: string;
  language?: "EN" | "KH";
  currency?: "USD" | "KHR";
  compact?: boolean;
  showHistory?: boolean;
  onRedeemClick?: () => void;
}

const tierIcons: Record<LoyaltyTier, string> = {
  BRONZE: "🥉",
  SILVER: "🥈",
  GOLD: "🥇",
  PLATINUM: "💎",
};

const transactionTypeIcons: Record<string, typeof Award> = {
  EARN: TrendingUp,
  REDEEM: Gift,
  BONUS: Star,
  EXPIRE: History,
  ADJUSTMENT: Award,
  REFUND: History,
};

function formatDate(dateString: string, language: "EN" | "KH"): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(language === "EN" ? "en-US" : "km-KH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function LoyaltyPointsCard({
  customerId,
  language = "EN",
  currency = "USD",
  compact = false,
  showHistory = false,
  onRedeemClick,
}: LoyaltyPointsCardProps) {
  const [showTransactions, setShowTransactions] = useState(showHistory);
  const t = translations[language === "EN" ? "en" : "kh"];
  const loyaltyT = t.loyalty;

  const { data, isLoading, error } = useLoyaltyAccount(customerId, {
    includeHistory: showTransactions,
  });

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
          {loyaltyT.errorLoading}
        </CardContent>
      </Card>
    );
  }

  const { account, transactions } = data;
  const tierInfo = account.tierInfo;
  const nextTier = account.nextTier;

  // Calculate progress to next tier
  const progressToNextTier = nextTier.nextTier
    ? Math.round(
        ((tierInfo.minLifetimePoints +
          (account.lifetimePoints - tierInfo.minLifetimePoints)) /
          (tierInfo.minLifetimePoints + nextTier.pointsNeeded)) *
          100
      )
    : 100;

  if (compact) {
    return (
      <Card className="border-2" style={{ borderColor: tierInfo.color }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{tierIcons[account.tier]}</span>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "EN" ? tierInfo.name : tierInfo.nameKh}
                </p>
                <p className="text-xl font-bold">
                  {account.currentPoints.toLocaleString()} {loyaltyT.points}
                </p>
              </div>
            </div>
            {onRedeemClick && account.currentPoints >= account.redemptionInfo.minPoints && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRedeemClick}
                className="gap-1"
              >
                <Gift className="h-4 w-4" />
                {loyaltyT.redeem}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Tier Header */}
      <div
        className="p-4 text-white"
        style={{ backgroundColor: tierInfo.color }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{tierIcons[account.tier]}</span>
            <div>
              <h3 className="text-lg font-semibold">
                {language === "EN" ? tierInfo.name : tierInfo.nameKh}{" "}
                {loyaltyT.member}
              </h3>
              <p className="text-sm opacity-90">
                {tierInfo.multiplier}x {loyaltyT.pointsMultiplier}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-base font-bold">
            {account.currentPoints.toLocaleString()} {loyaltyT.points}
          </Badge>
        </div>
      </div>

      <CardContent className="space-y-6 p-6">
        {/* Points Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">
              {loyaltyT.availablePoints}
            </p>
            <p className="text-2xl font-bold">
              {account.currentPoints.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">
              {loyaltyT.lifetimePoints}
            </p>
            <p className="text-2xl font-bold">
              {account.lifetimePoints.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Redemption Value */}
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {loyaltyT.redeemableValue}
              </p>
              <p className="text-xl font-semibold">
                {currency === "USD"
                  ? `$${account.redemptionInfo.availableDiscount.toFixed(2)}`
                  : `${Math.round(account.redemptionInfo.availableDiscount * 4000).toLocaleString()}៛`}
              </p>
            </div>
            {onRedeemClick && account.currentPoints >= account.redemptionInfo.minPoints && (
              <Button onClick={onRedeemClick} className="gap-2">
                <Gift className="h-4 w-4" />
                {loyaltyT.redeemNow}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {loyaltyT.minPoints}: {account.redemptionInfo.minPoints} |{" "}
            {account.redemptionInfo.rate} {loyaltyT.pointsPerDollar}
          </p>
        </div>

        {/* Progress to Next Tier */}
        {nextTier.nextTier && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {loyaltyT.progressToNextTier}
              </span>
              <span className="font-medium">
                {nextTier.pointsNeeded.toLocaleString()} {loyaltyT.pointsToGo}
              </span>
            </div>
            <Progress value={progressToNextTier} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {loyaltyT.nextTier}:{" "}
              <span className="font-medium">
                {language === "EN"
                  ? nextTier.nextTier
                  : translations.kh.loyalty.tiers[nextTier.nextTier]}
              </span>
            </p>
          </div>
        )}

        {/* Transaction History Toggle */}
        <Button
          variant="ghost"
          className="w-full justify-between"
          onClick={() => setShowTransactions(!showTransactions)}
        >
          <span className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {loyaltyT.transactionHistory}
          </span>
          {showTransactions ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* Transaction History */}
        {showTransactions && transactions && transactions.length > 0 && (
          <div className="space-y-2">
            {transactions.map((tx: LoyaltyTransaction) => {
              const Icon = transactionTypeIcons[tx.type] || Award;
              const isPositive = tx.points > 0;

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-full p-2 ${
                        isPositive
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {loyaltyT.transactionTypes[tx.type] || tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.createdAt, language)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-semibold ${
                      isPositive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {tx.points.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {showTransactions && (!transactions || transactions.length === 0) && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {loyaltyT.noTransactions}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Mini loyalty widget for header/nav display
 */
export function LoyaltyPointsBadge({
  customerId,
  language = "EN",
  onClick,
}: {
  customerId: string;
  language?: "EN" | "KH";
  onClick?: () => void;
}) {
  const { data, isLoading } = useLoyaltyAccount(customerId);
  const t = translations[language === "EN" ? "en" : "kh"].loyalty;

  if (isLoading || !data) {
    return null;
  }

  const { account } = data;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
    >
      <span>{tierIcons[account.tier]}</span>
      <span className="font-medium">
        {account.currentPoints.toLocaleString()} {t.points}
      </span>
    </button>
  );
}
