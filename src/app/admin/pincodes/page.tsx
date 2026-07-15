'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Search, ArrowUpDown } from 'lucide-react';
import { useToast, Card, Input } from '@/components/ui';
import styles from '../admin.module.css';

export default function AdminPincodes() {
  const { showToast } = useToast();
  
  const [pincodes, setPincodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('pincode');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const fetchPincodes = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/pincodes');
        const data = await res.json();
        if (res.ok) {
          setPincodes(data.pincodes || []);
        }
      } catch (err) {
        console.error('Error fetching pincodes:', err);
        showToast('Error', 'Failed to retrieve pincode database reports', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchPincodes();
  }, []);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const formatPrice = (price: number) => {
    if (!price) return 'N/A';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} Lk`;
    return `₹${price.toLocaleString('en-IN')}`;
  };

  // Filter pincodes by search query
  const filteredPincodes = pincodes.filter((p) =>
    p.pinCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort pincodes
  const sortedPincodes = [...filteredPincodes].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    // Handle string vs number comparison
    if (typeof aVal === 'string') {
      return sortAsc 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    } else {
      return sortAsc 
        ? aVal - bVal 
        : bVal - aVal;
    }
  });

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Listings by Pincode</h1>
          <p className={styles.subText}>Monitor property density, average pricing levels, and seeker interest volume per pincode.</p>
        </div>
      </div>

      {/* Toolbar search */}
      <Card padding="md" style={{ marginBottom: '2rem' }}>
        <div style={{ maxWidth: '400px' }}>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Search pin code..."
            leftIcon={<Search size={18} />}
            maxLength={6}
            fullWidth
          />
        </div>
      </Card>

      {/* Data Table */}
      {loading ? (
        <Card padding="md">Loading reports...</Card>
      ) : sortedPincodes.length === 0 ? (
        <div className={styles.emptyState}>
          <MapPin size={48} style={{ opacity: 0.3 }} />
          <h3>No pincode records found</h3>
          <p>No listings match the entered pincode.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ cursor: 'pointer' }} onClick={() => handleSort('pinCode')}>
                  Pincode <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                </th>
                <th className={styles.th} style={{ cursor: 'pointer' }} onClick={() => handleSort('activeListings')}>
                  Active Listings <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                </th>
                <th className={styles.th} style={{ cursor: 'pointer' }} onClick={() => handleSort('avgAskingPrice')}>
                  Average Asking Price <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                </th>
                <th className={styles.th} style={{ cursor: 'pointer' }} onClick={() => handleSort('totalInterests')}>
                  Seeker Interests <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPincodes.map((item) => (
                <tr key={`${item.pinCode}-${item.city}-${item.locality}`} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: 700, color: 'var(--color-neutral-900)' }}>
                    {item.pinCode}
                  </td>
                  <td className={styles.td}>{item.activeListings} properties</td>
                  <td className={styles.td}>{formatPrice(item.avgAskingPrice)}</td>
                  <td className={styles.td}>{item.totalInterests} responses</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
