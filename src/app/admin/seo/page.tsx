'use client';

import React, { useEffect } from 'react';
import { Search, Globe, FileText, BarChart, CheckCircle } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import styles from '../admin.module.css';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function SeoDashboard() {
  const { profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Basic RBAC guard
    const isSuper = profile?.role === 'SUPER_ADMIN';
    const hasSeoPerm = profile?.roleMetadata?.permissions?.seo === true;
    
    if (profile && !isSuper && !hasSeoPerm) {
      router.push('/admin');
    }
  }, [profile, router]);

  return (
    <div className={styles.adminPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-2xl font-bold">SEO Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage search engine optimization and visibility.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-5 flex items-start gap-4 shadow-sm border-gray-100">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Globe size={24} />
          </div>
          <div>
            <div className="text-gray-500 text-sm font-medium">Sitemap Status</div>
            <div className="text-xl font-bold mt-1">Active</div>
            <div className="mt-2 text-xs text-gray-400">/sitemap.xml is auto-generating</div>
          </div>
        </Card>

        <Card className="p-5 flex items-start gap-4 shadow-sm border-gray-100">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileText size={24} />
          </div>
          <div>
            <div className="text-gray-500 text-sm font-medium">Robots.txt</div>
            <div className="text-xl font-bold mt-1">Configured</div>
            <div className="mt-2 text-xs text-gray-400">All bots allowed, admin blocked</div>
          </div>
        </Card>

        <Card className="p-5 flex items-start gap-4 shadow-sm border-gray-100">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Search size={24} />
          </div>
          <div>
            <div className="text-gray-500 text-sm font-medium">Schema.org</div>
            <div className="text-xl font-bold mt-1">Enabled</div>
            <div className="mt-2 text-xs text-gray-400">Property & Breadcrumb structured data</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart size={18} className="text-gray-500" />
            Global Meta Configuration
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Default OpenGraph and Twitter card settings for the platform.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
              <input type="text" disabled className="w-full p-2 border border-gray-200 rounded-md bg-gray-50" value="ListMe — List it. Find it. Own it." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Description</label>
              <textarea disabled className="w-full p-2 border border-gray-200 rounded-md bg-gray-50" rows={3} value="Browse, sell, or rent properties across India for free with direct owner listings and zero brokerage." />
            </div>
            
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-1"><CheckCircle size={14} className="text-green-500" /> Hardcoded in layout.tsx</span>
              <Button variant="outline" disabled>Edit Settings</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Indexing Links</h2>
          <div className="space-y-3">
            <a href="/sitemap.xml" target="_blank" className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <div className="font-medium">View XML Sitemap</div>
                <div className="text-xs text-gray-500">Live dynamic sitemap</div>
              </div>
              <Globe size={18} className="text-gray-400" />
            </a>
            
            <a href="/robots.txt" target="_blank" className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <div className="font-medium">View Robots.txt</div>
                <div className="text-xs text-gray-500">Search engine crawler rules</div>
              </div>
              <FileText size={18} className="text-gray-400" />
            </a>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
            <h3 className="text-sm font-bold text-yellow-800 mb-1">Google Search Console</h3>
            <p className="text-xs text-yellow-700 mb-3">Remember to submit your sitemap.xml to Google Search Console to speed up indexing of new properties.</p>
            <Button variant="primary" size="sm" onClick={() => window.open('https://search.google.com/search-console', '_blank')}>Open Search Console</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
