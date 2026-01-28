import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface OperationProgress {
  siteId: string;
  operation: string;
  progress: number | null;
  message: string;
  timestamp: string;
}

type NotificationCallback = (notification: Notification) => void;

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  toasts: ToastNotification[];
  operationProgress: Record<string, OperationProgress>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  dismissToast: (id: string) => void;
  subscribeToNotifications: (callback: NotificationCallback) => () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9090';
const WS_URL = API_BASE_URL.replace('/api', '');

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [operationProgress, setOperationProgress] = useState<Record<string, OperationProgress>>({});
  const subscribersRef = useRef<Set<NotificationCallback>>(new Set());

  // Subscribe to notification events (for triggering refetches, etc.)
  const subscribeToNotifications = useCallback((callback: NotificationCallback) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  // Initialize Socket.IO connection when user logs in
  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      return;
    }

    // Connect to Socket.IO with auth token
    const newSocket = io(WS_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    newSocket.on('notification', (notification: Notification) => {
      console.log('New notification received:', notification);

      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);

      // Show toast
      const toastType = notification.type.includes('SUCCESS') ? 'success' :
                        notification.type.includes('FAILURE') || notification.type.includes('ERROR') ? 'error' :
                        'info';

      const toast: ToastNotification = {
        id: notification.id,
        type: toastType,
        message: notification.message
      };

      setToasts(prev => [...prev, toast]);

      // Auto-dismiss toast after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 5000);

      // Notify all subscribers (for triggering refetches, etc.)
      subscribersRef.current.forEach(callback => {
        try {
          callback(notification);
        } catch (err) {
          console.error('Error in notification subscriber:', err);
        }
      });
    });

    newSocket.on('operation-progress', (progress: OperationProgress) => {
      console.log('Operation progress:', progress);
      setOperationProgress(prev => ({
        ...prev,
        [progress.siteId]: progress
      }));

      // Clear progress after URL rewriting completes (progress is 100%)
      if (progress.progress === 100) {
        setTimeout(() => {
          setOperationProgress(prev => {
            const next = { ...prev };
            delete next[progress.siteId];
            return next;
          });
        }, 3000); // Keep it visible for 3 seconds after completion
      }
    });

    setSocket(newSocket);

    // Load existing notifications
    loadNotifications();

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  const loadNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Update all unread notifications
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);

      await Promise.all(unreadIds.map(id =>
        fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ));

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      toasts,
      operationProgress,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      dismissToast,
      subscribeToNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
