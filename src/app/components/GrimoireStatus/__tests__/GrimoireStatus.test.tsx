import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GrimoireStatus } from '../GrimoireStatus';

const labels = { inGrimoireLabel: 'In your grimoire', transcribeLabel: 'Transcribe to your grimoire' };

describe('GrimoireStatus', () => {
  it('shows the badge for a spell already in the grimoire, with no action', () => {
    render(<GrimoireStatus inGrimoire {...labels} onTranscribe={vi.fn()} />);
    expect(screen.getByTestId('grimoire-status-in')).toHaveTextContent('In your grimoire');
    expect(screen.queryByTestId('grimoire-status-transcribe')).not.toBeInTheDocument();
  });

  it('offers transcribing a spell that is not in the grimoire', () => {
    const onTranscribe = vi.fn();
    render(<GrimoireStatus inGrimoire={false} {...labels} onTranscribe={onTranscribe} />);
    fireEvent.click(screen.getByTestId('grimoire-status-transcribe'));
    expect(onTranscribe).toHaveBeenCalled();
    expect(screen.queryByTestId('grimoire-status-in')).not.toBeInTheDocument();
  });

  it('renders nothing when the spell is not in the grimoire and there is nothing to do', () => {
    const { container } = render(<GrimoireStatus inGrimoire={false} {...labels} />);
    expect(container).toBeEmptyDOMElement();
  });
});
