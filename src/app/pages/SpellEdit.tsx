import React from 'react';
import { PageTransition } from '../components/PageTransition';
import { SpellEditForm } from '../features/SpellEditForm';

export const SpellEdit: React.FC = () => (
  <PageTransition className="dashboard-sections">
    <SpellEditForm />
  </PageTransition>
);
