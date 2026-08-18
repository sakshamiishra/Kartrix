import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import { useToast } from '../context/ToastContext';

export const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await updateProfile(profileData);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Error updating profile:', err);
      showToast('Failed to update profile details.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.new_password_confirm) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      await authApi.changePassword(passwordData);
      showToast('Password changed successfully!', 'success');
      setPasswordData({ old_password: '', new_password: '', new_password_confirm: '' });
    } catch (err) {
      console.error('Error changing password:', err);
      showToast(err.response?.data?.old_password?.[0] || 'Failed to change password.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div className="pb-4 border-b border-gray-100 dark:border-[#2A2D32]">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Customer Profile
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Manage your personal account details and security settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Profile Card */}
        <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Personal Information</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Update your name and phone number</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Email Address (Read Only)
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-100 dark:bg-[#0F1011] border border-transparent dark:border-[#2A2D32] rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={profileData.last_name}
                  onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {profileLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Security & Password</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Update your current account password</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Current Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordData.old_password}
                onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordData.new_password_confirm}
                onChange={(e) => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-2.5 bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {passwordLoading ? (
                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
