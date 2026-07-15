import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RepoBar from '../components/RepoBar.jsx';
import { REPOS } from '../lib/repos.js';

const DEFAULT_REPO = REPOS[0].full;

function renderBar(props = {}) {
  return render(
    <RepoBar repo={DEFAULT_REPO} onSelect={vi.fn()} {...props} />
  );
}

describe('RepoBar', () => {
  it('renders the "Knowledge Repo:" label', () => {
    renderBar();
    expect(screen.getByText(/knowledge repo/i)).toBeInTheDocument();
  });

  it('displays the currently selected repo in the toggle button', () => {
    renderBar({ repo: REPOS[0].full });
    expect(screen.getByText(REPOS[0].full)).toBeInTheDocument();
  });

  it('dropdown is hidden initially', () => {
    renderBar();
    // Dropdown items should not be visible before clicking the toggle
    expect(screen.queryByText('All repos')).not.toBeInTheDocument();
  });

  it('opens the dropdown when the toggle button is clicked', async () => {
    renderBar();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(DEFAULT_REPO) }));
    expect(screen.getByText('All repos')).toBeInTheDocument();
  });

  it('lists all repos in the dropdown', async () => {
    renderBar();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(DEFAULT_REPO) }));
    for (const repo of REPOS) {
      expect(screen.getAllByText(repo.full).length).toBeGreaterThan(0);
    }
  });

  it('calls onSelect with the repo full name when a repo is clicked', async () => {
    const onSelect = vi.fn();
    renderBar({ onSelect });
    await userEvent.click(screen.getByRole('button', { name: new RegExp(DEFAULT_REPO) }));
    // Click the second repo in the list
    const secondRepo = REPOS[1].full;
    await userEvent.click(screen.getByRole('button', { name: new RegExp(secondRepo) }));
    expect(onSelect).toHaveBeenCalledWith(secondRepo);
  });

  it('calls onSelect with "All repos" when that option is clicked', async () => {
    const onSelect = vi.fn();
    renderBar({ onSelect });
    await userEvent.click(screen.getByRole('button', { name: new RegExp(DEFAULT_REPO) }));
    await userEvent.click(screen.getByRole('button', { name: /^all repos$/i }));
    expect(onSelect).toHaveBeenCalledWith('All repos');
  });

  it('closes the dropdown after a repo is selected', async () => {
    renderBar();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(DEFAULT_REPO) }));
    expect(screen.getByText('All repos')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^all repos$/i }));
    expect(screen.queryByText('All repos')).not.toBeInTheDocument();
  });

  it('closes the dropdown when clicking outside', async () => {
    renderBar();
    await userEvent.click(screen.getByRole('button', { name: new RegExp(DEFAULT_REPO) }));
    expect(screen.getByText('All repos')).toBeInTheDocument();
    // Click outside the component
    await userEvent.click(document.body);
    expect(screen.queryByText('All repos')).not.toBeInTheDocument();
  });

  it('shows the GitHub link when a specific repo is selected', () => {
    renderBar({ repo: REPOS[0].full });
    const githubLinks = screen.getAllByRole('link', { name: /github/i });
    expect(githubLinks.length).toBeGreaterThan(0);
  });

  it('does not show the GitHub link when "All repos" is selected', () => {
    renderBar({ repo: 'All repos' });
    expect(screen.queryByRole('link', { name: /github/i })).not.toBeInTheDocument();
  });
});
