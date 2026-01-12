"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useSubscription,
  useUpdateSubscription,
  type SubscriptionPlan,
  type SubscriptionUsageMetric,
} from "@/lib/api-hooks";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertTriangle,
  Check,
  Crown,
  Package,
  ShoppingCart,
  Users,
  Zap,
  Star,
  Infinity,
} from "lucide-react";
import { useState } from "react";

interface SubscriptionUsageCardProps {
  clientId: string;
}

function UsageBar({
  label,
  icon: Icon,
  metric,
}: {
  label: string;
  icon: React.ElementType;
  metric: SubscriptionUsageMetric;
}) {
  const getStatusColor = () => {
    if (metric.isUnlimited) return "bg-muted";
    if (metric.isAtLimit) return "bg-destructive";
    if (metric.isApproachingLimit) return "bg-yellow-500";
    return "bg-primary";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span>{label}</span>
        </div>
        <span className="font-medium">
          {metric.isUnlimited ? (
            <span className="flex items-center gap-1">
              {metric.used} <Infinity className="h-3 w-3" />
            </span>
          ) : (
            `${metric.used} / ${metric.limit}`
          )}
        </span>
      </div>
      {!metric.isUnlimited && (
        <div className="relative">
          <Progress value={metric.percentage} className="h-2" />
          <div
            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getStatusColor()}`}
            style={{ width: `${metric.percentage}%` }}
          />
        </div>
      )}
      {metric.isAtLimit && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Limit reached
        </p>
      )}
      {metric.isApproachingLimit && !metric.isAtLimit && (
        <p className="text-xs text-yellow-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Approaching limit
        </p>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  info,
  limits,
  pricing,
  isCurrentPlan,
  onSelect,
  isLoading,
}: {
  plan: SubscriptionPlan;
  info: { name: string; description: string; badge?: string };
  limits: {
    maxProducts: number;
    maxOrdersPerMonth: number;
    maxCustomers: number;
    features: Record<string, boolean>;
  };
  pricing: { monthly: number; yearly: number; yearlyDiscount: number };
  isCurrentPlan: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
  isLoading: boolean;
}) {
  const features = [
    { key: "customDomain", label: "Custom Domain" },
    { key: "advancedAnalytics", label: "Advanced Analytics" },
    { key: "prioritySupport", label: "Priority Support" },
    { key: "customBranding", label: "Custom Branding" },
    { key: "apiAccess", label: "API Access" },
    { key: "multipleUsers", label: "Multiple Users" },
    { key: "exportReports", label: "Export Reports" },
    { key: "bulkImport", label: "Bulk Import" },
  ];

  return (
    <Card className={`relative ${isCurrentPlan ? "border-primary" : ""}`}>
      {info.badge && (
        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2" variant="default">
          {info.badge}
        </Badge>
      )}
      {isCurrentPlan && (
        <Badge className="absolute -top-2 right-4" variant="outline">
          Current
        </Badge>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          {plan === "PRO" && <Crown className="h-5 w-5 text-yellow-500" />}
          {info.name}
        </CardTitle>
        <CardDescription>{info.description}</CardDescription>
        <div className="pt-2">
          <span className="text-3xl font-bold">${pricing.monthly}</span>
          <span className="text-muted-foreground">/month</span>
          {pricing.yearlyDiscount > 0 && (
            <p className="text-xs text-green-600 mt-1">
              Save {pricing.yearlyDiscount}% with yearly billing
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Products</span>
            <span className="font-medium">
              {limits.maxProducts === -1 ? "Unlimited" : limits.maxProducts}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Orders/Month</span>
            <span className="font-medium">
              {limits.maxOrdersPerMonth === -1 ? "Unlimited" : limits.maxOrdersPerMonth}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customers</span>
            <span className="font-medium">
              {limits.maxCustomers === -1 ? "Unlimited" : limits.maxCustomers}
            </span>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          {features.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              {limits.features[key] ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <span className="h-4 w-4 text-muted-foreground">-</span>
              )}
              <span className={limits.features[key] ? "" : "text-muted-foreground"}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          variant={isCurrentPlan ? "outline" : "default"}
          disabled={isCurrentPlan || isLoading}
          onClick={() => onSelect(plan)}
        >
          {isCurrentPlan ? "Current Plan" : `Upgrade to ${info.name}`}
        </Button>
      </CardContent>
    </Card>
  );
}

export function SubscriptionUsageCard({ clientId }: SubscriptionUsageCardProps) {
  const { data, isLoading, error } = useSubscription(clientId);
  const updateMutation = useUpdateSubscription();
  const { toast } = useToast();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    try {
      await updateMutation.mutateAsync({
        clientId,
        plan,
        billingCycle: "monthly",
      });
      toast({
        title: "Subscription updated",
        description: `Your plan has been upgraded to ${plan}`,
      });
      setUpgradeDialogOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const { subscription, planInfo, usage, upgradeRecommendation, allPlans } = data;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Subscription
              </CardTitle>
              <CardDescription>
                {planInfo.name} Plan
                {subscription?.status === "CANCELLED" && (
                  <Badge variant="destructive" className="ml-2">
                    Cancelled
                  </Badge>
                )}
              </CardDescription>
            </div>
            {subscription?.plan === "PRO" ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Crown className="h-3 w-3" />
                PRO
              </Badge>
            ) : (
              <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    Upgrade
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Choose Your Plan</DialogTitle>
                    <DialogDescription>
                      Select the plan that best fits your business needs
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {allPlans.map((p) => (
                      <PlanCard
                        key={p.plan}
                        plan={p.plan}
                        info={p.info}
                        limits={p.limits}
                        pricing={p.pricing}
                        isCurrentPlan={subscription?.plan === p.plan}
                        onSelect={handleUpgrade}
                        isLoading={updateMutation.isPending}
                      />
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage metrics */}
          <div className="space-y-4">
            <UsageBar label="Products" icon={Package} metric={usage.products} />
            <UsageBar label="Orders this month" icon={ShoppingCart} metric={usage.ordersThisMonth} />
            <UsageBar label="Customers" icon={Users} metric={usage.customers} />
          </div>

          {/* Upgrade recommendation */}
          {upgradeRecommendation.shouldUpgrade && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    {upgradeRecommendation.reason}
                  </p>
                  {upgradeRecommendation.blockedAction && (
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      You cannot {upgradeRecommendation.blockedAction} until you upgrade.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-yellow-300 hover:bg-yellow-100 dark:border-yellow-700 dark:hover:bg-yellow-800"
                    onClick={() => setUpgradeDialogOpen(true)}
                  >
                    Upgrade to {upgradeRecommendation.suggestedPlan}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Period info */}
          {subscription && (
            <div className="pt-2 border-t text-sm text-muted-foreground">
              <p>
                Current period ends:{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
              {subscription.cancelledAt && (
                <p className="text-destructive">
                  Cancelled on {new Date(subscription.cancelledAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// Compact upgrade prompt for inline use
export function UpgradePrompt({
  clientId,
  feature,
  compact = false,
}: {
  clientId: string;
  feature?: string;
  compact?: boolean;
}) {
  const { data } = useSubscription(clientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const updateMutation = useUpdateSubscription();
  const { toast } = useToast();

  if (!data?.upgradeRecommendation.shouldUpgrade) {
    return null;
  }

  const { upgradeRecommendation, allPlans, subscription } = data;

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    try {
      await updateMutation.mutateAsync({
        clientId,
        plan,
        billingCycle: "monthly",
      });
      toast({
        title: "Subscription updated",
        description: `Your plan has been upgraded to ${plan}`,
      });
      setDialogOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  if (compact) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="link" size="sm" className="text-yellow-600 p-0 h-auto">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Upgrade needed
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
            <DialogDescription>
              {feature
                ? `You need to upgrade to use ${feature}.`
                : upgradeRecommendation.reason}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {allPlans.map((p) => (
              <PlanCard
                key={p.plan}
                plan={p.plan}
                info={p.info}
                limits={p.limits}
                pricing={p.pricing}
                isCurrentPlan={subscription?.plan === p.plan}
                onSelect={handleUpgrade}
                isLoading={updateMutation.isPending}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {upgradeRecommendation.reason}
            </span>
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs">
              Upgrade
            </Button>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            {feature
              ? `You need to upgrade to use ${feature}.`
              : upgradeRecommendation.reason}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {allPlans.map((p) => (
            <PlanCard
              key={p.plan}
              plan={p.plan}
              info={p.info}
              limits={p.limits}
              pricing={p.pricing}
              isCurrentPlan={subscription?.plan === p.plan}
              onSelect={handleUpgrade}
              isLoading={updateMutation.isPending}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
