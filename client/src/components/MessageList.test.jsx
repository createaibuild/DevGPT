import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MessageList from './MessageList';
import { renderWithTheme } from '../test/render';

function renderList(props) {
  return renderWithTheme(
    <MessageList
      messages={[]}
      streaming={false}
      loading={false}
      greeting="Ada"
      onSuggest={vi.fn()}
      onAction={vi.fn()}
      {...props}
    />,
  );
}

describe('MessageList', () => {
  it('shows starter prompts on an empty chat and sends the chosen text', async () => {
    const user = userEvent.setup();
    const onSuggest = vi.fn();
    renderList({ onSuggest });

    expect(screen.getByText('What can I help with, Ada?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Compare options/ }));
    expect(onSuggest).toHaveBeenCalledWith('Compare REST and GraphQL in a table.');
  });

  it('renders user text as plain text and assistant markdown as a table', () => {
    renderList({
      messages: [
        { id: 'u1', role: 'user', content: '**not bold**' },
        { id: 'a1', role: 'assistant', content: '| A | B |\n| --- | --- |\n| 1 | 2 |' },
      ],
    });

    expect(screen.getByText('**not bold**')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explain more' })).toBeInTheDocument();
  });

  it('hides follow-up chips while the reply is still streaming', () => {
    renderList({
      streaming: true,
      messages: [
        { id: 'u1', role: 'user', content: 'Hi' },
        { id: 'a1', role: 'assistant', content: 'Hello' },
      ],
    });

    expect(screen.queryByRole('button', { name: 'Explain more' })).not.toBeInTheDocument();
  });
});