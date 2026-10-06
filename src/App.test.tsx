import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('storefront routes', () => {
  it('shows an empty Worker-managed bag before a Shopify cart exists', () => {
    render(<MemoryRouter initialEntries={['/cart']}><App /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /your bag is empty/i })).toBeInTheDocument();
    expect(screen.getByText(/worker-managed cart/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /checkout/i })).not.toBeInTheDocument();
  });

  it('renders the native-SOL payment boundary', () => {
    render(<MemoryRouter initialEntries={['/payment-demo']}><App /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /trust boundary/i })).toBeInTheDocument();
    expect(screen.getByText(/testnet-only conversion/i)).toBeInTheDocument();
    expect(screen.getByText(/jupiter sol\/usd market reference/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pay/i })).not.toBeInTheDocument();
  });
});
