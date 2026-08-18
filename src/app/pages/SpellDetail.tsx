import React from 'react';
import { PageTransition } from '../components/PageTransition';
import { SpellDetail } from '../features/SpellDetail';

export const SpellDetailPage: React.FC = () => (
  <PageTransition className="dashboard-sections">
    <SpellDetail />
  </PageTransition>
);
