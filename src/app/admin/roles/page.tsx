'use client';

import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, UserPlus, Search, Edit2, Settings, Users, Building2, Trash2, Download, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { useToast, Card, Badge, Input, Button, Modal } from '@/components/ui';
import styles from '../admin.module.css';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { downloadCSV } from '@/lib/export-utils';

export default function RoleManager() {
  const { showToast } = useToast();
  const { profile } = useAuth();
  const router = useRouter();
  
  const [admins, setAdmins] = useState<any[]>([]);
  const [regularUsers, setRegularUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  
  // Sorting State
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };
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

  // Delete User Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${adminToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        showToast('Success', 'Admin deleted successfully', 'success');
        setAdmins(prev => prev.filter(u => u.id !== adminToDelete.id));
        setDeleteModalOpen(false);
        setAdminToDelete(null);
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Failed to delete admin', 'error');
      }
    } catch (err) {
      console.error('Delete admin error:', err);
      showToast('Error', 'Something went wrong', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const canDeleteAdmin = (targetAdmin: any) => {
    if (!profile) return false;
    // Super Admins can delete Admins, but not themselves or other Super Admins
    return profile.role === 'SUPER_ADMIN' && targetAdmin.role !== 'SUPER_ADMIN';
  };

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const filteredAdmins = admins.filter(admin => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (admin.name || '').toLowerCase().includes(searchLower) ||
      (admin.email || '').toLowerCase().includes(searchLower) ||
      (admin.phone || '').includes(searchLower);
    
    const matchesRole = roleFilter === 'ALL' || admin.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || admin.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const sortedAdmins = [...filteredAdmins].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'string') {
      return sortAsc ? (aVal || '').localeCompare(bVal || '') : (bVal || '').localeCompare(aVal || '');
    }
    return 0;
  });

  const handleExportCSV = () => {
    const exportData = sortedAdmins.map(a => {
      const perms = a.roleMetadata?.permissions || {};
      const activePerms = Object.keys(perms).filter(k => perms[k]).join(', ');
      
      return {
        ID: a.id,
        Name: a.name,
        Email: a.email,
        Phone: a.phone,
        Role: a.role,
        Status: a.status,
        Permissions: activePerms || 'None',
        RegisteredAt: new Date(a.createdAt).toISOString()
      };
    });
    
    downloadCSV(exportData, `ListMe_Admins_Export_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Success', 'Report downloaded successfully', 'success');
  };

  return (
    <div>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className={styles.title}>Role Manager</h1>
          <p className={styles.subText}>Manage team access and granular permissions.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button onClick={handleExportCSV} variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} />
            Export Report
          </Button>
          <Button variant="primary" onClick={handleAddClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={16} />
            Elevate User to Admin
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <Card padding="md">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', zIndex: 1 }} size={18} />
              <Input 
                placeholder="Search admins by name, email or phone..." 
                style={{ paddingLeft: '2.5rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)', background: '#fff', outline: 'none' }}
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Administrators</option>
                <option value="SUPER_ADMIN">Super Admins</option>
              </select>
  
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-300)', background: '#fff', outline: 'none' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      {loading ? (
        <Card padding="md">Loading roles...</Card>
      ) : (
        <div className={styles.tableContainer} style={{ overflow: 'visible' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                  Admin Name <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                </th>
                <th className={styles.th} style={{ cursor: 'pointer' }} onClick={() => handleSort('role')}>
                  Role <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                </th>
                <th className={styles.th} style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                  Status <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                </th>
                <th className={styles.th}>Module Permissions</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.td} style={{ textAlign: 'center' }}>
                    No admins found matching your search.
                  </td>
                </tr>
              ) : (
                sortedAdmins.map((admin) => (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditClick(admin)}
                          disabled={admin.id === profile?.id}
                          style={{ padding: '0.25rem' }}
                        >
                          <Edit2 size={16} />
                        </Button>
                        
                        {canDeleteAdmin(admin) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setAdminToDelete(admin);
                              setDeleteModalOpen(true);
                            }}
                            style={{ color: 'var(--color-error)', padding: '0.25rem' }}
                            title="Delete Admin"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
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

      {/* Delete Admin Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion" size="md">
        {adminToDelete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertTriangle size={24} style={{ color: 'var(--color-error)' }} />
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--color-error)', margin: 0 }}>Warning: Destructive Action</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                  This will permanently delete the admin <strong>{adminToDelete.name || adminToDelete.email}</strong>. This cannot be undone.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button type="button" onClick={handleDeleteAdmin} disabled={deleteLoading} style={{ background: 'var(--color-error)', color: '#fff' }}>
                {deleteLoading ? 'Deleting...' : 'Yes, Delete Admin'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
