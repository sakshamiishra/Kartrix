import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { Users, ShieldCheck, ShieldAlert, UserCheck, UserX, Search, AlertCircle, CheckCircle2, X } from 'lucide-react';

export function AdminUserListPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal & Feedback state
  const [confirmModal, setConfirmModal] = useState({ open: false, targetUser: null, action: null });
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers();
      setUsers(data.results || data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      showFeedback('Failed to load user directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback({ message: '', type: '' });
    }, 4000);
  };

  const openConfirmation = (u, action) => {
    if (!currentUser?.is_superuser) {
      showFeedback('Superuser authorization required to modify staff privileges.', 'error');
      return;
    }
    setConfirmModal({ open: true, targetUser: u, action });
  };

  const executeToggleStaff = async () => {
    const { targetUser, action } = confirmModal;
    if (!targetUser) return;

    try {
      setSubmitting(true);
      await adminApi.toggleStaff(targetUser.id);
      
      const successMsg = action === 'grant'
        ? `Successfully granted Staff access to ${targetUser.email}.`
        : `Successfully revoked Staff access from ${targetUser.email}.`;
      
      showFeedback(successMsg, 'success');
      setConfirmModal({ open: false, targetUser: null, action: null });
      fetchUsers();
    } catch (err) {
      showFeedback(err.response?.data?.detail || 'Failed to update staff status.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.first_name && u.first_name.toLowerCase().includes(search.toLowerCase())) ||
      (u.last_name && u.last_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          User Directory & Staff Access Management
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          View registered customer accounts and manage staff operator privileges (Superuser authority only).
        </p>
      </div>

      {/* Feedback Alert Banner */}
      {feedback.message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-sm border transition-all ${
            feedback.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {feedback.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ message: '', type: '' })}
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-[#121315] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:border-orange-500 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500 dark:text-gray-400 font-medium">
            Showing <strong className="text-gray-900 dark:text-white">{filteredUsers.length}</strong> of {users.length} users
          </span>

          {!currentUser?.is_superuser && (
            <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900">
              <ShieldAlert className="w-4 h-4" /> Superuser authority required
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#121315] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No matching users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-[#1A1C1E] text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">User / Email</th>
                  <th className="px-5 py-3.5">Joined Date</th>
                  <th className="px-5 py-3.5">Current Role</th>
                  <th className="px-5 py-3.5 text-right">Staff Privilege Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : 'Customer Account'}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">{u.email}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {new Date(u.date_joined).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      {u.is_superuser ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Superuser
                        </span>
                      ) : u.is_staff ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Staff Admin
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                          Customer
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {u.id === currentUser?.id ? (
                        <span className="text-xs font-medium text-gray-400 italic">Self (Current User)</span>
                      ) : u.is_superuser ? (
                        <span className="text-xs font-medium text-gray-400 italic">Superuser (Locked)</span>
                      ) : (
                        <button
                          onClick={() => openConfirmation(u, u.is_staff ? 'revoke' : 'grant')}
                          disabled={!currentUser?.is_superuser}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                            u.is_staff
                              ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {u.is_staff ? (
                            <>
                              <UserX className="w-3.5 h-3.5" /> Revoke Staff
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" /> Make Staff
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && confirmModal.targetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#17191B] rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  confirmModal.action === 'grant'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                }`}
              >
                {confirmModal.action === 'grant' ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {confirmModal.action === 'grant' ? 'Grant Staff Access' : 'Revoke Staff Access'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Confirm privilege modification</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              {confirmModal.action === 'grant' ? (
                <>
                  Are you sure you want to promote <strong className="text-gray-900 dark:text-white">{confirmModal.targetUser.email}</strong> to Staff? They will gain access to the Kartrix Admin Panel using their existing account credentials.
                </>
              ) : (
                <>
                  Are you sure you want to revoke Staff access from <strong className="text-gray-900 dark:text-white">{confirmModal.targetUser.email}</strong>? They will immediately lose access to the Kartrix Admin Panel.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ open: false, targetUser: null, action: null })}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeToggleStaff}
                disabled={submitting}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-sm ${
                  confirmModal.action === 'grant'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                } disabled:opacity-50 flex items-center gap-2`}
              >
                {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{confirmModal.action === 'grant' ? 'Confirm Make Staff' : 'Confirm Revoke Staff'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserListPage;

