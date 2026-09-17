'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Search, Filter, Shield, User, Mail, Phone, Trash2, Download, 
  AlertTriangle, ArrowUpDown, UserPlus, MoreVertical, Check, Clock, 
  CheckCircle, Eye, Edit, ChevronDown, ChevronLeft, ChevronRight, 
  Calendar, X 
} from 'lucide-react';
import { useToast, Card, Badge, Input, Button, Modal } from '@/components/ui';
import styles from '../admin.module.css';
import { useAuth } from '@/context/AuthContext';
import { downloadCSV } from '@/lib/export-utils';

const AVATAR_THEMES = [
  { bg: '#e0f2fe', color: '#0369a1' }, // Light Blue / Dark Blue
  { bg: '#ede9fe', color: '#6d28d9' }, // Light Purple / Dark Purple
  { bg: '#dcfce7', color: '#15803d' }, // Light Green / Dark Green
  { bg: '#fef3c7', color: '#b45309' }, // Light Amber / Dark Amber
  { bg: '#ffe4e6', color: '#be123c' }, // Light Rose / Dark Rose
  { bg: '#e0e7ff', color: '#4338ca' }, // Light Indigo / Dark Indigo
];

const getAvatarColors = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_THEMES.length;
  return AVATAR_THEMES[index];
};

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatDate = (isoString?: string) => {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return 'N/A';
  }
};

