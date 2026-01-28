import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Spinner } from '../components/common/Spinner';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface Site {
  id: string;
  name: string;
  slug: string;
}

interface BackupSchedule {
  scheduled: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  nextRun?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9090/api';

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export function BackupSettings() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [site, setSite] = useState<Site | null>(null);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Form state
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [time, setTime] = useState('02:00');
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [dayOfMonth, setDayOfMonth] = useState(1);

  // Access control check
  if (user?.role !== 'PROJECT_MANAGER' && user?.role !== 'ADMIN') {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You must be a Project Manager or Administrator to manage backups.</p>
        </div>
      </Layout>
    );
  }

  useEffect(() => {
    if (siteId) {
      loadSite();
      loadSchedule();
    }
  }, [siteId]);

  const loadSite = async () => {
    try {
      const response = await axios.get(`${API_URL}/sites/${siteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSite(response.data);
    } catch (err: any) {
      console.error('Failed to load site:', err);
      setError(err.response?.data?.message || 'Failed to load site');
    }
  };

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/sites/${siteId}/backup/schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSchedule(response.data);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setSchedule({ scheduled: false });
      } else {
        setError(err.response?.data?.message || 'Failed to load backup schedule');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const data: any = { frequency, time };
      if (frequency === 'weekly') data.dayOfWeek = dayOfWeek;
      if (frequency === 'monthly') data.dayOfMonth = dayOfMonth;

      await axios.post(
        `${API_URL}/sites/${siteId}/backup/schedule`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage(`Backup scheduled successfully! Backups will run ${frequency} at ${time}.`);
      setShowScheduleModal(false);
      await loadSchedule();

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to schedule backup');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnschedule = async () => {
    if (!window.confirm('Remove backup schedule? This will stop automatic backups.')) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');

      await axios.delete(
        `${API_URL}/sites/${siteId}/backup/schedule`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage('Backup schedule removed successfully.');
      await loadSchedule();

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove backup schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualBackup = async () => {
    if (!window.confirm('Trigger a manual backup now? This will create an archive of the current staging site.')) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');

      await axios.post(
        `${API_URL}/sites/${siteId}/backup`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage('Manual backup started! Check the Activity Logs for progress.');

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to trigger manual backup');
    } finally {
      setSubmitting(false);
    }
  };

  const formatSchedule = () => {
    if (!schedule || !schedule.scheduled) return 'Not scheduled';

    let scheduleText = '';
    switch (schedule.frequency) {
      case 'daily':
        scheduleText = `Daily at ${schedule.time}`;
        break;
      case 'weekly':
        scheduleText = `Weekly on ${DAYS_OF_WEEK[schedule.dayOfWeek || 0]} at ${schedule.time}`;
        break;
      case 'monthly':
        scheduleText = `Monthly on day ${schedule.dayOfMonth} at ${schedule.time}`;
        break;
    }

    if (schedule.nextRun) {
      scheduleText += ` (Next: ${new Date(schedule.nextRun).toLocaleString()})`;
    }

    return scheduleText;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/sites')}
              className="text-sm text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Sites
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Backup Settings {site && `- ${site.name}`}
            </h1>
          </div>
          <button
            onClick={loadSchedule}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Automatic Backup Scheduling</p>
              <p>Schedule automatic backups to create archive versions of your site at regular intervals. Manual backups can be triggered anytime.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white shadow rounded-lg p-12 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Current Schedule Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Current Schedule</h2>
                {schedule?.scheduled ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">
                    Not Scheduled
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Schedule</p>
                    <p className="text-lg text-gray-900">{formatSchedule()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                {schedule?.scheduled ? (
                  <>
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Update Schedule
                    </button>
                    <button
                      onClick={handleUnschedule}
                      disabled={submitting}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      Remove Schedule
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Schedule Backups
                  </button>
                )}
              </div>
            </div>

            {/* Manual Backup Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Manual Backup</h2>
              <p className="text-sm text-gray-600 mb-6">
                Trigger a one-time backup immediately. This will create an archive version of the current staging site.
              </p>
              <button
                onClick={handleManualBackup}
                disabled={submitting}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                {submitting ? 'Starting...' : 'Backup Now'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Schedule Backup Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {schedule?.scheduled ? 'Update Backup Schedule' : 'Schedule Automatic Backups'}
            </h3>

            <form onSubmit={handleScheduleBackup} className="space-y-4">
              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Server timezone (UTC)</p>
              </div>

              {/* Day of Week (for weekly) */}
              {frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day of Week
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {DAYS_OF_WEEK.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Day of Month (for monthly) */}
              {frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day of Month
                  </label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    For months with fewer days, the backup will run on the last day
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Spinner />
                      Saving...
                    </>
                  ) : (
                    'Save Schedule'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
