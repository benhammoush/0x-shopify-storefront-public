import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { APP_PACKAGE_VERSION } from './appVersion';
import { applyThemeMode, initialThemeMode, UiThemeMode } from './design-system/theme';
import { useWorkerResource } from './hooks/useWorkerResource';

interface Product {
  id: string;
  title: string;
  availableForSale: boolean;
  featuredImage?: { url: string; altText?: string | null } | null;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
}

function ThemeToggle() {
  const [mode, setMode] = useState<UiThemeMode>(initialThemeMode);
  useEffect(() => applyThemeMode(mode), [mode]);
  return <button className="commerce-theme-button" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} aria-label="Toggle color theme">{mode === 'dark' ? 'LIGHT' : 'DARK'}</button>;
}

function Layout({ children }: { children: React.ReactNode }) {
  return <main className="commerce-shell">
    <header className="commerce-header">
      <div className="commerce-header-inner">
        <Link className="commerce-brand" to="/"><span className="commerce-brand-mark">0</span><span>0X</span></Link>
        <span className="commerce-version">v{APP_PACKAGE_VERSION}</span>
        <span className="commerce-divider" aria-hidden="true" />
        <nav className="commerce-nav" aria-label="Primary navigation">
          <NavLink to="/shop">SHOP</NavLink>
          <NavLink to="/about">ARCHITECTURE</NavLink>
        </nav>
        <div className="commerce-header-actions"><span className="commerce-live"><i />TESTNET DEMO</span><ThemeToggle /></div>
      </div>
    </header>
    <div className="commerce-disclosure"><strong>EXPERIMENTAL:</strong> Shopify development-store catalog. No real funds, products, or Shopify Payments checkout.</div>
    {children}
    <footer className="commerce-footer"><span>0X / SHOPIFY HEADLESS DEMO</span><span>WORKER-VERIFIED TESTNET TRANSFERS: DISABLED</span></footer>
  </main>;
}

function PageHeading({ eyebrow, title, detail, block }: { eyebrow: string; title: string; detail: string; block: string }) {
  return <div className="commerce-page-heading"><div><p className="commerce-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{detail}</p></div><span className="commerce-block">{block}</span></div>;
}

function Home() {
  return <section className="commerce-page commerce-home">
    <PageHeading eyebrow="0X / DIGITAL COMMERCE" title="Wear the signal. Keep the proof." detail="A composable Shopify storefront with an edge-first payment boundary." block="PORTFOLIO BUILD" />
    <div className="commerce-home-grid">
      <article className="commerce-panel commerce-hero-panel"><p className="commerce-kicker">SYSTEM OVERVIEW</p><h2>Commerce without a hidden trust boundary.</h2><p>Shopify owns product and cart data. The Worker defines the public API contract. Future crypto settlement will be independently verified before a demo order is updated.</p><Link className="commerce-button" to="/shop">EXPLORE CATALOG <span>→</span></Link></article>
      <aside className="commerce-panel commerce-flow-panel"><div className="commerce-panel-heading"><h2>PAYMENT BOUNDARY</h2><span>4 STAGES</span></div><ol className="commerce-flow"><li><b>01</b><div><strong>SHOPIFY</strong><small>Catalog and cart totals</small></div></li><li><b>02</b><div><strong>WORKER</strong><small>Intent and ledger ownership</small></div></li><li><b>03</b><div><strong>TESTNET</strong><small>Server-side transfer verification</small></div></li><li><b>04</b><div><strong>DEMO ORDER</strong><small>Tagged Shopify record</small></div></li></ol></aside>
    </div>
    <div className="commerce-metrics"><article><p>COMMERCE BACKEND</p><strong>SHOPIFY</strong><small>Development-store integration</small></article><article><p>PUBLIC API</p><strong>WORKER</strong><small>Cloudflare edge contract</small></article><article><p>PAYMENT MODE</p><strong className="commerce-positive">TESTNET</strong><small>Disabled pending approved rules</small></article></div>
  </section>;
}

function Shop() {
  const { data, loading, error } = useWorkerResource<{ products: Product[] }>('/v1/products');
  return <section className="commerce-page"><PageHeading eyebrow="SHOPIFY / STOREFRONT API" title="Catalog" detail="Products are normalized by the 0x Worker before reaching the browser." block={loading ? 'SYNCING' : `${data?.products.length || 0} PRODUCTS`} />
    {loading && <div className="commerce-panel commerce-empty">Loading Shopify catalog…</div>}
    {error && <div className="commerce-alert"><strong>CATALOG UNAVAILABLE</strong><span>{error.message}</span></div>}
    <div className="commerce-catalog-grid">{data?.products.map((product) => <article key={product.id} className="commerce-product-card"><div className="commerce-product-image">{product.featuredImage ? <img src={product.featuredImage.url} alt={product.featuredImage.altText || product.title} /> : <span>0X</span>}</div><div className="commerce-product-body"><div><h2>{product.title}</h2><p>{product.priceRange.minVariantPrice.amount} {product.priceRange.minVariantPrice.currencyCode}</p></div><span className={product.availableForSale ? 'commerce-status commerce-status-live' : 'commerce-status'}>{product.availableForSale ? 'AVAILABLE' : 'UNAVAILABLE'}</span></div></article>)}</div>
  </section>;
}

function About() {
  return <section className="commerce-page commerce-about"><PageHeading eyebrow="ARCHITECTURE / SAFETY" title="A demonstrable boundary." detail="The system makes payment-state ownership explicit instead of trusting a browser callback." block="TESTNET ONLY" />
    <article className="commerce-panel commerce-prose"><h2>Not a payment gateway</h2><p>This portfolio uses Shopify for catalog and cart data. Crypto checkout is intentionally disabled until its exact testnet token conversion and confirmation policy are specified, implemented, and tested.</p><dl><div><dt>Shopify</dt><dd>Catalog, variants, cart data, and tagged demo orders.</dd></div><div><dt>Cloudflare Worker</dt><dd>Public API envelope, Shopify credentials, and future payment ledger.</dd></div><div><dt>Browser</dt><dd>Presentation only. It cannot decide price, payment status, or order state.</dd></div></dl></article>
  </section>;
}

export function App() { return <Layout><Routes><Route path="/" element={<Home />} /><Route path="/shop" element={<Shop />} /><Route path="/about" element={<About />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Layout>; }
