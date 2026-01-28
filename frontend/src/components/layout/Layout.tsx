import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { HelpButton } from '../help/HelpButton';
import logoLight from '../../images/GreenShoe Light Background Logo.png';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-green-50/30 to-gray-50">
      <header className="bg-white/90 backdrop-blur-sm shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center">
                <img src={logoLight} alt="GreenShoe" className="h-8" />
              </Link>
              {user && (
                <nav className="flex space-x-4">
                  <Link
                    to="/"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === '/'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/sites"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === '/sites'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Sites
                  </Link>
                  <Link
                    to="/activity"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === '/activity'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Activity
                  </Link>
                  {user.role === 'ADMIN' && (
                    <Link
                      to="/admin/users"
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        location.pathname === '/admin/users'
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Users
                    </Link>
                  )}
                </nav>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Internal Staging Tool</span>
              {user && (
                <>
                  {/* Notification Bell */}
                  <div className="relative" ref={notificationRef}>
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">
                              No notifications yet
                            </div>
                          ) : (
                            notifications.slice(0, 10).map(notification => (
                              <div
                                key={notification.id}
                                onClick={() => !notification.read && markAsRead(notification.id)}
                                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                                  !notification.read ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 flex-shrink-0"></div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900">{notification.message}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(notification.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-sm text-gray-700">
                    {user.email}
                  </span>
                  <button
                    onClick={logout}
                    className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-sm text-gray-500 text-center">
            GreenShoe v1.0.0 - Internal Use Only
          </p>
          <p className="text-xs text-gray-400 text-center mt-1">
            One Step At A Time
          </p>
        </div>
      </footer>

      {/* Floating Help Button - appears on all pages */}
      {user && <HelpButton />}
    </div>
  );
}
