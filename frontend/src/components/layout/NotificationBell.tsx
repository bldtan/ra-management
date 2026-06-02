import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { Notification } from '@/types';

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 10 } });
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* handled by interceptor */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const open = async (n: Notification) => {
    await api.post(`/notifications/${n.id}/read`).catch(() => {});
    if (n.link) navigate(n.link);
    load();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
          <span className="text-sm font-semibold text-slate-800">Notifications</span>
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={async () => {
              await api.post('/notifications/read-all').catch(() => {});
              load();
            }}
          >
            Mark all read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">No notifications</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={`flex w-full flex-col items-start gap-0.5 border-b border-slate-50 px-3 py-2 text-left hover:bg-slate-50 ${
                  n.isRead ? '' : 'bg-blue-50/50'
                }`}
              >
                <span className="text-sm font-medium text-slate-800">{n.title}</span>
                <span className="text-xs text-slate-500">{n.message}</span>
                <span className="text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</span>
              </button>
            ))
          )}
        </div>
        <button
          onClick={() => navigate('/notifications')}
          className="w-full border-t border-slate-100 px-3 py-2 text-center text-xs font-medium text-blue-600 hover:bg-slate-50"
        >
          View all
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
