'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Search, ArrowUpDown, Download } from 'lucide-react';
import { useToast, Card, Input, Button } from '@/components/ui';
import styles from '../admin.module.css';
import { downloadCSV } from '@/lib/export-utils';
import { recordAdminExport } from '@/lib/admin-export-audit';

export default function AdminPincodes() {
  const { showToast } = useToast();
  
  const [pincodes, setPincodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('pinCode');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const fetchPincodes = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await fetch('/api/admin/pincodes');
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setPincodes(data.pincodes || []);
        } else {
          setLoadError(data.message || `Could not load the pincode report (error ${res.status}).`);
        }
      } catch (err) {
        console.error('Error fetching pincodes:', err);
        setLoadError('Could not load the pincode report. Check your connection and reload.');
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

  const handleExportCSV = async () => {
    const exportData = sortedPincodes.map(p => ({
      Pincode: p.pinCode,
      City: p.city,
      Locality: p.locality,
      TotalListings: p.totalListings,
      ActiveListings: p.activeListings,
      AverageSalePrice: p.avgAskingPrice,
      AverageMonthlyRent: p.avgMonthlyRent,
      SeekerInterests: p.totalInterests,
    }));

    if (!(await recordAdminExport('PINCODES', exportData.length, { search: searchQuery }))) {
      showToast('Error', 'Export could not be recorded, so it was not downloaded', 'error');
      return;
    }
    downloadCSV(exportData, `ListMe_Pincodes_Export_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Success', 'Report downloaded successfully', 'success');
  };

  return (
    <div>
      {/* Header */}
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className={styles.title}>Listings by Pincode</h1>
          <p className={styles.subText}>Monitor property density, average pricing levels, and seeker interest volume per pincode.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button onClick={handleExportCSV} variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} />
            Export Report
          </Button>
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
      ) : loadError ? (
        <div className={styles.emptyState} role="alert">
          <MapPin size={48} style={{ opacity: 0.3 }} />
          <h3>Report unavailable</h3>
          <p>{loadError}</p>
        </div>
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
                <th className={styles.th} style={{ width: '20%' }} aria-sort={sortField === 'pinCode' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => handleSort('pinCode')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
                    Pincode <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} aria-hidden="true" />
                  </button>
                </th>
                <th className={styles.th} style={{ width: '20%' }} aria-sort={sortField === 'activeListings' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => handleSort('activeListings')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
                    Active Listings <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} aria-hidden="true" />
                  </button>
                </th>
                <th className={styles.th} style={{ width: '20%' }} aria-sort={sortField === 'avgAskingPrice' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => handleSort('avgAskingPrice')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
                    Avg Sale Price <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} aria-hidden="true" />
                  </button>
                </th>
                <th className={styles.th} style={{ width: '20%' }} aria-sort={sortField === 'avgMonthlyRent' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => handleSort('avgMonthlyRent')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
                    Avg Monthly Rent <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} aria-hidden="true" />
                  </button>
                </th>
                <th className={styles.th} style={{ width: '20%' }} aria-sort={sortField === 'totalInterests' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => handleSort('totalInterests')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
                    Seeker Interests <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} aria-hidden="true" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPincodes.map((item) => (
                <tr key={item.pinCode} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: 700, color: 'var(--color-neutral-900)' }}>
                    {item.pinCode}
                    <div style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
                      {[item.locality, item.city].filter(Boolean).join(', ')}
                    </div>
                  </td>
                  <td className={styles.td}>{item.activeListings} properties</td>
                  <td className={styles.td}>{formatPrice(item.avgAskingPrice)}</td>
                  <td className={styles.td}>{formatPrice(item.avgMonthlyRent)}</td>
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
