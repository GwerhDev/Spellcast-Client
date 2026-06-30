import React from 'react';
import { PageTransition } from '../components/PageTransition';
import { DocumentEditForm } from '../features/DocumentEditForm';

export const DocumentEdit: React.FC = () => (
  <PageTransition className="dashboard-sections">
    <DocumentEditForm />
  </PageTransition>
);
