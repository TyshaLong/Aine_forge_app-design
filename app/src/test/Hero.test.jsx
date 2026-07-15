import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Hero from '../components/Hero.jsx';

describe('Hero', () => {
  it('renders the headline text', () => {
    render(<Hero onPrefill={vi.fn()} onNavigateToCode={vi.fn()} />);
    expect(screen.getByText(/ask anything about your code/i)).toBeInTheDocument();
    expect(screen.getByText(/get answers in seconds/i)).toBeInTheDocument();
  });

  it('renders all quick-prompt chips', () => {
    render(<Hero onPrefill={vi.fn()} onNavigateToCode={vi.fn()} />);
    expect(screen.getByRole('button', { name: /explain auth flow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /find entry point/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /list api endpoints/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /test structure/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recent changes/i })).toBeInTheDocument();
  });

  it('calls onPrefill with the chip prompt when a chip is clicked', async () => {
    const onPrefill = vi.fn();
    render(<Hero onPrefill={onPrefill} onNavigateToCode={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /explain auth flow/i }));
    expect(onPrefill).toHaveBeenCalledWith('Explain the auth flow');
  });

  it('calls onPrefill with the correct prompt for each chip', async () => {
    const onPrefill = vi.fn();
    render(<Hero onPrefill={onPrefill} onNavigateToCode={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /find entry point/i }));
    expect(onPrefill).toHaveBeenLastCalledWith('Where is the main entry point?');

    await userEvent.click(screen.getByRole('button', { name: /list api endpoints/i }));
    expect(onPrefill).toHaveBeenLastCalledWith('List all API endpoints');
  });

  it('renders the "Build it in Code" button', () => {
    render(<Hero onPrefill={vi.fn()} onNavigateToCode={vi.fn()} />);
    expect(screen.getByRole('button', { name: /build it in code/i })).toBeInTheDocument();
  });

  it('opens the ConfirmDialog when "Build it in Code" is clicked', async () => {
    render(<Hero onPrefill={vi.fn()} onNavigateToCode={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /build it in code/i }));
    expect(screen.getByText(/switch to code mode/i)).toBeInTheDocument();
  });

  it('calls onNavigateToCode and closes the dialog when Continue is clicked', async () => {
    const onNavigateToCode = vi.fn();
    render(<Hero onPrefill={vi.fn()} onNavigateToCode={onNavigateToCode} />);

    await userEvent.click(screen.getByRole('button', { name: /build it in code/i }));
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(onNavigateToCode).toHaveBeenCalledOnce();
    expect(screen.queryByText(/switch to code mode/i)).not.toBeInTheDocument();
  });

  it('closes the dialog without calling onNavigateToCode when Cancel is clicked', async () => {
    const onNavigateToCode = vi.fn();
    render(<Hero onPrefill={vi.fn()} onNavigateToCode={onNavigateToCode} />);

    await userEvent.click(screen.getByRole('button', { name: /build it in code/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onNavigateToCode).not.toHaveBeenCalled();
    expect(screen.queryByText(/switch to code mode/i)).not.toBeInTheDocument();
  });
});
