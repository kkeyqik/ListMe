'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, Clock, Link as LinkIcon } from 'lucide-react';
import { useToast, Card, Button, Badge } from '@/components/ui';
import styles from '../dashboard.module.css';

const PAGE_SIZE = 20;
const MAX_LIMIT = 100;

export default function Notifications() {
  const { showToast } = useToast();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  // The API returns the newest `limit` notifications (max 100).
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchNotifications = async (nextLimit = limit) => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/notifications?limit=${nextLimit}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotifications(data.notifications || []);
        setLimit(nextLimit);
      } else {
        setLoadError(data.message || `Notifications could not be loaded (error ${res.status}).`);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setLoadError('Notifications could not be loaded. Check your connection and try again.');
      showToast('Error', 'Failed to retrieve notification alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOlder = async () => {
    setLoadingMore(true);
    await fetchNotifications(Math.min(MAX_LIMIT, limit + PAGE_SIZE));
    setLoadingMore(false);
  };

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return; // already read
    
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
      });
      if (res.ok) {
        // Update local state list
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PUT',
      });
      if (res.ok) {
        showToast('Success', 'All notifications marked as read', 'success');
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Action failed', 'error');
      }
    } catch (err) {
      console.error('Mark all read error:', err);
      showToast('Error', 'Something went wrong', 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.welcomeText}>Notifications</h1>
          <p className={styles.subText}>Updates about your listing submissions and seeker interests.</p>
        </div>
        {hasUnread && (
          <Button
            onClick={handleMarkAllRead}
            variant="outline"
            size="sm"
            leftIcon={<Check size={16} />}
            loading={markingAll}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <Card padding="md">Loading notifications...</Card>
      ) : loadError && notifications.length === 0 ? (
        <div className={styles.errorBanner} role="alert">
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => fetchNotifications(limit)}>
            Try again
          </Button>
        </div>
      ) : notifications.length === 0 ? (
        <div className={styles.emptyState}>
          <BellOff size={48} style={{ opacity: 0.3 }} />
          <h3>No notifications yet</h3>
          <p>We will alert you here when actions are taken on your listings.</p>
        </div>
      ) : (
        <div className={styles.notificationsList}>
          {notifications.map((item) => {
            const timeString = new Date(item.createdAt).toLocaleDateString('en-IN', {
              hour: '2-digit',
              minute: '2-digit'
            });
            
            return (
              <div 
                key={item.id}
                onClick={() => handleMarkAsRead(item.id, item.isRead)}
                onKeyDown={(e) => {
                  if (!item.isRead && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleMarkAsRead(item.id, item.isRead);
                  }
                }}
                role={!item.isRead ? 'button' : undefined}
                tabIndex={!item.isRead ? 0 : undefined}
                aria-label={!item.isRead ? `Mark as read: ${item.title}` : undefined}
                className={`${styles.notificationItem} ${!item.isRead ? styles.unreadNotification : ''}`}
                style={{ cursor: !item.isRead ? 'pointer' : 'default' }}
              >
                <div style={{ 
                  color: !item.isRead ? 'var(--color-primary)' : 'var(--color-neutral-400)',
                  marginTop: '2px'
                }}>
                  <Bell size={18} />
                </div>
                
                <div className={styles.notificationText}>
                  <div className={styles.notificationTitle}>{item.title}</div>
                  <div className={styles.notificationMessage}>{item.message}</div>
                  <div className={styles.notificationTime}>
                    <Clock size={10} style={{ display: 'inline', marginRight: '2px' }} />
                    {timeString}
                  </div>
                </div>

                {item.link && (
                  <Button 
                    href={item.link} 
                    variant="ghost" 
                    size="sm" 
                    leftIcon={<LinkIcon size={12} />}
                  >
                    View
                  </Button>
                )}
              </div>
            );
          })}
          {notifications.length >= limit && limit < MAX_LIMIT && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
              <Button variant="outline" size="sm" onClick={loadOlder} loading={loadingMore}>
                Show older notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