export default function AdminUsers() {
  const { showToast } = useToast();
  const { profile } = useAuth();
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Sort state
  const [sortOption, setSortOption] = useState('latest');
  const [sortField, setSortField] = useState('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination for mobile view
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleSortOptionChange = (option: string) => {
    setSortOption(option);
    if (option === 'latest') {
      setSortField('createdAt');
      setSortAsc(false);
    } else if (option === 'oldest') {
      setSortField('createdAt');
      setSortAsc(true);
    } else if (option === 'name_asc') {
      setSortField('name');
      setSortAsc(true);
    } else if (option === 'name_desc') {
      setSortField('name');
      setSortAsc(false);
    } else if (option === 'properties') {
      setSortField('properties');
      setSortAsc(false);
    } else if (option === 'leads') {
      setSortField('responses');
      setSortAsc(false);
    }
  };

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Add User Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('USER');
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [createLoading, setCreateLoading] = useState(false);

  // Edit User Modal State
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [editRole, setEditRole] = useState('USER');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editPhoneVerified, setEditPhoneVerified] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // User Details Modal State
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any | null>(null);

  // Delete User Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Close card dropdown menus on click outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null);
    if (activeDropdownId) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeDropdownId]);

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
        if (selectedUserForDetails && selectedUserForDetails.id === id) {
          setSelectedUserForDetails((prev: any) => ({ ...prev, ...data.profile }));
        }
        if (userToEdit && userToEdit.id === id) {
          setUserToEdit(null);
        }
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

  const handleOpenEdit = (userItem: any) => {
    setUserToEdit(userItem);
    setEditRole(userItem.role);
    setEditStatus(userItem.status);
    setEditPhoneVerified(!!userItem.phoneVerified);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setEditLoading(true);
    await handleUpdateUser(userToEdit.id, {
      role: editRole,
      status: editStatus,
      phoneVerified: editPhoneVerified
    });
    setEditLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        showToast('Success', 'User and associated listings deleted successfully', 'success');
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        setDeleteModalOpen(false);
        setUserToDelete(null);
        if (selectedUserForDetails?.id === userToDelete.id) {
          setSelectedUserForDetails(null);
        }
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Failed to delete user', 'error');
      }
    } catch (err) {
      console.error('Delete user error:', err);
      showToast('Error', 'Something went wrong', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Check if current user is allowed to delete the target user
  const canDeleteUser = (targetUser: any) => {
    if (!profile || targetUser.id === profile.id) return false;
    if (profile.role === 'SUPER_ADMIN') {
      return targetUser.role !== 'SUPER_ADMIN';
    }
    if (profile.role === 'ADMIN') {
      return targetUser.role === 'USER';
    }
    return false;
  };

  // Filter users by search query and role selection
  const filteredUsers = users.filter((u) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(searchLower) ||
      (u.email || '').toLowerCase().includes(searchLower) ||
      (u.phone || '').toLowerCase().includes(searchLower);
      
    const matchesToolbarRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    const matchesVerification = verificationFilter === 'ALL' || (verificationFilter === 'VERIFIED' ? u.phoneVerified : !u.phoneVerified);
    
    let matchesDate = true;
    if (startDate || endDate) {
      const uDate = new Date(u.createdAt);
      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0,0,0,0);
        if (uDate < sDate) matchesDate = false;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23,59,59,999);
        if (uDate > eDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesToolbarRole && matchesStatus && matchesVerification && matchesDate;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (sortField === 'verification') {
      aVal = a.phoneVerified ? 1 : 0;
      bVal = b.phoneVerified ? 1 : 0;
    } else if (sortField === 'properties') {
      aVal = a._count?.listings || 0;
      bVal = b._count?.listings || 0;
    } else if (sortField === 'responses') {
      aVal = a._count?.interests || 0;
      bVal = b._count?.interests || 0;
    }

    if (typeof aVal === 'string') {
      return sortAsc ? (aVal || '').localeCompare(bVal || '') : (bVal || '').localeCompare(aVal || '');
    } else {
      return sortAsc ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
    }
  });

  // Mobile pagination slice
  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE) || 1;
  const paginatedMobileUsers = sortedUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleExportCSV = () => {
    const exportData = sortedUsers.map(u => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      Phone: u.phone,
      Role: u.role,
      Status: u.status,
      PhoneVerified: u.phoneVerified ? 'Yes' : 'No',
      PropertiesListed: u._count?.listings || 0,
      InterestsExpressed: u._count?.interests || 0,
      RegisteredAt: new Date(u.createdAt).toISOString()
    }));
    
    downloadCSV(exportData, `ListMe_Users_Export_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Success', 'Report downloaded successfully', 'success');
  };

  const hasActiveFilters = 
    roleFilter !== 'ALL' || 
    statusFilter !== 'ALL' || 
    verificationFilter !== 'ALL' || 
    startDate || 
    endDate || 
    searchQuery;

  return (
    <div>
      {/* Header */}
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 className={styles.title}>Registered Users Directory</h1>
          <p className={styles.subText}>Manage account details, verify statuses, and monitor active listings per user.</p>
        </div>
        <div className={styles.desktopOnly} style={{ display: 'flex', gap: '1rem' }}>
          <Button onClick={handleExportCSV} variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} />
            Export Report
          </Button>
          <Button onClick={() => setAddModalOpen(true)} variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} />
            Add User / Admin
          </Button>
        </div>
      </div>

      {/* Mobile Action Buttons directly beneath header subtitle (Screens < 768px) */}
      <div className={`${styles.userMobileHeaderActions} ${styles.mobileOnly}`}>
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={loading || sortedUsers.length === 0}
          className={styles.userExportReportBtn}
          aria-label="Export users report"
        >
          <Download size={16} />
          <span>Export Report</span>
        </button>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className={styles.userAddUserBtn}
          aria-label="Add new user or admin"
        >
          <UserPlus size={16} />
          <span>Add User / Admin</span>
        </button>
      </div>

      {/* Mobile Toolbar (Screens < 768px) matching reference mockup */}
      <div className={`${styles.mobileToolbarWrapper} ${styles.mobileOnly}`}>
        {/* Search Input Box */}
        <div className={styles.mobileSearchBox}>
          <Search size={18} className={styles.mobileSearchIcon} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search users by name, email, or phone..."
            className={styles.mobileSearchInput}
            aria-label="Search users by name, email, or phone"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className={styles.mobileSearchClearBtn}
              aria-label="Clear search input"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Pill Row 1 */}
        <div className={styles.filterPillRow1}>
          <div className={styles.pillSelectWrapper}>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className={styles.pillSelect}
              aria-label="Filter by Role"
            >
              <option value="ALL">All Roles</option>
              <option value="USER">Users</option>
              <option value="ADMIN">Admins</option>
              <option value="SUPER_ADMIN">Super Admins</option>
            </select>
            <ChevronDown size={14} className={styles.pillChevron} />
          </div>

          <div className={styles.pillSelectWrapper}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={styles.pillSelect}
              aria-label="Filter by Status"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
            <ChevronDown size={14} className={styles.pillChevron} />
          </div>

          <div className={styles.pillSelectWrapper}>
            <select
              value={verificationFilter}
              onChange={(e) => {
                setVerificationFilter(e.target.value);
                setPage(1);
              }}
              className={styles.pillSelect}
              aria-label="Filter by Verification"
            >
              <option value="ALL">All Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="UNVERIFIED">Unverified</option>
            </select>
            <ChevronDown size={14} className={styles.pillChevron} />
          </div>
        </div>

        {/* Filter Pill Row 2: Date Pickers */}
        <div className={styles.filterPillRow2}>
          <div className={styles.pillSelectWrapper}>
            <Calendar size={14} className={styles.pillLeftIcon} />
            <input
              type={startDate ? 'date' : 'text'}
              onFocus={(e) => (e.target.type = 'date')}
              onBlur={(e) => {
                if (!e.target.value) e.target.type = 'text';
              }}
              placeholder="From Date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className={`${styles.pillSelect} ${styles.pillSelectWithIcon} ${startDate ? styles.dateRangeActivePill : ''}`}
              title="From Date"
              aria-label="From Date"
            />
            <ChevronDown size={14} className={styles.pillChevron} />
          </div>

          <div className={styles.pillSelectWrapper}>
            <Calendar size={14} className={styles.pillLeftIcon} />
            <input
              type={endDate ? 'date' : 'text'}
              onFocus={(e) => (e.target.type = 'date')}
              onBlur={(e) => {
                if (!e.target.value) e.target.type = 'text';
              }}
              placeholder="To Date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className={`${styles.pillSelect} ${styles.pillSelectWithIcon} ${endDate ? styles.dateRangeActivePill : ''}`}
              title="To Date"
              aria-label="To Date"
            />
            <ChevronDown size={14} className={styles.pillChevron} />
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div style={{ marginBottom: '0.625rem' }}>
            <button
              type="button"
              className={styles.clearFilterBtn}
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
                setVerificationFilter('ALL');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Results Count and Sort Row (Screens < 768px) */}
      <div className={`${styles.resultsSortRow} ${styles.mobileOnly}`}>
        <div className={styles.resultsCount}>
          <strong>{filteredUsers.length}</strong> Users
        </div>
        <div className={styles.sortWrapper}>
          <span>Sort by</span>
          <div className={styles.pillSelectWrapper} style={{ minWidth: '105px' }}>
            <select
              value={sortOption}
              onChange={(e) => handleSortOptionChange(e.target.value)}
              className={styles.sortPillSelect}
              aria-label="Sort users by"
            >
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="properties">Most Properties</option>
              <option value="leads">Most Leads</option>
            </select>
            <ChevronDown size={13} className={styles.pillChevron} />
          </div>
        </div>
      </div>

      {/* Desktop Toolbar filters (Screens >= 768px) */}
      <div className={styles.desktopOnly}>
        <Card padding="md" style={{ marginBottom: '1.5rem' }}>
          <div className={styles.filterContainer}>
            {/* Top row: Search input + Clear filters */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '260px' }}>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name, email, or phone number..."
                  aria-label="Search users by name, email, or phone number"
                  leftIcon={<Search size={18} />}
                  fullWidth
                />
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  className={styles.clearFilterBtn}
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('ALL');
                    setStatusFilter('ALL');
                    setVerificationFilter('ALL');
                    setStartDate('');
                    setEndDate('');
                  }}
                  title="Reset all search queries and filters"
                  aria-label="Reset all search queries and filters"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <div className={styles.filterRow}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={styles.filterSelect}
                title="Filter by Role"
                aria-label="Filter by Role"
              >
                <option value="ALL">All Roles</option>
                <option value="USER">Regular Users</option>
                <option value="ADMIN">Administrators</option>
                <option value="SUPER_ADMIN">Super Admins</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
                title="Filter by Status"
                aria-label="Filter by Status"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned</option>
              </select>

              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className={`${styles.filterSelect} ${styles.filterRowFull}`}
                title="Filter by Verification"
                aria-label="Filter by Verification"
              >
                <option value="ALL">All Verification</option>
                <option value="VERIFIED">Verified</option>
                <option value="UNVERIFIED">Unverified</option>
              </select>

              <div className={styles.dateFilterGroup}>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="Joined After"
                  className={styles.dateInput}
                />
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>to</span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="Joined Before"
                  className={styles.dateInput}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Table List */}
      {loading ? (
        <Card padding="md">Loading user database...</Card>
      ) : sortedUsers.length === 0 ? (
        <div className={styles.emptyState}>
          <Users size={48} style={{ opacity: 0.3 }} />
          <h3>No user profiles found</h3>
          <p>Try modifying your keyword search or role filter.</p>
          {hasActiveFilters && (
            <button
              type="button"
              className={styles.clearFilterBtn}
              style={{ marginTop: '0.75rem' }}
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
                setVerificationFilter('ALL');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className={`${styles.tableContainer} ${styles.desktopOnly}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th} style={{ cursor: 'pointer', width: '22%' }} onClick={() => handleSort('name')}>
                    User Details <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th className={styles.th} style={{ width: '18%' }}>Contact details</th>
                  <th className={styles.th} style={{ cursor: 'pointer', width: '11%' }} onClick={() => handleSort('role')}>
                    Role <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th className={styles.th} style={{ cursor: 'pointer', width: '12%' }} onClick={() => handleSort('status')}>
                    Status <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th className={styles.th} style={{ cursor: 'pointer', width: '9%' }} onClick={() => handleSort('properties')}>
                    Properties <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th className={styles.th} style={{ cursor: 'pointer', width: '9%' }} onClick={() => handleSort('responses')}>
                    Responses <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th className={styles.th} style={{ cursor: 'pointer', width: '12%' }} onClick={() => handleSort('verification')}>
                    Verification <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th className={styles.th} style={{ width: '7%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((userItem) => (
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
                          <div className={styles.subTextInfo}>Registered: {formatDate(userItem.createdAt)}</div>
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
                        disabled={updatingId === userItem.id || (userItem.role === 'SUPER_ADMIN' && profile?.role !== 'SUPER_ADMIN') || userItem.id === profile?.id}
                        aria-label="Select role"
                        style={{
                          padding: '0.375rem 0.625rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          background: '#fff',
                          fontSize: '0.812rem',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 600,
                          cursor: (userItem.role === 'SUPER_ADMIN' && profile?.role !== 'SUPER_ADMIN') || userItem.id === profile?.id ? 'not-allowed' : 'pointer',
                          minHeight: '34px',
                          outline: 'none',
                          color: 'var(--color-primary-light)'
                        }}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                        {(userItem.role === 'SUPER_ADMIN' || profile?.role === 'SUPER_ADMIN') && <option value="SUPER_ADMIN">SUPER ADMIN</option>}
                      </select>
                    </td>
                    <td className={styles.td}>
                      <select
                        value={userItem.status}
                        onChange={(e) => handleUpdateUser(userItem.id, { status: e.target.value })}
                        disabled={updatingId === userItem.id || userItem.id === profile?.id}
                        aria-label="Select status"
                        style={{
                          padding: '0.375rem 0.625rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          background: '#fff',
                          fontSize: '0.812rem',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 600,
                          cursor: userItem.id === profile?.id ? 'not-allowed' : 'pointer',
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
                          aria-label={userItem.phoneVerified ? 'Revoke phone verification' : 'Verify phone number'}
                        >
                          {userItem.phoneVerified ? 'Unverify' : 'Verify'}
                        </Button>
                      </div>
                    </td>
                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      <div className={styles.actionBtnGroup} style={{ justifyContent: 'flex-end' }}>
                        {canDeleteUser(userItem) && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setUserToDelete(userItem);
                              setDeleteModalOpen(true);
                            }}
                            style={{ color: 'var(--color-error)', padding: '0.25rem 0.5rem', minHeight: 'auto' }}
                            title="Delete User"
                            aria-label="Delete user"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (Screens < 768px) matching reference mockup media_1789636392600.png */}
          <div className={`${styles.mobileCardsList} ${styles.mobileOnly}`}>
            {paginatedMobileUsers.map((userItem) => {
              const isDropdownOpen = activeDropdownId === userItem.id;
              const initials = getInitials(userItem.name || userItem.email || 'User');
              const avatarTheme = getAvatarColors(userItem.name || userItem.email || userItem.id);
              const registeredDateStr = formatDate(userItem.createdAt);
              
              return (
                <div key={userItem.id} className={`${styles.userCard} ${isDropdownOpen ? styles.userCardOpen : ''}`}>
                  {/* Top Row: Avatar + Name/Date + Badge + 3-Dots */}
                  <div className={styles.userCardTop}>
                    <div className={styles.userCardLeft}>
                      <div 
                        className={styles.userAvatarCircle}
                        style={{ backgroundColor: avatarTheme.bg, color: avatarTheme.color }}
                      >
                        {initials}
                      </div>
                      <div className={styles.userInfoCol}>
                        <h3 className={styles.userName} title={userItem.name || 'Anonymous User'}>
                          {userItem.name || 'Anonymous User'}
                        </h3>
                        <span className={styles.userRegisteredDate}>
                          Registered: {registeredDateStr}
                        </span>
                      </div>
                    </div>

                    <div className={styles.userCardTopRight}>
                      {/* Verification / Status Badge */}
                      {userItem.status === 'BANNED' ? (
                        <span className={styles.userStatusBadgeBanned}>
                          Banned
                        </span>
                      ) : userItem.status === 'SUSPENDED' ? (
                        <span className={styles.userStatusBadgeSuspended}>
                          Suspended
                        </span>
                      ) : userItem.phoneVerified ? (
                        <span className={styles.userStatusBadgeVerified}>
                          <Check size={12} strokeWidth={2.5} /> Verified
                        </span>
                      ) : userItem.status === 'ACTIVE' ? (
                        <span className={styles.userStatusBadgeActive}>
                          <span className={styles.userStatusDot} /> Active
                        </span>
                      ) : (
                        <span className={styles.userStatusBadgePending}>
                          <Clock size={12} /> Pending
                        </span>
                      )}

                      {/* 3-Dots Menu Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(isDropdownOpen ? null : userItem.id);
                        }}
                        className={styles.cardMoreBtn}
                        aria-label={`More options for ${userItem.name || 'User'}`}
                        aria-expanded={isDropdownOpen}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Floating Dropdown Menu */}
                      {isDropdownOpen && (
                        <div className={styles.cardDropdownMenu} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={styles.cardDropdownItem}
                            onClick={() => {
                              setActiveDropdownId(null);
                              handleUpdateUser(userItem.id, { phoneVerified: !userItem.phoneVerified });
                            }}
                          >
                            <CheckCircle size={14} />
                            {userItem.phoneVerified ? 'Revoke Verification' : 'Verify Phone'}
                          </button>
                          <button
                            type="button"
                            className={styles.cardDropdownItem}
                            onClick={() => {
                              setActiveDropdownId(null);
                              handleOpenEdit(userItem);
                            }}
                          >
                            <Edit size={14} /> Edit User
                          </button>
                          {canDeleteUser(userItem) && (
                            <button
                              type="button"
                              className={styles.cardDropdownItem}
                              style={{ color: '#ef4444' }}
                              onClick={() => {
                                setActiveDropdownId(null);
                                setUserToDelete(userItem);
                                setDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 size={14} /> Delete User
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Row: Phone and Email */}
                  <div className={styles.userContactRow}>
                    <a
                      href={userItem.phone ? `tel:${userItem.phone}` : undefined}
                      onClick={(e) => e.stopPropagation()}
                      className={`${styles.userContactLink} ${!userItem.phone ? styles.userContactDisabled : ''}`}
                      aria-label={userItem.phone ? `Call ${userItem.phone}` : 'No phone number available'}
                    >
                      <Phone size={13} style={{ flexShrink: 0 }} />
                      <span>{userItem.phone || 'No phone'}</span>
                    </a>
                    <a
                      href={userItem.email ? `mailto:${userItem.email}` : undefined}
                      onClick={(e) => e.stopPropagation()}
                      className={`${styles.userContactLink} ${!userItem.email ? styles.userContactDisabled : ''}`}
                      aria-label={userItem.email ? `Email ${userItem.email}` : 'No email address available'}
                    >
                      <Mail size={13} style={{ flexShrink: 0 }} />
                      <span>{userItem.email || 'No email'}</span>
                    </a>
                  </div>

                  {/* 4-Column Stats Grid: Properties, Leads, Role, Status */}
                  <div className={styles.userStatsGrid}>
                    <div className={styles.userStatCol}>
                      <span className={styles.userStatVal}>{userItem._count?.listings || 0}</span>
                      <span className={styles.userStatLabel}>Properties</span>
                    </div>
                    <div className={styles.userStatCol}>
                      <span className={styles.userStatVal}>{userItem._count?.interests || 0}</span>
                      <span className={styles.userStatLabel}>Leads</span>
                    </div>
                    <div className={styles.userStatCol}>
                      <span className={styles.userStatVal}>{userItem.role}</span>
                      <span className={styles.userStatLabel}>Role</span>
                    </div>
                    <div className={styles.userStatCol}>
                      <span className={`${styles.userStatVal} ${
                        userItem.status === 'ACTIVE' ? styles.statusTextActive :
                        userItem.status === 'SUSPENDED' ? styles.statusTextSuspended :
                        userItem.status === 'BANNED' ? styles.statusTextError :
                        styles.statusTextPending
                      }`}>
                        {userItem.status}
                      </span>
                      <span className={styles.userStatLabel}>Status</span>
                    </div>
                  </div>

                  {/* Action Buttons Row: View Details, Edit, Delete */}
                  <div className={styles.userActionsRow}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUserForDetails(userItem);
                      }}
                      className={styles.userViewDetailsBtn}
                      aria-label={`View details for ${userItem.name || 'User'}`}
                    >
                      <Eye size={16} />
                      <span>View Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(userItem);
                      }}
                      className={styles.userEditSquareBtn}
                      title="Edit User"
                      aria-label={`Edit ${userItem.name || 'User'}`}
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canDeleteUser(userItem)) {
                          setUserToDelete(userItem);
                          setDeleteModalOpen(true);
                        }
                      }}
                      className={styles.userDeleteSquareBtn}
                      title={canDeleteUser(userItem) ? "Delete User" : "Cannot delete this user"}
                      aria-label={`Delete ${userItem.name || 'User'}`}
                      disabled={!canDeleteUser(userItem)}
                      style={!canDeleteUser(userItem) ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className={styles.mobilePaginationWrapper}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={styles.mobilePageBtn}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <span className={styles.mobilePageIndicator}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={styles.mobilePageBtn}
                  aria-label="Next page"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* User Details Inspection Modal */}
      <Modal
        isOpen={!!selectedUserForDetails}
        onClose={() => setSelectedUserForDetails(null)}
        title="User Account Details"
        size="md"
      >
        {selectedUserForDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.25rem' }}>
            {/* Header / Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  backgroundColor: getAvatarColors(selectedUserForDetails.name || selectedUserForDetails.email || '').bg,
                  color: getAvatarColors(selectedUserForDetails.name || selectedUserForDetails.email || '').color,
                  flexShrink: 0
                }}
              >
                {getInitials(selectedUserForDetails.name || selectedUserForDetails.email)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-heading)' }}>
                  {selectedUserForDetails.name || 'Anonymous User'}
                </h3>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
                  Registered on {formatDate(selectedUserForDetails.createdAt)}
                </div>
              </div>
              <Badge variant={selectedUserForDetails.phoneVerified ? 'success' : 'warning'} size="sm">
                {selectedUserForDetails.phoneVerified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>

            {/* Quick Contact & IDs */}
            <div style={{ background: '#f8fafc', padding: '0.875rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Phone:</span>
                {selectedUserForDetails.phone ? (
                  <a href={`tel:${selectedUserForDetails.phone}`} style={{ color: '#0078db', fontWeight: 600 }}>
                    {selectedUserForDetails.phone}
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8' }}>None</span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Email:</span>
                {selectedUserForDetails.email ? (
                  <a href={`mailto:${selectedUserForDetails.email}`} style={{ color: '#0078db', fontWeight: 600 }}>
                    {selectedUserForDetails.email}
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8' }}>None</span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Role:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {selectedUserForDetails.role}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Status:</span>
                <span style={{
                  fontWeight: 700,
                  color: selectedUserForDetails.status === 'ACTIVE' ? '#16a34a' :
                         selectedUserForDetails.status === 'SUSPENDED' ? '#d97706' :
                         selectedUserForDetails.status === 'BANNED' ? '#dc2626' : '#ea580c'
                }}>
                  {selectedUserForDetails.status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>User ID:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#334155' }}>
                  {selectedUserForDetails.id}
                </span>
              </div>
            </div>

            {/* Activity Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-heading)' }}>
                  {selectedUserForDetails._count?.listings || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                  Properties Listed
                </div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-heading)' }}>
                  {selectedUserForDetails._count?.interests || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                  Leads / Inquiries
                </div>
              </div>
            </div>

            {/* View properties link if has listings */}
            {selectedUserForDetails._count?.listings > 0 && (
              <Link
                href={`/admin/listings?search=${encodeURIComponent(selectedUserForDetails.name || selectedUserForDetails.phone || '')}`}
                onClick={() => setSelectedUserForDetails(null)}
                className={styles.userViewDetailsBtn}
                style={{ width: '100%', textDecoration: 'none' }}
              >
                <Eye size={16} />
                <span>View User&apos;s Properties ({selectedUserForDetails._count?.listings})</span>
              </Link>
            )}

            {/* Close / Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setSelectedUserForDetails(null)}>
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  const u = selectedUserForDetails;
                  setSelectedUserForDetails(null);
                  handleOpenEdit(u);
                }}
              >
                Edit Account
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!userToEdit} onClose={() => setUserToEdit(null)} title="Edit User Account" size="md">
        {userToEdit && (
          <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  backgroundColor: getAvatarColors(userToEdit.name || userToEdit.email || '').bg,
                  color: getAvatarColors(userToEdit.name || userToEdit.email || '').color
                }}
              >
                {getInitials(userToEdit.name || userToEdit.email)}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{userToEdit.name || 'Anonymous'}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{userToEdit.email} · {userToEdit.phone}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-neutral-700)', fontFamily: 'var(--font-heading)' }}>
                  User Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={editLoading || (userToEdit.role === 'SUPER_ADMIN' && profile?.role !== 'SUPER_ADMIN') || userToEdit.id === profile?.id}
                  className={styles.filterSelect}
                  style={{ minHeight: '44px' }}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                  {(userToEdit.role === 'SUPER_ADMIN' || profile?.role === 'SUPER_ADMIN') && (
                    <option value="SUPER_ADMIN">SUPER ADMIN</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-neutral-700)', fontFamily: 'var(--font-heading)' }}>
                  Account Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  disabled={editLoading || userToEdit.id === profile?.id}
                  className={styles.filterSelect}
                  style={{ minHeight: '44px' }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="BANNED">BANNED</option>
                </select>
              </div>
            </div>

            {userToEdit.id === profile?.id && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', background: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                Note: You cannot modify your own role or account status.
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>Phone Verification</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Toggle verified status for user profile</div>
              </div>
              <Button
                type="button"
                variant={editPhoneVerified ? 'primary' : 'outline'}
                size="sm"
                style={editPhoneVerified ? { backgroundColor: '#10b981', borderColor: '#10b981' } : undefined}
                onClick={() => setEditPhoneVerified(!editPhoneVerified)}
              >
                {editPhoneVerified ? 'Verified' : 'Unverified'}
              </Button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setUserToEdit(null)} disabled={editLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={editLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

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
                {profile?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">SUPER ADMIN</option>}
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

      {/* Delete User Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion" size="md">
        {userToDelete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertTriangle size={24} style={{ color: 'var(--color-error)' }} />
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--color-error)', margin: 0 }}>Warning: Destructive Action</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                  This will permanently delete the user <strong>{userToDelete.name || userToDelete.email}</strong> and ALL their properties, interests, and shortlists. This cannot be undone.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={handleDeleteUser} loading={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Yes, Delete User'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
