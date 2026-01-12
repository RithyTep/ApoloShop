"use client";

import { useState } from "react";
import {
  useSessions,
  useRevokeSession,
  useRevokeAllSessions,
  UserSession,
} from "@/lib/api-hooks";
import { translations, Language } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  LogOut,
  Shield,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface ActiveSessionsProps {
  language?: Language;
}

const deviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Globe,
};

function formatRelativeTime(dateString: string, lang: Language): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  const t = translations[lang === "EN" ? "en" : "kh"].sessions;

  if (diffMins < 1) {
    return t.justNow;
  } else if (diffMins < 60) {
    return `${diffMins} ${t.minutesAgo}`;
  } else if (diffHours < 24) {
    return `${diffHours} ${t.hoursAgo}`;
  } else {
    return `${diffDays} ${t.daysAgo}`;
  }
}

function SessionCard({
  session,
  language,
  onRevoke,
  isRevoking,
}: {
  session: UserSession;
  language: Language;
  onRevoke: () => void;
  isRevoking: boolean;
}) {
  const t = translations[language === "EN" ? "en" : "kh"].sessions;
  const DeviceIcon = deviceIcons[session.deviceType] || Globe;

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border ${
        session.isCurrent ? "border-primary bg-primary/5" : "bg-background"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-2 rounded-lg ${
            session.isCurrent ? "bg-primary/10 text-primary" : "bg-muted"
          }`}
        >
          <DeviceIcon className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{session.deviceName}</span>
            {session.isCurrent && (
              <Badge variant="default" className="text-xs">
                {t.currentSession}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {session.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(session.lastActive, language)}
            </span>
          </div>
        </div>
      </div>

      {!session.isCurrent && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isRevoking}>
              <LogOut className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.revokeSessionTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.revokeSessionDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={onRevoke}>
                {t.revoke}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function SessionsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}

export function ActiveSessions({ language = "EN" }: ActiveSessionsProps) {
  const t = translations[language === "EN" ? "en" : "kh"].sessions;
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useSessions();
  const revokeSession = useRevokeSession();
  const revokeAllSessions = useRevokeAllSessions();

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await revokeSession.mutateAsync(sessionId);
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    const currentSession = data?.sessions.find((s) => s.isCurrent);
    await revokeAllSessions.mutateAsync(currentSession?.id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t.title}
          </CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {t.error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sessions = data?.sessions || [];
  const stats = data?.stats;
  const hasOtherSessions = sessions.filter((s) => !s.isCurrent).length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t.title}
            </CardTitle>
            <CardDescription className="mt-1">
              {t.description}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {hasOtherSessions && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={revokeAllSessions.isPending}
                  >
                    {t.logOutAllDevices}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.logOutAllTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.logOutAllDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRevokeAllSessions}
                      className="bg-destructive text-destructive-foreground"
                    >
                      {t.logOutAll}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats summary */}
        {stats && stats.totalActive > 1 && (
          <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50 text-sm">
            <span className="text-muted-foreground">{t.activeSessions}:</span>
            <Badge variant="secondary">{stats.totalActive}</Badge>
            {stats.deviceTypes.map((dt) => (
              <span key={dt.type} className="flex items-center gap-1 text-muted-foreground">
                {deviceIcons[dt.type] && (() => {
                  const Icon = deviceIcons[dt.type];
                  return <Icon className="h-3 w-3" />;
                })()}
                {dt.count}
              </span>
            ))}
          </div>
        )}

        {/* Session list */}
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t.noSessions}
            </div>
          ) : (
            sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                language={language}
                onRevoke={() => handleRevokeSession(session.id)}
                isRevoking={revokingId === session.id}
              />
            ))
          )}
        </div>

        {/* Security tip */}
        {hasOtherSessions && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <span className="text-amber-700 dark:text-amber-400">
                {t.securityTip}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActiveSessions;
