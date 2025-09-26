'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/datetime';
import { UserRow } from './types';
import { InlineLoader } from '@/components/ui/loader';
import toast from 'react-hot-toast';

type UsersSectionProps = {
  isAdmin: boolean;
  currentUserId: string | null;
  getAccessToken: () => Promise<string | null>;
};

export function UsersSection({ isAdmin, currentUserId, getAccessToken }: UsersSectionProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userAdminUpdatingId, setUserAdminUpdatingId] = useState<string | null>(null);
  const [userAdminMessage, setUserAdminMessage] = useState<string | null>(null);
  const [userAdminError, setUserAdminError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    setUsersLoading(true);
    setUsersError(null);
    setUserAdminMessage(null);
    setUserAdminError(null);

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/admin/users?perPage=200', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      const json = await res.json();
      if (res.status === 403) {
        setUsersError('Not authorized to view users.');
        setUsers([]);
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to load users');
      const rows = Array.isArray(json.users) ? (json.users as UserRow[]) : [];
      setUsers(rows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load users';
      setUsersError(message);
      toast.error(message);
    } finally {
      setUsersLoading(false);
    }
  }, [getAccessToken, isAdmin]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateUserAdmin = useCallback(
    async (targetUser: UserRow, makeAdmin: boolean) => {
      if (!isAdmin || !targetUser?.id) return;
      if (!makeAdmin && currentUserId && targetUser.id === currentUserId) {
        setUserAdminError('You cannot remove your own admin access.');
        return;
      }

      setUserAdminUpdatingId(targetUser.id);
      setUserAdminError(null);
      setUserAdminMessage(null);

      try {
        const token = await getAccessToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ id: targetUser.id, role: makeAdmin ? 'admin' : 'user' }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to update user');

        await loadUsers();
        const email = targetUser.email || 'User';
        const message = makeAdmin ? `Granted admin access to ${email}` : `Revoked admin access from ${email}`;
        setUserAdminMessage(message);
        toast.success(message);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update user';
        setUserAdminError(message);
        toast.error(message);
      } finally {
        setUserAdminUpdatingId(null);
      }
    },
    [currentUserId, getAccessToken, isAdmin, loadUsers]
  );

  return (
    <Card className="bg-black/50 border-white/10">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-white">User Management</CardTitle>
          <CardDescription className="text-white/60">
            Manage user roles and permissions. Only admins can modify user roles.
          </CardDescription>
        </div>
        <Button
          type="button"
          onClick={loadUsers}
          className="bg-white/10 text-white border border-white/10 hover:bg-white/15"
          disabled={usersLoading}
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {usersLoading ? (
          <div className="flex justify-center py-8"><InlineLoader text="Loading users" /></div>
        ) : usersError ? (
          <div className="text-red-400">{usersError}</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <div>
                  <div className="text-white font-medium text-sm">Role-Based Access Control</div>
                  <div className="text-white/70 text-sm mt-1">
                    Admin users have full access to this dashboard including user management, server provisioning, and system configuration.
                    Regular users can only access their own servers and basic dashboard features.
                  </div>
                </div>
              </div>
            </div>

            {userAdminMessage && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="text-emerald-400 text-sm">{userAdminMessage}</div>
              </div>
            )}
            {userAdminError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <div className="text-red-400 text-sm">{userAdminError}</div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-white/60 border-b border-white/10">
                    <th className="py-3 pr-4 font-medium">Email</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Role</th>
                    <th className="py-3 pr-4 font-medium">Last Sign-In</th>
                    <th className="py-3 pr-4 font-medium">Created</th>
                    <th className="py-3 pr-4 font-medium">User ID</th>
                    <th className="py-3 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((account) => {
                    const status = account.banned
                      ? 'Banned'
                      : account.email_confirmed_at
                      ? 'Verified'
                      : 'Pending';
                    const isAdminRole = (account.role ?? 'user') === 'admin';
                    const isSelf = currentUserId != null && account.id === currentUserId;
                    const actionDisabled = userAdminUpdatingId === account.id || (isAdminRole && isSelf);
                    const buttonLabel = userAdminUpdatingId === account.id
                      ? <InlineLoader text="Updating" />
                      : isAdminRole
                      ? isSelf
                        ? 'You (Admin)'
                        : 'Revoke Admin'
                      : 'Grant Admin';

                    return (
                      <tr key={account.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-3 pr-4 text-white font-medium">{account.email}</td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant="outline"
                            className={
                              status === 'Verified'
                                ? 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10'
                                : status === 'Banned'
                                ? 'text-red-300 border-red-400/40 bg-red-500/10'
                                : 'text-yellow-300 border-yellow-400/40 bg-yellow-500/10'
                            }
                          >
                            {status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {isAdminRole ? (
                            <Badge className="bg-purple-500/20 text-purple-200 border border-purple-400/40 font-medium">
                              Administrator
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-white/70 border-white/20">
                              User
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-white/80">{formatDateTime(account.last_sign_in_at)}</td>
                        <td className="py-3 pr-4 text-white/80">{formatDateTime(account.created_at)}</td>
                        <td className="py-3 pr-4 text-white/40 font-mono text-xs">{account.id}</td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => updateUserAdmin(account, !isAdminRole)}
                              disabled={actionDisabled}
                              className={
                                (isAdminRole && !isSelf
                                  ? 'bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30'
                                  : isSelf
                                  ? 'bg-white/5 text-white/50 border border-white/10 cursor-not-allowed'
                                  : 'bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30') +
                                ' disabled:opacity-50 disabled:cursor-not-allowed'
                              }
                              title={
                                isAdminRole && isSelf
                                  ? 'You cannot modify your own admin access'
                                  : isAdminRole
                                  ? `Remove admin access for ${account.email}`
                                  : `Grant admin access to ${account.email}`
                              }
                            >
                              {buttonLabel}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td className="py-8 text-center text-white/60" colSpan={7}>
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <span className="text-white/40">👥</span>
                          </div>
                          <div>No users found</div>
                          <div className="text-xs text-white/40">Users will appear here after they sign up</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
