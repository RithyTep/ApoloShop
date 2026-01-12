"use client";

import { useState, useEffect } from "react";
import {
  useLoyaltyAccountByPhone,
  useRedeemLoyaltyPoints,
  type LoyaltyTier,
} from "@/lib/api-hooks";
import { translations } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Award, Gift, Star, Check, Loader2 } from "lucide-react";
import {
  POINTS_REDEMPTION_RATE,
  MIN_REDEEM_POINTS,
  calculateEarnedPoints,
} from "@/lib/loyalty";

interface CheckoutLoyaltyProps {
  phone?: string;
  orderTotal: number; // in USD
  language?: "EN" | "KH";
  currency?: "USD" | "KHR";
  onPointsRedeemed?: (discount: { usd: number; khr: number; points: number }) => void;
  onPointsCleared?: () => void;
}

const tierIcons: Record<LoyaltyTier, string> = {
  BRONZE: "🥉",
  SILVER: "🥈",
  GOLD: "🥇",
  PLATINUM: "💎",
};

export function CheckoutLoyalty({
  phone,
  orderTotal,
  language = "EN",
  currency = "USD",
  onPointsRedeemed,
  onPointsCleared,
}: CheckoutLoyaltyProps) {
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isApplied, setIsApplied] = useState(false);

  const t = translations[language === "EN" ? "en" : "kh"].loyalty;
  const checkoutT = t.checkout;

  const { data, isLoading } = useLoyaltyAccountByPhone(phone);
  const redeemMutation = useRedeemLoyaltyPoints();

  // Reset when phone changes
  useEffect(() => {
    setPointsToRedeem(0);
    setIsApplied(false);
    onPointsCleared?.();
  }, [phone, onPointsCleared]);

  if (!phone || isLoading) {
    return null;
  }

  if (!data?.account) {
    return null;
  }

  const { account } = data;
  const availablePoints = account.currentPoints;

  // Calculate max points that can be redeemed (can't exceed order total)
  const maxDiscountUsd = orderTotal;
  const maxPointsForOrder = maxDiscountUsd * POINTS_REDEMPTION_RATE;
  const maxRedeemable = Math.min(availablePoints, maxPointsForOrder);

  // Calculate discount for current selection
  const discountUsd = pointsToRedeem / POINTS_REDEMPTION_RATE;
  const discountKhr = Math.round(discountUsd * 4000);

  // Calculate points to be earned (on remaining amount after discount)
  const amountAfterDiscount = orderTotal - (isApplied ? discountUsd : 0);
  const pointsToEarn = calculateEarnedPoints(
    amountAfterDiscount,
    account.tier as LoyaltyTier
  );

  const canRedeem = availablePoints >= MIN_REDEEM_POINTS;

  const handleApplyPoints = () => {
    if (pointsToRedeem >= MIN_REDEEM_POINTS) {
      setIsApplied(true);
      onPointsRedeemed?.({
        usd: discountUsd,
        khr: discountKhr,
        points: pointsToRedeem,
      });
    }
  };

  const handleClearPoints = () => {
    setPointsToRedeem(0);
    setIsApplied(false);
    onPointsCleared?.();
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-4 space-y-4">
        {/* Header with tier badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            <span className="font-medium">{t.title}</span>
          </div>
          <Badge
            variant="secondary"
            className="gap-1"
            style={{ backgroundColor: account.tierInfo.color + "20" }}
          >
            <span>{tierIcons[account.tier as LoyaltyTier]}</span>
            <span>
              {language === "EN" ? account.tierInfo.name : account.tierInfo.nameKh}
            </span>
          </Badge>
        </div>

        {/* Points balance */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t.availablePoints}</span>
          <span className="font-semibold">
            {availablePoints.toLocaleString()} {t.points}
          </span>
        </div>

        {/* Redemption section */}
        {canRedeem ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{checkoutT.usePoints}</Label>
              {isApplied && (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <Check className="h-3 w-3" />
                  {checkoutT.discountApplied}
                </Badge>
              )}
            </div>

            {!isApplied ? (
              <>
                {/* Slider for point selection */}
                <div className="space-y-2">
                  <Slider
                    value={[pointsToRedeem]}
                    onValueChange={([value]) => setPointsToRedeem(value)}
                    max={maxRedeemable}
                    min={0}
                    step={MIN_REDEEM_POINTS}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>
                      {checkoutT.maxRedeemable}: {maxRedeemable.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Points input and discount preview */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={pointsToRedeem || ""}
                      onChange={(e) => {
                        const value = Math.min(
                          Math.max(0, parseInt(e.target.value) || 0),
                          maxRedeemable
                        );
                        setPointsToRedeem(value);
                      }}
                      placeholder={checkoutT.pointsToUse}
                      className="h-9"
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      {currency === "USD"
                        ? `-$${discountUsd.toFixed(2)}`
                        : `-${discountKhr.toLocaleString()}៛`}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleApplyPoints}
                  disabled={pointsToRedeem < MIN_REDEEM_POINTS}
                  className="w-full gap-2"
                  size="sm"
                >
                  <Gift className="h-4 w-4" />
                  {checkoutT.applyPoints}
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-green-100 p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {pointsToRedeem.toLocaleString()} {t.points}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {checkoutT.discountApplied}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-green-600">
                    {currency === "USD"
                      ? `-$${discountUsd.toFixed(2)}`
                      : `-${discountKhr.toLocaleString()}៛`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearPoints}
                  className="w-full text-muted-foreground"
                >
                  Remove discount
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {checkoutT.notEnoughPoints}
          </p>
        )}

        {/* Points to earn */}
        <div className="flex items-center justify-between rounded-lg bg-amber-100/50 p-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-600" />
            <span className="text-sm">{checkoutT.willEarn}</span>
          </div>
          <span className="font-semibold text-amber-700">
            +{pointsToEarn} {t.points}
          </span>
        </div>

        {/* Earn rate info */}
        <p className="text-xs text-muted-foreground text-center">
          {t.earnRate} • {account.tierInfo.multiplier}x {t.pointsMultiplier}
        </p>
      </CardContent>
    </Card>
  );
}
