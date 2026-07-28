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
    <div className={styles.adminPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-2xl font-bold">Role Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Manage team access and granular permissions.</p>
        </div>
        <Button variant="primary" onClick={handleAddClick} className="flex items-center gap-2">
          <UserPlus size={16} />
          Elevate User to Admin
        </Button>
      </div>

      <div className={styles.controlsBar}>
        <div className="relative" style={{ maxWidth: '400px', width: '100%' }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input 
            placeholder="Search admins by name, email or phone..." 
            style={{ paddingLeft: '2.5rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading roles...</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Admin Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Module Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    No admins found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                          {admin.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold">{admin.name || 'Unknown User'}</div>
                          <div className="text-xs text-gray-500">{admin.email || admin.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant={admin.role === 'SUPER_ADMIN' ? 'error' : 'primary'}>
                        {admin.role === 'SUPER_ADMIN' ? (
                          <div className="flex items-center gap-1"><ShieldAlert size={12} /> Super Admin</div>
                        ) : (
                          <div className="flex items-center gap-1"><ShieldCheck size={12} /> Admin</div>
                        )}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={admin.status === 'ACTIVE' ? 'success' : 'error'}>
                        {admin.status}
                      </Badge>
                    </td>
                    <td>
                      {admin.role === 'SUPER_ADMIN' ? (
                        <span className="text-sm text-gray-500 italic">Full Access</span>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          {admin.roleMetadata?.permissions?.seo && <Badge variant="neutral">SEO</Badge>}
                          {admin.roleMetadata?.permissions?.blogs && <Badge variant="neutral">Blogs</Badge>}
                          {admin.roleMetadata?.permissions?.users && <Badge variant="neutral">Users</Badge>}
                          {admin.roleMetadata?.permissions?.listings && <Badge variant="neutral">Listings</Badge>}
                          
                          {!admin.roleMetadata?.permissions?.seo && 
                           !admin.roleMetadata?.permissions?.blogs && 
                           !admin.roleMetadata?.permissions?.users && 
                           !admin.roleMetadata?.permissions?.listings && (
                             <span className="text-sm text-gray-400">No specific modules</span>
                           )}
                        </div>
                      )}
                    </td>
                    <td>
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
              <label className="text-sm font-semibold">Select User</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
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
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-semibold">{editingAdmin.name}</div>
              <div className="text-sm text-gray-500">{editingAdmin.email || editingAdmin.phone}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-semibold">Role Level</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="ADMIN">Admin (Restricted)</option>
                <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
                {editModalOpen && <option value="USER">User (Revoke Admin)</option>}
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="text-sm font-semibold">Account Status</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
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
              <label className="text-sm font-semibold border-b pb-2">Module Permissions</label>
              
              <div className="grid grid-cols-2 gap-3 mt-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={permissions.seo}
                    onChange={() => togglePermission('seo')}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <Search size={16} className="text-gray-500" />
                    <span className="text-sm font-medium">SEO Manager</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={permissions.blogs}
                    onChange={() => togglePermission('blogs')}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <Edit2 size={16} className="text-gray-500" />
                    <span className="text-sm font-medium">Blog Editor</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={permissions.users}
                    onChange={() => togglePermission('users')}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-500" />
                    <span className="text-sm font-medium">User Manager</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={permissions.listings}
                    onChange={() => togglePermission('listings')}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-gray-500" />
                    <span className="text-sm font-medium">Listings Manager</span>
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
