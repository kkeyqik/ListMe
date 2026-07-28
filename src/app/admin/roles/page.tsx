'use client';

import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, UserPlus, Search, Edit2, Settings, Users, Building2 } from 'lucide-react';
import { useToast, Card, Badge, Input, Button, Modal } from '@/components/ui';
import styles from '../admin.module.css';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function RoleManager() {
  const { showToast } = useToast();
  const { profile } = useAuth();
  const router = useRouter();
  
  const [admins, setAdmins] = useState<any[]>([]);
  const [regularUsers, setRegularUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  
  // Form State
  const [role, setRole] = useState('ADMIN');
  const [status, setStatus] = useState('ACTIVE');
  const [permissions, setPermissions] = useState({
    seo: false,
    blogs: false,
    users: false,
    listings: false,
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  // Add Admin Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'SUPER_ADMIN') {
      router.push('/admin');
      showToast('Error', 'Only Super Admins can access the Role Manager', 'error');
    } else if (profile && profile.role === 'SUPER_ADMIN') {
      fetchRoles();
    }
  }, [profile, router]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (res.ok) {
        setAdmins(data.admins || []);
        setRegularUsers(data.regularUsers || []);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      showToast('Error', 'Failed to load roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (admin: any) => {
    setEditingAdmin(admin);
    setRole(admin.role);
    setStatus(admin.status);
    
    // Parse permissions from roleMetadata
    const currentPerms = admin.roleMetadata?.permissions || {
      seo: false,
      blogs: false,
      users: false,
      listings: false,
    };
    
    setPermissions(currentPerms);
    setEditModalOpen(true);
  };

  const handleAddClick = () => {
    setSelectedUserId('');
    setRole('ADMIN');
    setStatus('ACTIVE');
    setPermissions({
      seo: false,
      blogs: false,
      users: false,
      listings: false,
    });
    setAddModalOpen(true);
  };

  const handleUpdateRole = async (targetId: string) => {
    setUpdateLoading(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetId,
          role,
          status,
          permissions,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Success', 'Role and permissions updated successfully', 'success');
        setEditModalOpen(false);
        setAddModalOpen(false);
        fetchRoles(); // Refresh the list
      } else {
        showToast('Error', data.message || 'Failed to update role', 'error');
      }
    } catch (err) {
      console.error('Update role error:', err);
      showToast('Error', 'Something went wrong', 'error');
    } finally {
      setUpdateLoading(false);
    }
  };

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const filteredAdmins = admins.filter(admin => 
    admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    admin.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.phone?.includes(searchQuery)
  );

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Role Manager</h1>
          <p className={styles.subText}>Manage team access and granular permissions.</p>
        </div>
        <Button variant="primary" onClick={handleAddClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={16} />
          Elevate User to Admin
        </Button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px', width: '100%' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={18} />
          <Input 
            placeholder="Search admins by name, email or phone..." 
            style={{ paddingLeft: '2.5rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Card padding="md">Loading roles...</Card>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Admin Name</th>
                <th className={styles.th}>Role</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Module Permissions</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.td} style={{ textAlign: 'center' }}>
                    No admins found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-secondary-fade)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary)', fontWeight: 700 }}>
                          {admin.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className={styles.titleText}>{admin.name || 'Unknown User'}</div>
                          <div className={styles.subTextInfo}>{admin.email || admin.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <Badge variant={admin.role === 'SUPER_ADMIN' ? 'error' : 'primary'}>
                        {admin.role === 'SUPER_ADMIN' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldAlert size={12} /> Super Admin</div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={12} /> Admin</div>
                        )}
                      </Badge>
                    </td>
                    <td className={styles.td}>
                      <Badge variant={admin.status === 'ACTIVE' ? 'success' : 'error'}>
                        {admin.status}
                      </Badge>
                    </td>
                    <td className={styles.td}>
                      {admin.role === 'SUPER_ADMIN' ? (
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Full Access</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {admin.roleMetadata?.permissions?.seo && <Badge variant="neutral">SEO</Badge>}
                          {admin.roleMetadata?.permissions?.blogs && <Badge variant="neutral">Blogs</Badge>}
                          {admin.roleMetadata?.permissions?.users && <Badge variant="neutral">Users</Badge>}
                          {admin.roleMetadata?.permissions?.listings && <Badge variant="neutral">Listings</Badge>}
                          
                          {!admin.roleMetadata?.permissions?.seo && 
                           !admin.roleMetadata?.permissions?.blogs && 
                           !admin.roleMetadata?.permissions?.users && 
                           !admin.roleMetadata?.permissions?.listings && (
                             <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>No specific modules</span>
                           )}
                        </div>
                      )}
                    </td>
                    <td className={styles.td}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditClick(admin)}
                        disabled={admin.id === profile?.id}
                      >
                        <Edit2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Add Admin Modal */}
      <Modal 
        isOpen={editModalOpen || addModalOpen} 
        onClose={() => {
          setEditModalOpen(false);
          setAddModalOpen(false);
        }} 
        title={editModalOpen ? "Manage Admin Access" : "Elevate User to Admin"}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
          
          {addModalOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>Select User</label>
              <select 
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-card)', fontSize: '0.875rem' }}
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">-- Select a User --</option>
                {regularUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || 'Unknown'} ({u.email || u.phone})
                  </option>
                ))}
              </select>
            </div>
          )}

          {editModalOpen && editingAdmin && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 600 }}>{editingAdmin.name}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{editingAdmin.email || editingAdmin.phone}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>Role Level</label>
              <select 
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-card)', fontSize: '0.875rem' }}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="ADMIN">Admin (Restricted)</option>
                <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
                {editModalOpen && <option value="USER">User (Revoke Admin)</option>}
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>Account Status</label>
              <select 
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-card)', fontSize: '0.875rem' }}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned</option>
              </select>
            </div>
          </div>

          {role === 'ADMIN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>Module Permissions</label>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <input 
                    type="checkbox" 
                    checked={permissions.seo}
                    onChange={() => togglePermission('seo')}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-secondary)' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>SEO Manager</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <input 
                    type="checkbox" 
                    checked={permissions.blogs}
                    onChange={() => togglePermission('blogs')}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-secondary)' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Edit2 size={16} style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Blog Editor</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <input 
                    type="checkbox" 
                    checked={permissions.users}
                    onChange={() => togglePermission('users')}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-secondary)' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>User Manager</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <input 
                    type="checkbox" 
                    checked={permissions.listings}
                    onChange={() => togglePermission('listings')}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-secondary)' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={16} style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Listings Manager</span>
                  </div>
                </label>
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditModalOpen(false);
                setAddModalOpen(false);
              }}
              disabled={updateLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={() => handleUpdateRole(editModalOpen ? editingAdmin?.id : selectedUserId)}
              disabled={updateLoading || (addModalOpen && !selectedUserId)}
            >
              {updateLoading ? 'Saving...' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
