import { useState, useEffect } from 'react';
import { X, User, Lock, Mail, BadgeCheck, ShieldAlert, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useUpdateProfileMutation, useChangePasswordMutation } from '../../store/apiSlice';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useDispatch } from 'react-redux';
import { setEmployee } from '../../store/slices/authSlice';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const { employee } = useCurrentEmployee();
  const { showToast } = useToast();
  const dispatch = useDispatch();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (isOpen && employee) {
      setName(employee.name || '');
      setEmail(employee.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('profile');
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Name is required', 'error');
    if (!email.trim()) return showToast('Email is required', 'error');

    try {
      const result = await updateProfile({ name: name.trim(), email: email.trim() }).unwrap();
      showToast('Profile updated successfully', 'success');
      
      // Update local state to reflect changes instantly (though a refresh of /auth/me would also work, we can just patch it)
      if (result.data) {
         dispatch(setEmployee({ ...employee, ...result.data }));
      }
      onClose();
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to update profile', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) return showToast('Current password is required', 'error');
    if (newPassword.length < 8) return showToast('New password must be at least 8 characters', 'error');
    if (newPassword !== confirmPassword) return showToast('Passwords do not match', 'error');

    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      showToast('Password changed successfully', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to change password', 'error');
    }
  };

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Your Profile</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-6 pt-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors mr-6 ${
              activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'password' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Change Password
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {activeTab === 'profile' ? (
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold font-mono shadow-sm">
                  {getInitials(employee.name)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{employee.name}</h3>
                  <p className="text-sm text-slate-500">{employee.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Employee ID</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-600">
                    <BadgeCheck className="w-4 h-4 text-slate-400" />
                    {employee.employeeCode}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-600">
                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                    {employee.role || employee.roles?.[0] || 'EMPLOYEE'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                    placeholder="Enter your email"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">Updating your email will also update your UMS login credential.</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isUpdatingProfile ? 'Saving...' : <><Check className="w-4 h-4" /> Save Profile</>}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                    placeholder="Enter current password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
