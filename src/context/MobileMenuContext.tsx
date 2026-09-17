'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MobileMenuContextProps {
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextProps | undefined>(undefined);

export const MobileMenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const openMenu = () => {
    setIsSearchOpen(false);
    setIsMenuOpen(true);
  };
  const closeMenu = () => setIsMenuOpen(false);

  const openSearch = () => {
    setIsMenuOpen(false);
    setIsSearchOpen(true);
  };
  const closeSearch = () => setIsSearchOpen(false);

  return (
    <MobileMenuContext.Provider value={{ 
      isMenuOpen, 
      openMenu, 
      closeMenu,
      isSearchOpen,
      openSearch,
      closeSearch
    }}>
      {children}
    </MobileMenuContext.Provider>
  );
};

export const useMobileMenu = () => {
  const context = useContext(MobileMenuContext);
  if (!context) {
    throw new Error('useMobileMenu must be used within a MobileMenuProvider');
  }
  return context;
};
