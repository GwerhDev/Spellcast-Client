import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { faBoxArchive, faLock } from '@fortawesome/free-solid-svg-icons';
import { TabModal } from '../TabModal';

const tabs = [
  { id: 'one', icon: faBoxArchive, label: 'One', content: <p data-testid="content-one">one</p> },
  { id: 'two', icon: faLock, label: 'Two', content: <p data-testid="content-two">two</p> },
];

describe('TabModal', () => {
  it('shows one tab at a time, picked from the side', () => {
    render(<TabModal show onClose={vi.fn()} title="T" tabs={tabs} />);
    expect(screen.getByTestId('content-one')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tab-two'));
    expect(screen.queryByTestId('content-one')).not.toBeInTheDocument();
    expect(screen.getByTestId('content-two')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-modal-footer')).not.toBeInTheDocument();
  });

  it('a footer, when given, is the same under every tab', () => {
    render(<TabModal show onClose={vi.fn()} title="T" tabs={tabs} footer={<button data-testid="action">Go</button>} />);
    expect(screen.getByTestId('tab-modal-footer')).toContainElement(screen.getByTestId('action'));
    fireEvent.click(screen.getByTestId('tab-two'));
    expect(screen.getByTestId('tab-modal-footer')).toContainElement(screen.getByTestId('action'));
  });
});
