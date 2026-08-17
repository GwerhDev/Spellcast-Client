import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrimaryButton } from '../PrimaryButton';

describe('PrimaryButton', () => {
  it('renders its text/children and fires onClick', () => {
    const onClick = vi.fn();
    render(<PrimaryButton data-testid="primary-button" onClick={onClick}>Continue</PrimaryButton>);
    const btn = screen.getByTestId('primary-button');
    expect(btn).toHaveTextContent('Continue');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('respects the disabled prop', () => {
    const onClick = vi.fn();
    render(<PrimaryButton data-testid="primary-button" onClick={onClick} disabled>Continue</PrimaryButton>);
    expect(screen.getByTestId('primary-button')).toBeDisabled();
  });

  it('applies the danger variant class', () => {
    render(<PrimaryButton data-testid="primary-button" variant="danger">Delete</PrimaryButton>);
    expect(screen.getByTestId('primary-button').className).toMatch(/danger/);
  });

  it('applies the accent (bronze) variant class', () => {
    render(<PrimaryButton data-testid="primary-button" variant="accent">Unlock</PrimaryButton>);
    expect(screen.getByTestId('primary-button').className).toMatch(/accent/);
  });

  it('defaults to no variant class when none is given', () => {
    render(<PrimaryButton data-testid="primary-button">Continue</PrimaryButton>);
    const className = screen.getByTestId('primary-button').className;
    expect(className).not.toMatch(/danger/);
    expect(className).not.toMatch(/accent/);
  });
});
