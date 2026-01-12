"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useSecurityDashboard,
  useUnlockAccount,
  useForceLogout,
  type SecurityDashboardTimeframe,
  type LockedAccount,
  type SuspiciousLogin,
  type CriticalEvent,
} from "@/lib/api-hooks"
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Lock,
  Unlock,
  LogOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  Eye,
  Clock,
  MapPin,
  Activity,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"

// Device type icons
const deviceIcons: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
  unknown: <Monitor className="h-4 w-4" />,
}

// Severity colors
const severityColors: Record<string, string> = {
  INFO: "#3b82f6",
  WARNING: "#f59e0b",
  CRITICAL: "#ef4444",
}

// Security score colors
function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500"
  if (score >= 60) return "text-yellow-500"
  if (score >= 40) return "text-orange-500"
  return "text-red-500"
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent"
  if (score >= 60) return "Good"
  if (score >= 40) return "Fair"
  return "Critical"
}

export function SecurityDashboardPage() {
  const [timeframe, setTimeframe] = useState<SecurityDashboardTimeframe>("24h")
  const [selectedLockedAccount, setSelectedLockedAccount] = useState<LockedAccount | null>(null)
  const [confirmUnlock, setConfirmUnlock] = useState(false)
  const [confirmForceLogout, setConfirmForceLogout] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CriticalEvent | null>(null)

  const { data, isLoading, error, refetch } = useSecurityDashboard(timeframe)
  const unlockAccount = useUnlockAccount()
  const forceLogout = useForceLogout()

  const handleUnlockAccount = async () => {
    if (!selectedLockedAccount) return
    try {
      await unlockAccount.mutateAsync(selectedLockedAccount.userId)
      setConfirmUnlock(false)
      setSelectedLockedAccount(null)
    } catch (err) {
      console.error("Failed to unlock account:", err)
    }
  }

  const handleForceLogout = async () => {
    if (!confirmForceLogout) return
    try {
      await forceLogout.mutateAsync(confirmForceLogout)
      setConfirmForceLogout(null)
    } catch (err) {
      console.error("Failed to force logout:", err)
    }
  }

  if (isLoading) {
    return <SecurityDashboardSkeleton />
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load security dashboard data</span>
          </div>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  const {
    summary,
    sessions,
    lockedAccounts,
    recentLoginAttempts,
    failedLoginTrends,
    securityLogStats,
    alerts,
    criticalEvents,
    suspiciousLogins,
    config,
  } = data

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Security Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time security monitoring and threat detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={timeframe}
            onValueChange={(v) => setTimeframe(v as SecurityDashboardTimeframe)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1 hour</SelectItem>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Security Score Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`text-5xl font-bold ${getScoreColor(summary.securityScore)}`}>
                {summary.securityScore}
              </div>
              <div className="text-sm text-muted-foreground text-center">/ 100</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Shield className={`h-5 w-5 ${getScoreColor(summary.securityScore)}`} />
                <span className="font-medium">{getScoreLabel(summary.securityScore)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Security Score
              </p>
            </div>
          </div>

          {/* Alerts Summary */}
          {alerts.length > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium">
                {alerts.length} Active Alert{alerts.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Login Success */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Successful Logins</p>
              <p className="text-2xl font-semibold">{summary.loginSuccessCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
          </div>
        </Card>

        {/* Login Failed */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed Logins</p>
              <p className="text-2xl font-semibold">{summary.loginFailedCount}</p>
              <p className="text-xs text-muted-foreground">
                {summary.failedLoginRate}% failure rate
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-500 opacity-50" />
          </div>
        </Card>

        {/* Active Sessions */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Sessions</p>
              <p className="text-2xl font-semibold">{summary.activeSessions}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500 opacity-50" />
          </div>
        </Card>

        {/* Locked Accounts */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Locked Accounts</p>
              <p className="text-2xl font-semibold">{summary.lockedAccountsCount}</p>
            </div>
            <Lock className="h-8 w-8 text-orange-500 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Security Alerts
          </h3>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      alert.severity === "CRITICAL"
                        ? "destructive"
                        : alert.severity === "WARNING"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {alert.severity}
                  </Badge>
                  <span className="text-sm">{alert.message}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {alert.count} occurrence{alert.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failed Login Trends */}
        <Card className="p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Failed Login Attempts
          </h3>
          <div className="h-[200px]">
            {failedLoginTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={failedLoginTrends}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.2}
                    name="Failed Attempts"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </Card>

        {/* Sessions by Device */}
        <Card className="p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Sessions by Device
          </h3>
          <div className="h-[200px]">
            {sessions.byDevice.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sessions.byDevice}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ type, count }) => `${type}: ${count}`}
                  >
                    {sessions.byDevice.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.type === "desktop"
                            ? "#3b82f6"
                            : entry.type === "mobile"
                            ? "#22c55e"
                            : entry.type === "tablet"
                            ? "#f59e0b"
                            : "#6b7280"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No active sessions
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Locked Accounts */}
        <Card className="p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Locked Accounts
          </h3>
          {lockedAccounts.length > 0 ? (
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {lockedAccounts.map((account) => (
                  <div
                    key={account.userId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{account.userName}</p>
                      <p className="text-xs text-muted-foreground">{account.email}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          Locked until{" "}
                          {new Date(account.lockedUntil).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLockedAccount(account)
                        setConfirmUnlock(true)
                      }}
                    >
                      <Unlock className="h-4 w-4 mr-1" />
                      Unlock
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <div className="text-center">
                <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No locked accounts</p>
              </div>
            </div>
          )}
        </Card>

        {/* Suspicious Logins */}
        <Card className="p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-yellow-500" />
            Suspicious Login Activity
            {suspiciousLogins.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {suspiciousLogins.length}
              </Badge>
            )}
          </h3>
          {suspiciousLogins.length > 0 ? (
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {suspiciousLogins.map((login) => (
                  <div
                    key={login.id}
                    className="p-3 rounded-lg bg-muted/50 border-l-2 border-yellow-500"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{login.user.name}</p>
                        <p className="text-xs text-muted-foreground">{login.user.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmForceLogout(login.userId)}
                      >
                        <LogOut className="h-4 w-4 mr-1" />
                        Force Logout
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {login.isNewDevice && (
                        <Badge variant="outline" className="text-xs">
                          New Device
                        </Badge>
                      )}
                      {login.isNewLocation && (
                        <Badge variant="outline" className="text-xs">
                          New Location
                        </Badge>
                      )}
                      {login.country && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {login.city ? `${login.city}, ` : ""}{login.country}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <div className="text-center">
                <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No suspicious activity</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Login Activity */}
      <Card className="p-4">
        <h3 className="font-medium mb-4">Recent Login Activity</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLoginAttempts.slice(0, 10).map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell>
                    {attempt.success ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{attempt.email}</TableCell>
                  <TableCell className="font-mono text-sm">{attempt.ipAddress}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(attempt.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Critical Events */}
      {criticalEvents.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            Critical Security Events
          </h3>
          <div className="space-y-2">
            {criticalEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <div>
                  <p className="font-medium text-sm">{event.event.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.userName || event.userEmail || "Unknown user"} from{" "}
                    {event.ipAddress || "Unknown IP"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(event)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Security Log Stats */}
      <Card className="p-4">
        <h3 className="font-medium mb-4">Security Events by Severity</h3>
        <div className="h-[200px]">
          {Object.keys(securityLogStats.bySeverity).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(securityLogStats.bySeverity).map(([severity, count]) => ({
                  severity,
                  count,
                }))}
              >
                <XAxis
                  dataKey="severity"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="Events"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                >
                  {Object.entries(securityLogStats.bySeverity).map(([severity], index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={severityColors[severity] || "#6b7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No security events recorded
            </div>
          )}
        </div>
      </Card>

      {/* Unlock Account Confirmation Dialog */}
      <Dialog open={confirmUnlock} onOpenChange={setConfirmUnlock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlock the account for{" "}
              <strong>{selectedLockedAccount?.userName}</strong> (
              {selectedLockedAccount?.email})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUnlock(false)}>
              Cancel
            </Button>
            <Button onClick={handleUnlockAccount} disabled={unlockAccount.isPending}>
              {unlockAccount.isPending ? "Unlocking..." : "Unlock Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Logout Confirmation Dialog */}
      <Dialog open={!!confirmForceLogout} onOpenChange={() => setConfirmForceLogout(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Logout</DialogTitle>
            <DialogDescription>
              This will revoke all active sessions for this user, forcing them to log in
              again. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmForceLogout(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceLogout}
              disabled={forceLogout.isPending}
            >
              {forceLogout.isPending ? "Logging out..." : "Force Logout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Event Type</span>
                <p className="font-medium">{selectedEvent.event.replace(/_/g, " ")}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">User</span>
                <p className="font-medium">
                  {selectedEvent.userName || selectedEvent.userEmail || "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">IP Address</span>
                <p className="font-mono">{selectedEvent.ipAddress || "Unknown"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Time</span>
                <p>{new Date(selectedEvent.createdAt).toLocaleString()}</p>
              </div>
              {selectedEvent.details && (
                <div>
                  <span className="text-sm text-muted-foreground">Details</span>
                  <ScrollArea className="h-[100px] mt-1">
                    <pre className="text-xs bg-muted p-2 rounded">
                      {JSON.stringify(selectedEvent.details, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SecurityDashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-[140px]" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      <Skeleton className="h-24 w-full" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[280px] w-full" />
        <Skeleton className="h-[280px] w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>

      <Skeleton className="h-[300px] w-full" />
    </div>
  )
}
