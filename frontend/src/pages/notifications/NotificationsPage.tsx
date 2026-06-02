import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useFetch } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { Notification } from '@/types';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useFetch<{ items: Notification[]; unread: number }>(
    '/notifications',
  );

  const open = async (n: Notification) => {
    await api.post(`/notifications/${n.id}/read`).catch(() => {});
    if (n.link) navigate(n.link);
    else refetch();
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          <Button
            variant="secondary"
            onClick={async () => {
              await api.post('/notifications/read-all').catch(() => {});
              refetch();
            }}
          >
            Mark all read
          </Button>
        }
      />
      <Card>
        {loading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
        ) : (
          <div className="divide-y divide-slate-100">
            {data!.items.map((n) => (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={`flex w-full flex-col items-start gap-0.5 px-6 py-4 text-left hover:bg-slate-50 ${
                  n.isRead ? '' : 'bg-blue-50/40'
                }`}
              >
                <span className="text-sm font-medium text-slate-800">{n.title}</span>
                <span className="text-sm text-slate-500">{n.message}</span>
                <span className="text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
