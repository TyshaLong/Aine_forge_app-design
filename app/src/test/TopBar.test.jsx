import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopBar from '../components/TopBar.jsx';

describe('TopBar', () => {
  it('renders the Dashboard title', () => {
    render(<TopBar activeTab="ask" onTabChange={vi.fn()} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders all three tab buttons', () => {
    render(<TopBar activeTab="ask" onTabChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /ask/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wiki/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /code/i })).toBeInTheDocument();
  });

  it('applies the active class to the currently active tab', () => {
    render(<TopBar activeTab="wiki" onTabChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /wiki/i })).toHaveClass('active');
    expect(screen.getByRole('button', { name: /ask/i })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: /code/i })).not.toHaveClass('active');
  });

  it('calls onTabChange with "ask" when the Ask tab is clicked', async () => {
    const onTabChange = vi.fn();
    render(<TopBar activeTab="wiki" onTabChange={onTabChange} />);
    await userEvent.click(screen.getByRole('button', { name: /ask/i }));
    expect(onTabChange).toHaveBeenCalledWith('ask');
  });

  it('calls onTabChange with "wiki" when the Wiki tab is clicked', async () => {
    const onTabChange = vi.fn();
    render(<TopBar activeTab="ask" onTabChange={onTabChange} />);
    await userEvent.click(screen.getByRole('button', { name: /wiki/i }));
    expect(onTabChange).toHaveBeenCalledWith('wiki');
  });

  it('calls onTabChange with "code" when the Code tab is clicked', async () => {
    const onTabChange = vi.fn();
    render(<TopBar activeTab="ask" onTabChange={onTabChange} />);
    await userEvent.click(screen.getByRole('button', { name: /code/i }));
    expect(onTabChange).toHaveBeenCalledWith('code');
  });
});
