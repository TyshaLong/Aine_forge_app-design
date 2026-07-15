import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the canvas-based background so it doesn't crash in jsdom.
// The path must match the import path used inside App.jsx.
vi.mock('../components/ShapeGridBackground.jsx', () => ({ default: () => null }));

// Mock the API module so no real network calls are made.
vi.mock('../lib/api.js', () => ({
  askQuestion: vi.fn(),
}));

import App from '../App.jsx';
import { askQuestion } from '../lib/api.js';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App — initial render', () => {
  it('renders the Hero component when there are no messages', () => {
    render(<App />);
    expect(screen.getByText(/ask anything about your code/i)).toBeInTheDocument();
  });

  it('renders the chat input textarea', () => {
    render(<App />);
    expect(
      screen.getByPlaceholderText(/ask a question about your code/i)
    ).toBeInTheDocument();
  });

  it('renders the TopBar with the Ask tab active', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /ask/i })).toHaveClass('active');
  });
});

describe('App — sending a message', () => {
  it('shows the user message and a loading assistant bubble after submission', async () => {
    // Never resolves — lets us inspect the loading state
    askQuestion.mockReturnValue(new Promise(() => {}));

    render(<App />);
    const textarea = screen.getByPlaceholderText(/ask a question about your code/i);
    await userEvent.type(textarea, 'What does this repo do?');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.getByText('What does this repo do?')).toBeInTheDocument();
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it('replaces the loading bubble with the answer on success', async () => {
    askQuestion.mockResolvedValueOnce({
      answer: 'This repo does X.',
      files: ['src/index.js'],
    });

    render(<App />);
    const textarea = screen.getByPlaceholderText(/ask a question about your code/i);
    await userEvent.type(textarea, 'Explain the repo');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('This repo does X.')).toBeInTheDocument();
    });
    expect(screen.queryByText(/searching/i)).not.toBeInTheDocument();
  });

  it('shows an error message when the API call fails', async () => {
    askQuestion.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    const textarea = screen.getByPlaceholderText(/ask a question about your code/i);
    await userEvent.type(textarea, 'What is this?');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('clears the input after submission', async () => {
    askQuestion.mockResolvedValueOnce({ answer: 'ok', files: [] });

    render(<App />);
    const textarea = screen.getByPlaceholderText(/ask a question about your code/i);
    await userEvent.type(textarea, 'My question');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(textarea).toHaveValue('');
  });

  it('does not call askQuestion when the input is empty', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(askQuestion).not.toHaveBeenCalled();
  });

  it('hides the Hero and shows the user message after the first submission', async () => {
    askQuestion.mockReturnValue(new Promise(() => {}));

    render(<App />);
    expect(screen.getByText(/ask anything about your code/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/ask a question about your code/i);
    await userEvent.type(textarea, 'Hello');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.queryByText(/ask anything about your code/i)).not.toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('disables the send button while a request is in-flight', async () => {
    askQuestion.mockReturnValue(new Promise(() => {}));

    render(<App />);
    const textarea = screen.getByPlaceholderText(/ask a question about your code/i);
    await userEvent.type(textarea, 'Question');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });
});

describe('App — chip prefill', () => {
  it('fills the input when a Hero chip is clicked', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /explain auth flow/i }));
    expect(
      screen.getByPlaceholderText(/ask a question about your code/i)
    ).toHaveValue('Explain the auth flow');
  });
});

describe('App — tab navigation', () => {
  it('switches the active tab when a TopBar tab is clicked', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /wiki/i }));
    expect(screen.getByRole('button', { name: /wiki/i })).toHaveClass('active');
    expect(screen.getByRole('button', { name: /ask/i })).not.toHaveClass('active');
  });
});
