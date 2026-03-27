import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { LoadingService } from '../../core/services/loading.service';

export interface AccountAccess {
  id: string;
  account_id: string;
  user_id: string;
  role: 'Owner' | 'Editor' | 'Viewer';
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url: string;
  };
}

export interface AccountInvitation {
  id: string;
  account_id: string;
  sender_id: string;
  email: string;
  role: 'Editor' | 'Viewer';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SharedAccountService {
  private supabase = inject(SupabaseService).client;
  private loading = inject(LoadingService);

  accounts = signal<any[]>([]);
  members = signal<AccountAccess[]>([]);
  invitations = signal<AccountInvitation[]>([]);

  async loadAccounts() {
    try {
      this.loading.show();
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      // Fetch accounts where user is owner OR has shared access
      const { data: ownedAccounts, error: ownedError } = await this.supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);

      const { data: sharedAccess, error: sharedError } = await this.supabase
        .from('account_access')
        .select('account_id')
        .eq('user_id', user.id);

      if (ownedError) throw ownedError;
      if (sharedError) throw sharedError;

      const sharedAccountIds = (sharedAccess || []).map(a => a.account_id);
      
      let allAccounts = [...(ownedAccounts || [])];
      
      if (sharedAccountIds.length > 0) {
        const { data: sharedAccounts, error: sharedAccountsError } = await this.supabase
          .from('accounts')
          .select('*')
          .in('id', sharedAccountIds);
        
        if (sharedAccountsError) throw sharedAccountsError;
        
        // Merge and avoid duplicates
        const ownedIds = new Set(allAccounts.map(a => a.id));
        sharedAccounts?.forEach(acc => {
          if (!ownedIds.has(acc.id)) {
            allAccounts.push(acc);
          }
        });
      }

      this.accounts.set(allAccounts.sort((a, b) => (a.institution_name || '').localeCompare(b.institution_name || '')));
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      this.loading.hide();
    }
  }

  async loadAccountMembers(accountId: string) {
    try {
      this.loading.show();
      const { data, error } = await this.supabase
        .from('account_access')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('account_id', accountId);

      if (error) throw error;
      this.members.set(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      this.loading.hide();
    }
  }

  async loadPendingInvitations(accountId: string) {
    try {
      this.loading.show();
      const { data, error } = await this.supabase
        .from('account_invitations')
        .select('*')
        .eq('account_id', accountId)
        .eq('status', 'pending');

      if (error) throw error;
      this.invitations.set(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      this.loading.hide();
    }
  }

  async sendInvitation(accountId: string, email: string, role: 'Editor' | 'Viewer') {
    try {
      this.loading.show();
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('account_invitations')
        .insert([{
          account_id: accountId,
          sender_id: user.id,
          email,
          role,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      this.invitations.update(prev => [data, ...prev]);
      return { data, error: null };
    } catch (error) {
      console.error('Error sending invitation:', error);
      return { data: null, error };
    } finally {
      this.loading.hide();
    }
  }

  async updateMemberRole(accessId: string, role: 'Editor' | 'Viewer') {
    try {
      this.loading.show();
      const { error } = await this.supabase
        .from('account_access')
        .update({ role })
        .eq('id', accessId);

      if (error) throw error;
      this.members.update(prev => prev.map(m => m.id === accessId ? { ...m, role } : m));
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      this.loading.hide();
    }
  }

  async removeMember(accessId: string) {
    try {
      this.loading.show();
      const { error } = await this.supabase
        .from('account_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;
      this.members.update(prev => prev.filter(m => m.id !== accessId));
      
      // If the removed member was the current user, reload accounts as they might have lost access
      const { data: { user } } = await this.supabase.auth.getUser();
      const removedMember = this.members().find(m => m.id === accessId);
      if (user && removedMember?.user_id === user.id) {
        await this.loadAccounts();
      }
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      this.loading.hide();
    }
  }

  async cancelInvitation(inviteId: string) {
    try {
      this.loading.show();
      const { error } = await this.supabase
        .from('account_invitations')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);

      if (error) throw error;
      this.invitations.update(prev => prev.filter(i => i.id !== inviteId));
    } catch (error) {
      console.error('Error cancelling invitation:', error);
    } finally {
      this.loading.hide();
    }
  }
}
