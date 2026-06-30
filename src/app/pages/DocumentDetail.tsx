import React from 'react';
import { PageTransition } from '../components/PageTransition';
import { DocumentDetail } from '../features/DocumentDetail';

export const DocumentDetailPage: React.FC = () => (
  <PageTransition className="dashboard-sections">
    <DocumentDetail />
  </PageTransition>
);
