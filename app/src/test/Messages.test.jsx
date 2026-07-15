import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Messages from '../components/Messages.jsx';

describe('Messages', () => {
  it('renders nothing when messages array is empty', () => {
    const { container } = render(<Messages messages={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a user bubble with the message text', () => {
    render(<Messages messages={[{ role: 'user', text: 'Hello world' }]} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders an assistant bubble with the message text', () => {
    render(
      <Messages
        messages={[{ role: 'assistant', text: 'Here is the answer.', loading: false }]}
      />
    );
    expect(screen.getByText('Here is the answer.')).toBeInTheDocument();
  });

  it('shows a loading indicator when assistant message has loading: true', () => {
    render(
      <Messages
        messages={[
          { role: 'assistant', text: '', loading: true, repo: 'owner/repo', model: 'Llama 3.3 70B' },
        ]}
      />
    );
    // The thinking-dots span contains "Searching owner/repo..."
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it('does not show loading indicator when loading is false', () => {
    render(
      <Messages
        messages={[{ role: 'assistant', text: 'Done.', loading: false }]}
      />
    );
    expect(screen.queryByText(/searching/i)).not.toBeInTheDocument();
    expect(screen.getByText('Done.')).toBeInTheDocument();
  });

  it('renders file links for assistant messages with files', () => {
    render(
      <Messages
        messages={[
          {
            role: 'assistant',
            text: 'Answer',
            loading: false,
            repo: 'TyshaLong/advent-of-code-2025',
            files: ['src/index.js', 'README.md'],
          },
        ]}
      />
    );
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs.some((h) => h.includes('src/index.js'))).toBe(true);
    expect(hrefs.some((h) => h.includes('README.md'))).toBe(true);
  });

  it('does not render the files section when files array is empty', () => {
    render(
      <Messages
        messages={[{ role: 'assistant', text: 'Answer', loading: false, files: [] }]}
      />
    );
    expect(screen.queryByText(/read \d+ file/i)).not.toBeInTheDocument();
  });

  it('shows the correct "Read N files" label', () => {
    render(
      <Messages
        messages={[
          {
            role: 'assistant',
            text: 'Answer',
            loading: false,
            repo: 'owner/repo',
            files: ['a.js', 'b.js', 'c.js'],
          },
        ]}
      />
    );
    expect(screen.getByText(/read 3 files/i)).toBeInTheDocument();
  });

  it('uses singular "file" label when only one file is referenced', () => {
    render(
      <Messages
        messages={[
          {
            role: 'assistant',
            text: 'Answer',
            loading: false,
            repo: 'owner/repo',
            files: ['only.js'],
          },
        ]}
      />
    );
    expect(screen.getByText(/read 1 file\b/i)).toBeInTheDocument();
  });

  it('renders multiple messages in order', () => {
    render(
      <Messages
        messages={[
          { role: 'user', text: 'First question' },
          { role: 'assistant', text: 'First answer', loading: false },
          { role: 'user', text: 'Second question' },
        ]}
      />
    );
    expect(screen.getByText('First question')).toBeInTheDocument();
    expect(screen.getByText('First answer')).toBeInTheDocument();
    expect(screen.getByText('Second question')).toBeInTheDocument();
  });

  it('applies error styling when message has error: true', () => {
    render(
      <Messages
        messages={[{ role: 'assistant', text: 'Something went wrong', loading: false, error: true }]}
      />
    );
    const bubble = screen.getByText('Something went wrong').closest('.bubble-assistant');
    expect(bubble).toHaveStyle({ borderColor: '#7a2a2a' });
  });
});
