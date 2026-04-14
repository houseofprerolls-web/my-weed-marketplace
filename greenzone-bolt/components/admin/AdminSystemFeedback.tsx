'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export type AdminActivityItem = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string | null;
  createdAt: string;
  severity: 'info' | 'warning';
};

type Props = {
  activityFeed: AdminActivityItem[];
  unreadWarnings: number;
  notificationHint?: string;
};

const LS_ACTIVITY_COLLAPSED = 'greenzone.admin.activityFeed.collapsed';
const SS_WARNINGS_DISMISSED = 'greenzone.admin.notifications.dismissed';

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function AdminSystemFeedback({ activityFeed, unreadWarnings, notificationHint }: Props) {
  const [activityCollapsed, setActivityCollapsed] = useState(false);
  const [activityHydrated, setActivityHydrated] = useState(false);
  const [warningsDismissed, setWarningsDismissed] = useState(false);
  const [warningsHydrated, setWarningsHydrated] = useState(false);
  const [activityCleared, setActivityCleared] = useState(false);

  useEffect(() => {
    try {
      setActivityCollapsed(localStorage.getItem(LS_ACTIVITY_COLLAPSED) === '1');
    } catch {
      /* ignore */
    }
    setActivityHydrated(true);
  }, []);

  useEffect(() => {
    try {
      setWarningsDismissed(sessionStorage.getItem(SS_WARNINGS_DISMISSED) === '1');
    } catch {
      /* ignore */
    }
    setWarningsHydrated(true);
  }, []);

  const persistActivityCollapsed = useCallback((collapsed: boolean) => {
    setActivityCollapsed(collapsed);
    try {
      localStorage.setItem(LS_ACTIVITY_COLLAPSED, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setWarningsDismissed(true);
    try {
      sessionStorage.setItem(SS_WARNINGS_DISMISSED, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const clearActivityFeed = useCallback(() => {
    setActivityCleared(true);
  }, []);

  const feedFingerprint = useMemo(() => activityFeed.map((i) => i.id).join('\0'), [activityFeed]);
  const prevFingerprint = useRef(feedFingerprint);

  useEffect(() => {
    if (prevFingerprint.current !== feedFingerprint) {
      prevFingerprint.current = feedFingerprint;
      setActivityCleared(false);
    }
  }, [feedFingerprint]);

  const visibleFeed = activityCleared ? [] : activityFeed;
  const showWarningCallout = warningsHydrated && !warningsDismissed && unreadWarnings > 0;
  const canClearActivity = activityFeed.length > 0 && !activityCleared;

  return (
    <aside className="max-w-full space-y-4 overflow-x-hidden" aria-label="System feedback and activity">
      <Card className="overflow-hidden border-zinc-800 bg-zinc-900/60 p-4 ring-1 ring-zinc-800/80">
        <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
            <h2 className="text-sm font-semibold text-white">Notifications</h2>
          </div>
          {warningsHydrated && !warningsDismissed && unreadWarnings > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 text-xs text-zinc-400 hover:text-white"
              onClick={clearNotifications}
              title="Hide moderation alert for this browser session"
            >
              Clear
            </Button>
          ) : warningsHydrated && warningsDismissed ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 text-xs text-zinc-500 hover:text-zinc-300"
              onClick={() => {
                setWarningsDismissed(false);
                try {
                  sessionStorage.removeItem(SS_WARNINGS_DISMISSED);
                } catch {
                  /* ignore */
                }
              }}
            >
              Show alerts
            </Button>
          ) : null}
        </div>
        {warningsHydrated && warningsDismissed && unreadWarnings > 0 ? (
          <p className="mt-3 text-xs text-zinc-500">
            Moderation alerts hidden for this session ({unreadWarnings} still open). Refresh the dashboard to reset, or
            use <span className="text-zinc-400">Show alerts</span> above.
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">
            {notificationHint ??
              'Summary counts update when you load the dashboard. Use Priority queue for quick actions.'}
          </p>
        )}
        {showWarningCallout ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-800/50 bg-amber-950/40 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
            <div>
              <p className="text-sm font-medium text-amber-100">Moderation warnings</p>
              <p className="text-xs text-amber-200/80">
                {unreadWarnings} open {unreadWarnings === 1 ? 'item' : 'items'} need attention (reports + review flags).
              </p>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden border-zinc-800 bg-zinc-900/60 ring-1 ring-zinc-800/80">
        <div className="flex items-start justify-between gap-2 border-b border-zinc-800 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">Activity feed</h2>
            <p className="text-xs text-zinc-500">Recent platform events</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-zinc-400 hover:text-white"
              onClick={clearActivityFeed}
              disabled={!canClearActivity}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={() => persistActivityCollapsed(!activityCollapsed)}
              aria-expanded={activityHydrated ? !activityCollapsed : true}
              aria-controls="admin-activity-feed-list"
              title={activityCollapsed ? 'Expand activity feed' : 'Minimize activity feed'}
            >
              {activityHydrated && activityCollapsed ? (
                <ChevronDown className="h-4 w-4" aria-hidden />
              ) : (
                <ChevronUp className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>
        {activityHydrated && activityCollapsed ? (
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <p className="text-xs text-zinc-500">
              {visibleFeed.length === 0
                ? activityCleared
                  ? 'Cleared — reload dashboard for new events'
                  : 'No events'
                : `${visibleFeed.length} ${visibleFeed.length === 1 ? 'event' : 'events'} · minimized`}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-zinc-700 text-xs text-zinc-300"
              onClick={() => persistActivityCollapsed(false)}
            >
              Expand
            </Button>
          </div>
        ) : (
          <ul
            id="admin-activity-feed-list"
            className="max-h-[min(28rem,50vh)] divide-y divide-zinc-800/80 overflow-x-hidden overflow-y-auto overscroll-contain px-0"
          >
            {visibleFeed.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">
                {activityCleared ? 'Feed cleared. Refresh the dashboard to load the latest activity.' : 'No recent activity yet.'}
              </li>
            ) : (
              visibleFeed.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex w-full min-w-0 items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100" title={item.title}>
                        {item.title}
                      </p>
                      {item.subtitle ? (
                        <p
                          className="mt-0.5 line-clamp-3 break-words text-xs leading-snug text-zinc-400 [overflow-wrap:anywhere]"
                          title={item.subtitle}
                        >
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex w-20 shrink-0 flex-col items-end gap-1 sm:w-24">
                      <span className="max-w-full text-right text-[10px] text-zinc-500 tabular-nums">
                        {formatTime(item.createdAt)}
                      </span>
                      {item.severity === 'warning' ? (
                        <Badge className="border-amber-600/40 bg-amber-950/60 text-[10px] text-amber-200">Alert</Badge>
                      ) : (
                        <Badge variant="outline" className="border-zinc-600 text-[10px] text-zinc-400">
                          Info
                        </Badge>
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </Card>
    </aside>
  );
}
