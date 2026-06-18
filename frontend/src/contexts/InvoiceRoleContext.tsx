import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';

export type InvoiceRole = 'provider' | 'user' | null;

interface InvoiceRoleContextType {
  invoiceRole: InvoiceRole;
  setInvoiceRole: (role: InvoiceRole) => void;
  isProvider: boolean;
  isUser: boolean;
}

const InvoiceRoleContext = createContext<InvoiceRoleContextType | undefined>(undefined);

export const useInvoiceRole = () => {
  const context = useContext(InvoiceRoleContext);

  if (context === undefined) {
    throw new Error('useInvoiceRole must be used within an InvoiceRoleProvider');
  }

  return context;
};

interface InvoiceRoleProviderProps {
  children: ReactNode;
}

const getStoredInvoiceRole = (): InvoiceRole => {
  const saved = sessionStorage.getItem('invoice_role');
  return saved === 'provider' || saved === 'user' ? saved : null;
};

export const InvoiceRoleProvider: React.FC<InvoiceRoleProviderProps> = ({ children }) => {
  const [invoiceRole, setInvoiceRoleState] = useState<InvoiceRole>(() =>
    getStoredInvoiceRole()
  );

  useEffect(() => {
    const handleInvoiceRoleUpdated = () => {
      const newRole = getStoredInvoiceRole();

      setInvoiceRoleState((currentRole) => {
        if (currentRole === newRole) {
          return currentRole;
        }

        return newRole;
      });
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'invoice_role') {
        handleInvoiceRoleUpdated();
      }
    };

    window.addEventListener('invoiceRoleUpdated', handleInvoiceRoleUpdated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('invoiceRoleUpdated', handleInvoiceRoleUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setInvoiceRole = (role: InvoiceRole) => {
    setInvoiceRoleState((currentRole) => {
      if (currentRole === role) {
        return currentRole;
      }

      return role;
    });

    if (role) {
      sessionStorage.setItem('invoice_role', role);
    } else {
      sessionStorage.removeItem('invoice_role');
    }

    window.dispatchEvent(new Event('invoiceRoleUpdated'));
  };

  const value = useMemo(
    () => ({
      invoiceRole,
      setInvoiceRole,
      isProvider: invoiceRole === 'provider',
      isUser: invoiceRole === 'user',
    }),
    [invoiceRole]
  );

  return (
    <InvoiceRoleContext.Provider value={value}>
      {children}
    </InvoiceRoleContext.Provider>
  );
};