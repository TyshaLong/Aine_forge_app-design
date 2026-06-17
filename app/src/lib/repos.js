// Repos shown in the app, linked to their matching GitHub repositories.
// `short` = label in the sidebar, `full` = owner/name used as the knowledge repo,
// `url` = the live GitHub page.
export const REPOS = [
  {
    short: 'advent-of-code-2025',
    full: 'TyshaLong/advent-of-code-2025',
    url: 'https://github.com/TyshaLong/advent-of-code-2025',
    indexed: true,
  },
  {
    short: 'karlhadwen/todoist',
    full: 'karlhadwen/todoist',
    url: 'https://github.com/karlhadwen/todoist',
    indexed: true,
  },
];

export function repoUrl(full) {
  const match = REPOS.find((r) => r.full === full);
  return match ? match.url : `https://github.com/${full}`;
}
