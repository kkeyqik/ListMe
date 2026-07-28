import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  // Generate JSON-LD for breadcrumbs
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': 'https://listme.in/'
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        'position': index + 2,
        'name': item.label,
        ...(item.href ? { item: `https://listme.in${item.href}` } : {})
      }))
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="py-3 overflow-x-auto whitespace-nowrap">
        <ol className="flex items-center text-sm text-gray-500">
          <li>
            <Link href="/" className="flex items-center hover:text-primary transition-colors">
              <Home size={14} className="mr-1" />
              <span>Home</span>
            </Link>
          </li>
          
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <React.Fragment key={index}>
                <ChevronRight size={14} className="mx-2 text-gray-400 flex-shrink-0" />
                <li>
                  {isLast || !item.href ? (
                    <span className="text-gray-900 font-medium truncate max-w-[200px] inline-block align-bottom" aria-current={isLast ? "page" : undefined}>
                      {item.label}
                    </span>
                  ) : (
                    <Link href={item.href} className="hover:text-primary transition-colors">
                      {item.label}
                    </Link>
                  )}
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      </nav>
    </>
  );
};
