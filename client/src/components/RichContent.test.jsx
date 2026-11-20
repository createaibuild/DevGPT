import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RichContent from './RichContent';
import { renderWithTheme } from '../test/render';

const markdown = `
Hello

| Part | What you should see |
| --- | --- |
| Sign in | Your account |

[docs](https://example.com/docs)
[bad](javascript:alert(1))
`;

describe('RichContent', () => {
  it('renders a table and keeps only safe links', () => {
    renderWithTheme(<RichContent text={markdown} />);

    expect(screen.getByRole('cell', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'docs' })).toHaveAttribute('href', 'https://example.com/docs');
    expect(screen.getByText('bad').closest('a')).toHaveAttribute('href', '');
  });
});
