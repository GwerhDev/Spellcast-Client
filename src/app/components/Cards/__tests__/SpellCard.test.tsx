import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpellCard } from '../SpellCard';
import { LanguageProvider } from '../../../../i18n';
import type { Spell } from '../../../../interfaces';

const mockDoc: Spell = {
  id: 'doc-1',
  userId: 'user-1',
  title: 'My Book',
  createdAt: new Date(),
} as Spell;

const renderCard = (props: Partial<React.ComponentProps<typeof SpellCard>> = {}) =>
  render(
    <LanguageProvider>
      <SpellCard
        doc={mockDoc}
        onClick={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        {...props}
      />
    </LanguageProvider>
  );

describe('SpellCard', () => {
  it('shows the play button when onPlay is provided and not in selection mode', () => {
    renderCard({ onPlay: vi.fn() });
    expect(screen.getByTestId('play-button')).toBeInTheDocument();
  });

  it('hides the play button while in selection mode', () => {
    renderCard({ onPlay: vi.fn(), selectionMode: true });
    expect(screen.queryByTestId('play-button')).not.toBeInTheDocument();
  });
});
