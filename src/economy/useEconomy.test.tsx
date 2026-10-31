import React, { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ECONOMY_STORAGE_KEY, createDefaultEconomy, type EconomyState } from './economyStore';
import {
  __resetEconomyCacheForTests,
  economyActions,
  useEconomy,
} from './useEconomy';

const Probe: React.FC<{ name: string }> = ({ name }) => {
  const economy = useEconomy();
  return (
    <div data-testid={name}>
      {economy.coins}|{economy.equipped.stone_skin}
    </div>
  );
};

function richState(): EconomyState {
  return { ...createDefaultEconomy(Date.now()), coins: 5000 };
}

describe('useEconomy React subscription', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetEconomyCacheForTests();
  });

  it('updates every subscriber once under StrictMode and persists purchases', () => {
    window.localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(richState()));

    render(
      <StrictMode>
        <Probe name="first" />
        <Probe name="second" />
      </StrictMode>
    );

    expect(screen.getByTestId('first')).toHaveTextContent('5000|skin_classic');
    expect(screen.getByTestId('second')).toHaveTextContent('5000|skin_classic');

    act(() => {
      economyActions.purchase('skin_turquoise', 'strict-mode-purchase');
    });

    expect(screen.getByTestId('first')).toHaveTextContent('4800|skin_turquoise');
    expect(screen.getByTestId('second')).toHaveTextContent('4800|skin_turquoise');

    act(() => {
      economyActions.equip('skin_turquoise');
    });

    expect(screen.getByTestId('first')).toHaveTextContent('4800|skin_turquoise');
    expect(screen.getByTestId('second')).toHaveTextContent('4800|skin_turquoise');

    const stored = JSON.parse(
      window.localStorage.getItem(ECONOMY_STORAGE_KEY) || '{}'
    ) as EconomyState;
    expect(stored.coins).toBe(4800);
    expect(stored.equipped.stone_skin).toBe('skin_turquoise');
    expect(stored.ownedItemIds).toContain('skin_turquoise');
  });

  it('keeps a single ledger entry for a repeated purchase request', () => {
    window.localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(richState()));
    render(
      <StrictMode>
        <Probe name="single" />
      </StrictMode>
    );

    act(() => {
      economyActions.purchase('skin_turquoise', 'same-request');
    });
    act(() => {
      economyActions.purchase('skin_turquoise', 'same-request');
    });

    const stored = JSON.parse(
      window.localStorage.getItem(ECONOMY_STORAGE_KEY) || '{}'
    ) as EconomyState;
    expect(stored.coins).toBe(4800);
    expect(stored.ledger.filter((entry) => entry.sourceId === 'same-request')).toHaveLength(1);
  });
});
