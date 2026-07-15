import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

describe('ConfirmDialog', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Title"
        message="Message"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the title and message when open is true', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Switch to Code mode?"
        message="You will leave Ask mode."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Switch to Code mode?')).toBeInTheDocument();
    expect(screen.getByText('You will leave Ask mode.')).toBeInTheDocument();
  });

  it('calls onConfirm when the Continue button is clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Title"
        message="Message"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when the Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Title"
        message="Message"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
