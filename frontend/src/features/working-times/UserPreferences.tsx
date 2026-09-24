import React, { useState, useEffect } from 'react';
import { 
  useGetMyPreferencesQuery,
  useUpdateMyPreferencesMutation
} from '../../store/apiSlice';
import { 
  Settings, 

  Clock, 
  Bell,
  X
} from 'lucide-react';
import { Select } from '../../components/ui/Select';

export const UserPreferences = () => {
  const { data: preferences, isLoading } = useGetMyPreferencesQuery();
  const [updatePreferences, { isLoading: isSaving }] = useUpdateMyPreferencesMutation();

  const [formData, setFormData] = useState({
    theme: 'light',
    timezone: 'UTC',
    dateFormat: 'DD/MM/YYYY',
    emailNotifications: true,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (preferences) {
      setFormData({
        theme: preferences.theme || 'system',
        timezone: preferences.timezone || 'UTC',
        dateFormat: preferences.dateFormat || 'DD/MM/YYYY',
        emailNotifications: preferences.emailNotifications ?? true,
      });
      setHasChanges(false);
    }
  }, [preferences]);

  const handleChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    setSaveSuccess(false);
    setSaveError(null);
    
    // Check if dirty
    if (!preferences) return;
    const isDirty = 
      newFormData.theme !== (preferences.theme || 'system') ||
      newFormData.timezone !== (preferences.timezone || 'UTC') ||
      newFormData.dateFormat !== (preferences.dateFormat || 'DD/MM/YYYY') ||
      newFormData.emailNotifications !== (preferences.emailNotifications ?? true);
      
    setHasChanges(isDirty);
  };

  const handleCancel = () => {
    if (preferences) {
      setFormData({
        theme: preferences.theme || 'system',
        timezone: preferences.timezone || 'UTC',
        dateFormat: preferences.dateFormat || 'DD/MM/YYYY',
        emailNotifications: preferences.emailNotifications ?? true,
      });
      setHasChanges(false);
      setSaveSuccess(false);
      setSaveError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;
    
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      await updatePreferences(formData).unwrap();
      setSaveSuccess(true);
      setHasChanges(false);
    } catch (err: any) {
      console.error(err);
      setSaveError(err?.data?.message || 'Failed to save preferences');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading preferences...</div>;
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 min-h-0 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-7 pb-20 animate-fadeIn">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Preferences
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Customize your Workforce experience.
          </p>
        </div>

        {saveSuccess && (
          <div className="rounded-xl bg-green-50 p-4 border border-green-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <Settings className="h-5 w-5 text-green-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Successfully updated your preferences.</p>
              </div>
            </div>
          </div>
        )}
        
        {saveError && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{saveError}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-slate-200/80 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
          
          <div className="p-6 sm:p-8 space-y-8">


            {/* Date & Time Section */}
            <section>
              <h3 className="text-base font-semibold leading-6 text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Date & Time
              </h3>
              
              <div className="pl-7 space-y-6">
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900 mb-2">Time Zone</label>
                  <Select
                    value={formData.timezone}
                    onChange={val => handleChange('timezone', val)}
                    className="w-full max-w-md"
                    options={[
                      { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
                      { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
                      { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
                      { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
                      { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
                      { value: 'Europe/London', label: 'London' },
                      { value: 'Europe/Paris', label: 'Paris' },
                      { value: 'Asia/Tokyo', label: 'Tokyo' },
                      { value: 'Asia/Kolkata', label: 'Asia/Kolkata' },
                    ]}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Your personal timezone preference for displaying dates across the platform.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900 mb-2">Date Format</label>
                  <Select
                    value={formData.dateFormat}
                    onChange={val => handleChange('dateFormat', val)}
                    className="w-full max-w-md"
                    options={[
                      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 31/12/2026)' },
                      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 12/31/2026)' },
                      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2026-12-31)' },
                    ]}
                  />
                </div>
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Notifications Section */}
            <section>
              <h3 className="text-base font-semibold leading-6 text-slate-900 mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-slate-400" />
                Notifications
              </h3>
              
              <div className="pl-7">
                <div className="flex items-center justify-between py-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-6 text-slate-900">Email Notifications</span>
                    <span className="text-xs text-slate-500">Receive important updates and alerts via email. Note: this preference will be enforced once email events are implemented.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('emailNotifications', !formData.emailNotifications)}
                    className={`${
                      formData.emailNotifications ? 'bg-slate-900' : 'bg-slate-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2`}
                    role="switch"
                    aria-checked={formData.emailNotifications}
                  >
                    <span
                      aria-hidden="true"
                      className={`${
                        formData.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-end gap-3 border-t border-slate-200/80">
            <button
              type="button"
              onClick={handleCancel}
              disabled={!hasChanges || isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasChanges || isSaving}
              className="inline-flex items-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSaving && <Clock className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
