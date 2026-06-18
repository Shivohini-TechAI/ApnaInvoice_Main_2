import React from 'react';
import { Navigate } from 'react-router-dom';

interface InvoiceRouteGuardProps {
  children: React.ReactNode;
  requireProvider?: boolean;
}

const InvoiceRouteGuard: React.FC<InvoiceRouteGuardProps> = ({ 
  children
}) => {

  return <>{children}</>;
};

export default InvoiceRouteGuard;

