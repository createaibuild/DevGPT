import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Composer from './Composer';
import { renderWithTheme } from '../test/render';

describe('Composer', () => {
  it('sends on Enter and keeps the draft on Shift+Enter', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(true);
    renderWithTheme(<Composer streaming={false} onSend={onSend} onStop={vi.fn()} />);
    const box = screen.getByRole('textbox', { name: 'Message' });

    await user.type(box, 'Hello');
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('Hello');
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('puts the text back when send fails', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(false);
    renderWithTheme(<Composer streaming={false} onSend={onSend} onStop={vi.fn()} />);
    const box = screen.getByRole('textbox', { name: 'Message' });

    await user.type(box, 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSend).toHaveBeenCalledWith('Hello');
    await waitFor(() => expect(box).toHaveValue('Hello'));
  });

  it('stops the reply instead of sending while a response is streaming', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const onStop = vi.fn();
    renderWithTheme(<Composer streaming onSend={onSend} onStop={onStop} />);

    await user.click(screen.getByRole('button', { name: 'Stop reply' }));
    expect(onStop).toHaveBeenCalledOnce();
    expect(onSend).not.toHaveBeenCalled();
  });
});
