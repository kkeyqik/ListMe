'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, Clock, Link as LinkIcon } from 'lucide-react';
import { useToast, Card, Button, Badge } from '@/components/ui';
import styles from '../dashboard.module.css';

export default function Notifications() {
  const { showToast } = useToast();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      showToast('Error', 'Failed to retrieve notification alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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
          <p className={styles.subText}>Stay updated on review approvals, listing views, and seeker interests.</p>
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
        </div>
      )}
    </div>
  );
}
