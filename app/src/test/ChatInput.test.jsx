import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInput from '../components/ChatInput.jsx';

function renderInput(props = {}) {
  const defaults = {
    value: '',
    onChange: vi.fn(),
    onSend: vi.fn(),
    disabled: false,
  };
  return render(<ChatInput {...defaults} {...props} />);
}

describe('ChatInput', () => {
  it('renders the textarea with the placeholder', () => {
    renderInput();
    expect(
      screen.getByPlaceholderText(/ask a question about your code/i)
    ).toBeInTheDocument();
  });

  it('renders the send button', () => {
    renderInput();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('calls onChange when the user types', async () => {
    const onChange = vi.fn();
    renderInput({ onChange });
    await userEvent.type(screen.getByRole('textbox'), 'hello');
    expect(onChange).toHaveBeenCalled();
  });

  it('calls onSend when Enter is pressed (without Shift)', async () => {
    const onSend = vi.fn();
    renderInput({ value: 'my question', onSend });
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, '{Enter}');
    expect(onSend).toHaveBeenCalledOnce();
  });

  it('does NOT call onSend when Shift+Enter is pressed', async () => {
    const onSend = vi.fn();
    renderInput({ value: 'my question', onSend });
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, '{Shift>}{Enter}{/Shift}');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('calls onSend when the send button is clicked', async () => {
    const onSend = vi.fn();
    renderInput({ onSend });
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).toHaveBeenCalledOnce();
  });

  it('disables the textarea and send button when disabled is true', () => {
    renderInput({ disabled: true });
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('does NOT call onSend on Enter when disabled is true', async () => {
    const onSend = vi.fn();
    renderInput({ value: 'question', onSend, disabled: true });
    const textarea = screen.getByRole('textbox');
    // Disabled textarea won't fire keydown, but guard is also in handler
    await userEvent.type(textarea, '{Enter}');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('renders the action chip buttons', () => {
    renderInput();
    expect(screen.getByRole('button', { name: /attach/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse prompts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter by file/i })).toBeInTheDocument();
  });

  it('reflects the controlled value in the textarea', () => {
    renderInput({ value: 'pre-filled text' });
    expect(screen.getByRole('textbox')).toHaveValue('pre-filled text');
  });
});
