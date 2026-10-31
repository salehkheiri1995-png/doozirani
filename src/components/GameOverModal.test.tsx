import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameOverModal } from './GameOverModal';

function renderModal(overrides: Partial<Parameters<typeof GameOverModal>[0]> = {}) {
  const props = {
    isOpen: true,
    winner: 'player1' as const,
    reason: null,
    moveCount: 12,
    mode: 'pass_and_play' as const,
    variant: 'twelve_dooz' as const,
    scores: { player1: 1, player2: 0, draws: 0 },
    onRestart: vi.fn(),
    onOpenModes: vi.fn(),
    onBackToMenu: vi.fn(),
    ...overrides,
  };
  const view = render(<GameOverModal {...props} />);
  return { props, view };
}

describe('GameOverModal', () => {
  it('offers restart, change-mode and back-to-main-menu actions', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    const restart = screen.getByRole('button', { name: /دست جدید|شروع مجدد/ });
    const modes = screen.getByRole('button', { name: 'تغییر حالت یا نوع بازی' });
    const menu = screen.getByRole('button', { name: 'بازگشت به منوی اصلی' });

    await user.click(restart);
    await user.click(modes);
    await user.click(menu);

    expect(props.onRestart).toHaveBeenCalledTimes(1);
    expect(props.onOpenModes).toHaveBeenCalledTimes(1);
    expect(props.onBackToMenu).toHaveBeenCalledTimes(1);
  });

  it('still shows the menu action on a draw', () => {
    renderModal({ winner: 'draw' });
    expect(screen.getByRole('button', { name: 'بازگشت به منوی اصلی' })).toBeInTheDocument();
    expect(screen.getByText('بازی مساوی شد!')).toBeInTheDocument();
  });

  it('renders nothing when closed or without a winner', () => {
    const { view } = renderModal({ isOpen: false });
    expect(view.container).toBeEmptyDOMElement();

    const { view: v2 } = renderModal({ winner: null });
    expect(v2.container).toBeEmptyDOMElement();
  });
});
