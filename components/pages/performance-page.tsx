"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Database,
  Server,
  Zap,
  AlertCircle,
  XCircle,
  RefreshCw,
  Eye,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminDataCard,
  AdminTable,
  AdminTableHeader,
  AdminTableHeadRow,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminBadge,
  AdminEmptyState,
  AdminLoading,
} from "@/components/admin";
import {
  usePerformanceSummary,
  usePerformanceErrors,
  useResolveError,
  type ErrorLogEntry,
} from "@/lib/api-hooks";
import { useToast } from "@/components/ui/use-toast";

const RATING_COLORS = {
  good: "#10b981",
  "needs-improvement": "#f59e0b",
  poor: "#ef4444",
};

const VITAL_NAMES: Record<string, string> = {
  LCP: "Largest Contentful Paint",
  FID: "First Input Delay",
  CLS: "Cumulative Layout Shift",
  FCP: "First Contentful Paint",
  TTFB: "Time to First Byte",
  INP: "Interaction to Next Paint",
};

const VITAL_UNITS: Record<string, string> = {
  LCP: "ms",
  FID: "ms",
  CLS: "",
  FCP: "ms",
  TTFB: "ms",
  INP: "ms",
};

export function PerformancePage() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("7d");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedError, setSelectedError] = useState<ErrorLogEntry | null>(null);

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const dateFrom = new Date();
    switch (dateRange) {
      case "24h":
        dateFrom.setHours(now.getHours() - 24);
        break;
      case "7d":
        dateFrom.setDate(now.getDate() - 7);
        break;
      case "30d":
        dateFrom.setDate(now.getDate() - 30);
        break;
    }
    return {
      startDate: dateFrom.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0],
    };
  }, [dateRange]);

  const {
    data: perfData,
    isLoading: perfLoading,
    refetch: refetchPerf,
  } = usePerformanceSummary({ startDate, endDate });

  const {
    data: errorsData,
    isLoading: errorsLoading,
    refetch: refetchErrors,
  } = usePerformanceErrors({ limit: 50, resolved: false });

  const resolveError = useResolveError();

  const handleResolveError = async (error: ErrorLogEntry) => {
    try {
      if (error.fingerprint) {
        await resolveError.mutateAsync({ fingerprint: error.fingerprint });
        toast({
          title: "Errors resolved",
          description: `Resolved ${error.count} similar errors`,
        });
      } else {
        await resolveError.mutateAsync({ errorId: error.id });
        toast({ title: "Error resolved" });
      }
    } catch (err) {
      toast({
        title: "Failed to resolve error",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (perfLoading && errorsLoading) {
    return (
      <AdminLoading
        title="Performance"
        subtitle="Monitor Core Web Vitals, API performance, and errors"
        rows={5}
      />
    );
  }

  const renderOverviewTab = () => {
    const webVitals = perfData?.webVitals || [];
    const api = perfData?.api;
    const database = perfData?.database;
    const errors = perfData?.errors;

    // Summary cards
    const summaryCards = [
      {
        label: "Web Vitals Score",
        value: calculateOverallScore(webVitals),
        icon: Activity,
        color: "text-info",
      },
      {
        label: "Avg API Response",
        value: `${Math.round(api?.avgResponseTime || 0)}ms`,
        icon: Server,
        color: "text-success",
      },
      {
        label: "Avg DB Query",
        value: `${Math.round(database?.avgQueryTime || 0)}ms`,
        icon: Database,
        color: "text-primary",
      },
      {
        label: "Unresolved Errors",
        value: errors?.unresolved || 0,
        icon: errors?.unresolved ? AlertTriangle : CheckCircle,
        color: errors?.unresolved ? "text-destructive" : "text-success",
      },
    ];

    // Prepare chart data for Web Vitals
    const webVitalsChartData = webVitals.map((v) => ({
      name: v.name,
      fullName: VITAL_NAMES[v.name] || v.name,
      value: Math.round(v.avgValue * 100) / 100,
      unit: VITAL_UNITS[v.name] || "",
      count: v.count,
    }));

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </h3>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {card.value}
                </p>
              </Card>
            );
          })}
        </div>

        {/* Web Vitals Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Core Web Vitals</h3>
          {webVitalsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={webVitalsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string, props: { payload: { fullName: string; unit: string } }) => [
                    `${value}${props.payload.unit}`,
                    props.payload.fullName,
                  ]}
                />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <AdminEmptyState message="No Web Vitals data yet. Add the WebVitalsReporter component to your app." />
          )}
        </Card>

        {/* Error Trends */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Error Trends</h3>
          {errors?.trends && errors.trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={errors.trends.map((t) => ({
                  date: new Date(t.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  }),
                  count: t.count,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <AdminEmptyState message="No errors recorded" />
          )}
        </Card>
      </div>
    );
  };

  const renderWebVitalsTab = () => {
    const webVitals = perfData?.webVitals || [];
    const ratings = perfData?.webVitalRatings || {};

    return (
      <div className="space-y-6">
        {webVitals.length === 0 ? (
          <Card className="p-6 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Web Vitals Data</h3>
            <p className="text-muted-foreground">
              Add the WebVitalsReporter component to your app to start collecting Core Web Vitals.
            </p>
          </Card>
        ) : (
          webVitals.map((vital) => {
            const vitalRatings = ratings[vital.name] || {
              good: 0,
              "needs-improvement": 0,
              poor: 0,
            };
            const total =
              vitalRatings.good +
              vitalRatings["needs-improvement"] +
              vitalRatings.poor;
            const pieData = [
              { name: "Good", value: vitalRatings.good, color: RATING_COLORS.good },
              {
                name: "Needs Improvement",
                value: vitalRatings["needs-improvement"],
                color: RATING_COLORS["needs-improvement"],
              },
              { name: "Poor", value: vitalRatings.poor, color: RATING_COLORS.poor },
            ].filter((d) => d.value > 0);

            return (
              <Card key={vital.name} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {vital.name}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({VITAL_NAMES[vital.name]})
                      </span>
                    </h3>
                    <p className="text-3xl font-bold mt-2">
                      {Math.round(vital.avgValue * 100) / 100}
                      {VITAL_UNITS[vital.name]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {vital.count.toLocaleString()} measurements
                    </p>
                  </div>
                  <div className="w-32 h-32">
                    {pieData.length > 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            innerRadius={25}
                            outerRadius={40}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: RATING_COLORS.good }}
                    />
                    Good: {total > 0 ? Math.round((vitalRatings.good / total) * 100) : 0}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: RATING_COLORS["needs-improvement"] }}
                    />
                    Needs Work:{" "}
                    {total > 0
                      ? Math.round((vitalRatings["needs-improvement"] / total) * 100)
                      : 0}
                    %
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: RATING_COLORS.poor }}
                    />
                    Poor: {total > 0 ? Math.round((vitalRatings.poor / total) * 100) : 0}%
                  </span>
                </div>
              </Card>
            );
          })
        )}
      </div>
    );
  };

  const renderApiTab = () => {
    const api = perfData?.api;
    const slowEndpoints = api?.slowestEndpoints || [];

    return (
      <div className="space-y-6">
        {/* API Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Avg Response Time</h3>
            <p className="text-2xl font-bold mt-2">
              {Math.round(api?.avgResponseTime || 0)}ms
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Max Response Time</h3>
            <p className="text-2xl font-bold mt-2">
              {Math.round(api?.maxResponseTime || 0)}ms
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Min Response Time</h3>
            <p className="text-2xl font-bold mt-2">
              {Math.round(api?.minResponseTime || 0)}ms
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Requests</h3>
            <p className="text-2xl font-bold mt-2">
              {(api?.totalRequests || 0).toLocaleString()}
            </p>
          </Card>
        </div>

        {/* Slowest Endpoints */}
        <AdminDataCard>
          <h3 className="text-lg font-semibold mb-4">Slowest Endpoints</h3>
          {slowEndpoints.length > 0 ? (
            <AdminTable>
              <AdminTableHeader>
                <AdminTableHeadRow>
                  <AdminTableHead>Endpoint</AdminTableHead>
                  <AdminTableHead>Method</AdminTableHead>
                  <AdminTableHead className="text-right">Avg Time</AdminTableHead>
                  <AdminTableHead className="text-right">Requests</AdminTableHead>
                </AdminTableHeadRow>
              </AdminTableHeader>
              <AdminTableBody>
                {slowEndpoints.map((endpoint, index) => (
                  <AdminTableRow key={index}>
                    <AdminTableCell className="font-mono text-sm">{endpoint.path}</AdminTableCell>
                    <AdminTableCell>
                      <AdminBadge variant="outline">{endpoint.method || "GET"}</AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell className="text-right">
                      {Math.round(endpoint.avgTime)}ms
                    </AdminTableCell>
                    <AdminTableCell className="text-right">
                      {endpoint.count.toLocaleString()}
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          ) : (
            <AdminEmptyState message="No API data collected yet" />
          )}
        </AdminDataCard>
      </div>
    );
  };

  const renderDatabaseTab = () => {
    const database = perfData?.database;
    const slowQueries = database?.slowestQueries || [];

    return (
      <div className="space-y-6">
        {/* Database Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Avg Query Time</h3>
            <p className="text-2xl font-bold mt-2">
              {Math.round(database?.avgQueryTime || 0)}ms
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Max Query Time</h3>
            <p className="text-2xl font-bold mt-2">
              {Math.round(database?.maxQueryTime || 0)}ms
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Queries</h3>
            <p className="text-2xl font-bold mt-2">
              {(database?.totalQueries || 0).toLocaleString()}
            </p>
          </Card>
        </div>

        {/* Slowest Queries */}
        <AdminDataCard>
          <h3 className="text-lg font-semibold mb-4">Slowest Queries</h3>
          {slowQueries.length > 0 ? (
            <AdminTable>
              <AdminTableHeader>
                <AdminTableHeadRow>
                  <AdminTableHead>Query</AdminTableHead>
                  <AdminTableHead className="text-right">Avg Time</AdminTableHead>
                  <AdminTableHead className="text-right">Count</AdminTableHead>
                </AdminTableHeadRow>
              </AdminTableHeader>
              <AdminTableBody>
                {slowQueries.map((query, index) => (
                  <AdminTableRow key={index}>
                    <AdminTableCell className="font-mono text-sm">{query.name}</AdminTableCell>
                    <AdminTableCell className="text-right">
                      {Math.round(query.avgTime)}ms
                    </AdminTableCell>
                    <AdminTableCell className="text-right">
                      {query.count.toLocaleString()}
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          ) : (
            <AdminEmptyState message="No database query data collected yet" />
          )}
        </AdminDataCard>
      </div>
    );
  };

  const renderErrorsTab = () => {
    const errors = errorsData?.errors || [];

    return (
      <div className="space-y-6">
        <AdminDataCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Unresolved Errors</h3>
            <Button variant="outline" size="sm" onClick={() => refetchErrors()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {errors.length > 0 ? (
            <AdminTable>
              <AdminTableHeader>
                <AdminTableHeadRow>
                  <AdminTableHead>Error</AdminTableHead>
                  <AdminTableHead>Path</AdminTableHead>
                  <AdminTableHead className="text-right">Count</AdminTableHead>
                  <AdminTableHead>Last Seen</AdminTableHead>
                  <AdminTableHead className="text-right">Actions</AdminTableHead>
                </AdminTableHeadRow>
              </AdminTableHeader>
              <AdminTableBody>
                {errors.map((error) => (
                  <AdminTableRow key={error.id}>
                    <AdminTableCell>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        <span className="font-medium truncate max-w-[300px]">
                          {error.message}
                        </span>
                      </div>
                      {error.name && (
                        <AdminBadge variant="outline" className="mt-1">
                          {error.name}
                        </AdminBadge>
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="font-mono text-sm">
                      {error.path || "-"}
                    </AdminTableCell>
                    <AdminTableCell className="text-right">
                      <AdminBadge variant={error.count > 10 ? "destructive" : "secondary"}>
                        {error.count}x
                      </AdminBadge>
                    </AdminTableCell>
                    <AdminTableCell className="text-sm text-muted-foreground">
                      {new Date(error.lastSeen).toLocaleString()}
                    </AdminTableCell>
                    <AdminTableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedError(error)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolveError(error)}
                          disabled={resolveError.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">No unresolved errors</p>
            </div>
          )}
        </AdminDataCard>

        {/* Error Detail Dialog */}
        <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                Error Details
              </DialogTitle>
              <DialogDescription>
                {selectedError?.count && selectedError.count > 1
                  ? `${selectedError.count} occurrences`
                  : "Single occurrence"}
              </DialogDescription>
            </DialogHeader>
            {selectedError && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Message</h4>
                  <p className="mt-1 text-foreground">{selectedError.message}</p>
                </div>
                {selectedError.name && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Type</h4>
                    <p className="mt-1">{selectedError.name}</p>
                  </div>
                )}
                {selectedError.path && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Path</h4>
                    <p className="mt-1 font-mono text-sm">{selectedError.path}</p>
                  </div>
                )}
                {selectedError.stack && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Stack Trace</h4>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                      {selectedError.stack}
                    </pre>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-muted-foreground">First Seen</h4>
                    <p>{new Date(selectedError.firstSeen).toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-muted-foreground">Last Seen</h4>
                    <p>{new Date(selectedError.lastSeen).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedError(null)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      handleResolveError(selectedError);
                      setSelectedError(null);
                    }}
                    disabled={resolveError.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Performance"
        subtitle="Monitor Core Web Vitals, API performance, and errors"
      >
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            refetchPerf();
            refetchErrors();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </AdminPageHeader>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Zap className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="web-vitals" className="gap-2">
            <Activity className="h-4 w-4" />
            Web Vitals
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Server className="h-4 w-4" />
            API
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="errors" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Errors
            {perfData?.errors?.unresolved ? (
              <AdminBadge variant="destructive">
                {perfData.errors.unresolved}
              </AdminBadge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{renderOverviewTab()}</TabsContent>
        <TabsContent value="web-vitals">{renderWebVitalsTab()}</TabsContent>
        <TabsContent value="api">{renderApiTab()}</TabsContent>
        <TabsContent value="database">{renderDatabaseTab()}</TabsContent>
        <TabsContent value="errors">{renderErrorsTab()}</TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Calculate overall Web Vitals score (simplified)
 */
function calculateOverallScore(webVitals: { name: string; avgValue: number }[]): string {
  if (webVitals.length === 0) return "N/A";

  // Simple scoring based on average values vs thresholds
  const thresholds: Record<string, { good: number; poor: number }> = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 },
    INP: { good: 200, poor: 500 },
  };

  let totalScore = 0;
  let count = 0;

  for (const vital of webVitals) {
    const threshold = thresholds[vital.name];
    if (!threshold) continue;

    let score: number;
    if (vital.avgValue <= threshold.good) {
      score = 100;
    } else if (vital.avgValue >= threshold.poor) {
      score = 0;
    } else {
      // Linear interpolation between good and poor
      score =
        100 -
        ((vital.avgValue - threshold.good) / (threshold.poor - threshold.good)) * 100;
    }

    totalScore += score;
    count++;
  }

  if (count === 0) return "N/A";

  const avgScore = Math.round(totalScore / count);
  if (avgScore >= 90) return `${avgScore} (Good)`;
  if (avgScore >= 50) return `${avgScore} (Needs Work)`;
  return `${avgScore} (Poor)`;
}
