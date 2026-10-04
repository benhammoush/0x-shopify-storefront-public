import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('storefront routes', () => {
  it('keeps checkout unavailable until the Worker supports Shopify carts', () => {
    render(<MemoryRouter initialEntries={['/cart']}><App /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /your bag is offline/i })).toBeInTheDocument();
    expect(screen.getByText(/cart operations are intentionally unavailable/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /checkout/i })).not.toBeInTheDocument();
  });

  it('renders the custom payment boundary without enabling crypto checkout', () => {
    render(<MemoryRouter initialEntries={['/payment-demo']}><App /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /trust boundary/i })).toBeInTheDocument();
    expect(screen.getByText(/crypto checkout disabled/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pay/i })).not.toBeInTheDocument();
  });
});
