import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';

export interface Notification {
  id: string; // Changed to uuid
  user_id: string;
  type: 'success' | 'alert' | 'info';
  title: string;
  description: string;
  created_at: string; // Changed from time
  is_read: boolean; // DB column name
  icon: string;
  color: string;
  bg_color: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private supabase = inject(SupabaseService);

  notifications = signal<Notification[]>([]);
  unreadCount = computed(() => this.notifications().filter(n => !n.is_read).length);
  
  private subscription: any;

  constructor() {
    this.initRealtimeSubscription();
  }

  async loadNotifications() {
    const user = await this.supabase.getUser();
    if (!user) return;

    const { data, error } = await this.supabase.client
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }

    this.notifications.set(data as Notification[]);
  }

  async markAsRead(id: string) {
    const user = await this.supabase.getUser();
    if (!user) return;

    // Optimistic update
    this.notifications.update(list => list.map(n => n.id === id ? { ...n, is_read: true } : n));

    const { error } = await this.supabase.client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking notification as read:', error);
      // Revert optimistic update on error (simplified)
      this.loadNotifications();
    }
  }

  async markAllAsRead() {
    const user = await this.supabase.getUser();
    if (!user) return;

    // Optimistic update
    this.notifications.update(list => list.map(n => ({ ...n, is_read: true })));

    const { error } = await this.supabase.client
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false); // Only update unread ones

    if (error) {
      console.error('Error marking all notifications as read:', error);
      this.loadNotifications();
    }
  }

  private async initRealtimeSubscription() {
    const user = await this.supabase.getUser();
    if (!user) return;

    // Load initial data
    await this.loadNotifications();

    // Setup realtime listener for this user's notifications
    this.subscription = this.supabase.client
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          this.handleRealtimePayload(payload);
        }
      )
      .subscribe();
  }

  private handleRealtimePayload(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        this.notifications.update(list => {
          // Add to beginning and sort by date descending just to be safe
          const updated = [newRecord as Notification, ...list];
          return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });
        break;
      case 'UPDATE':
        this.notifications.update(list => 
          list.map(n => n.id === newRecord.id ? (newRecord as Notification) : n)
        );
        break;
      case 'DELETE':
        this.notifications.update(list => list.filter(n => n.id !== oldRecord.id));
        break;
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.supabase.client.removeChannel(this.subscription);
    }
  }
}
