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

  it('renders a local curated collection without requesting an unavailable collection API', () => {
    render(<MemoryRouter initialEntries={['/collections/transmissions']}><App /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Transmissions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /shop pieces/i })).toHaveAttribute('href', '/shop');
  });
});
