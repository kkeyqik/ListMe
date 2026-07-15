'use client';

import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Shield, User, Mail, Phone } from 'lucide-react';
import { useToast, Card, Badge, Input, Button, Modal } from '@/components/ui';
import styles from '../admin.module.css';

export default function AdminUsers() {
  const { showToast } = useToast();
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Add User Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('USER');
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [createLoading, setCreateLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast('Error', 'Failed to load user directory logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim() || !newEmail.trim()) {
      showToast('Error', 'Please fill in all required fields', 'error');
      return;
    }
    
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          email: newEmail,
          role: newRole,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Success', 'New user/admin added successfully', 'success');
        setUsers((prev) => [data.profile, ...prev]);
        setAddModalOpen(false);
        // Reset fields
        setNewName('');
        setNewPhone('');
        setNewEmail('');
        setNewRole('USER');
        setNewStatus('ACTIVE');
      } else {
        showToast('Error', data.message || 'Failed to create user', 'error');
      }
    } catch (err) {
      console.error('Create user error:', err);
      showToast('Error', 'Something went wrong', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateUser = async (id: string, updates: { role?: string; phoneVerified?: boolean; status?: string }) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Success', 'User profile updated successfully', 'success');
        // Update user locally
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, ...data.profile } : u))
        );
      } else {
        showToast('Error', data.message || 'Failed to update user', 'error');
      }
    } catch (err) {
      console.error('Update user error:', err);
      showToast('Error', 'Something went wrong', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter users by search query and role selection
  const filteredUsers = users.filter((u) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(searchLower) ||
      (u.email || '').toLowerCase().includes(searchLower) ||
      (u.phone || '').toLowerCase().includes(searchLower);
      
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div>
      {/* Header */}
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className={styles.title}>Registered Users Directory</h1>
          <p className={styles.subText}>Manage account details, verify statuses, and monitor active listings per user.</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} variant="primary" leftIcon={<User size={18} />}>
          Add User / Admin
        </Button>
      </div>

      {/* Toolbar filters */}
      <Card padding="md" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1', minWidth: '260px' }}>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name, email, or phone number..."
              leftIcon={<Search size={18} />}
              fullWidth
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Filter size={18} style={{ color: 'var(--color-text-secondary)' }} />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-neutral-300)',
                background: '#fff',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              <option value="ALL">All Roles</option>
              <option value="USER">Regular Users</option>
              <option value="ADMIN">Administrators</option>
              <option value="SUPER_ADMIN">Super Admins</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table List */}
      {loading ? (
        <Card padding="md">Loading user database...</Card>
      ) : filteredUsers.length === 0 ? (
        <div className={styles.emptyState}>
          <Users size={48} style={{ opacity: 0.3 }} />
          <h3>No user profiles found</h3>
          <p>Try modifying your keyword search or role filter.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>User Details</th>
                <th className={styles.th}>Contact details</th>
                <th className={styles.th}>Role</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Properties Listed</th>
                <th className={styles.th}>Interests Expressed</th>
                <th className={styles.th}>Verification</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((userItem) => (
                <tr key={userItem.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: 'var(--radius-full)', 
                          background: userItem.role !== 'USER' ? 'var(--color-secondary-fade)' : 'var(--color-primary-fade)',
                          color: userItem.role !== 'USER' ? 'var(--color-secondary)' : 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {userItem.role !== 'USER' ? <Shield size={16} /> : <User size={16} />}
                      </div>
                      <div>
                        <div className={styles.titleText}>{userItem.name || 'Anonymous User'}</div>
                        <div className={styles.subTextInfo}>Registered: {new Date(userItem.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div style={{ fontWeight: 600 }}>{userItem.phone || 'No phone'}</div>
                    <div className={styles.subTextInfo}>{userItem.email}</div>
                  </td>
                  <td className={styles.td}>
                    <select
                      value={userItem.role}
                      onChange={(e) => handleUpdateUser(userItem.id, { role: e.target.value })}
                      disabled={updatingId === userItem.id || userItem.role === 'SUPER_ADMIN'}
                      style={{
                        padding: '0.375rem 0.625rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        background: '#fff',
                        fontSize: '0.812rem',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 600,
                        cursor: userItem.role === 'SUPER_ADMIN' ? 'not-allowed' : 'pointer',
                        minHeight: '34px',
                        outline: 'none',
                        color: 'var(--color-primary-light)'
                      }}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                      {userItem.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">SUPER ADMIN</option>}
                    </select>
                  </td>
                  <td className={styles.td}>
                    <select
                      value={userItem.status}
                      onChange={(e) => handleUpdateUser(userItem.id, { status: e.target.value })}
                      disabled={updatingId === userItem.id}
                      style={{
                        padding: '0.375rem 0.625rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        background: '#fff',
                        fontSize: '0.812rem',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        minHeight: '34px',
                        outline: 'none',
                        color: userItem.status === 'ACTIVE' ? 'var(--color-success)' : userItem.status === 'SUSPENDED' ? 'var(--color-warning)' : 'var(--color-error)'
                      }}
                    >
                      <option value="ACTIVE" style={{ color: 'var(--color-success)' }}>ACTIVE</option>
                      <option value="SUSPENDED" style={{ color: 'var(--color-warning)' }}>SUSPENDED</option>
                      <option value="BANNED" style={{ color: 'var(--color-error)' }}>BANNED</option>
                    </select>
                  </td>
                  <td className={styles.td} style={{ fontWeight: 600 }}>
                    {userItem._count?.listings || 0} listings
                  </td>
                  <td className={styles.td} style={{ fontWeight: 600 }}>
                    {userItem._count?.interests || 0} responses
                  </td>
                  <td className={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Badge variant={userItem.phoneVerified ? 'success' : 'warning'} size="sm">
                        {userItem.phoneVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                      <Button
                        onClick={() => handleUpdateUser(userItem.id, { phoneVerified: !userItem.phoneVerified })}
                        disabled={updatingId === userItem.id}
                        variant="outline"
                        size="sm"
                        style={{ padding: '0.125rem 0.375rem', minHeight: '26px', fontSize: '0.75rem', border: '1px solid var(--color-border)' }}
                      >
                        {userItem.phoneVerified ? 'Unverify' : 'Verify'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Add User Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add User / Admin Account" size="md">
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.25rem' }}>
          <Input
            label="Full Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="E.g. Rajesh Kumar"
            leftIcon={<User size={18} />}
            required
            disabled={createLoading}
            fullWidth
          />

          <Input
            label="Mobile Number"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="10-digit phone number (e.g. 9876543210)"
            leftIcon={<Phone size={18} />}
            required
            disabled={createLoading}
            fullWidth
          />

          <Input
            label="Email Address"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@example.com"
            leftIcon={<Mail size={18} />}
            required
            disabled={createLoading}
            fullWidth
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-neutral-700)', fontFamily: 'var(--font-heading)' }}>Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                disabled={createLoading}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: '#fff',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  fontSize: '0.937rem',
                  cursor: 'pointer',
                  minHeight: '44px',
                  outline: 'none'
                }}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER ADMIN</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-neutral-700)', fontFamily: 'var(--font-heading)' }}>Account Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={createLoading}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: '#fff',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  fontSize: '0.937rem',
                  cursor: 'pointer',
                  minHeight: '44px',
                  outline: 'none'
                }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="BANNED">BANNED</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)} disabled={createLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={createLoading}>
              Add User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
