import { createContext, useContext, useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { APP_PACKAGE_VERSION } from './appVersion';
import { ApiError, apiGet, apiPost } from './api/client';
import { applyThemeMode, initialThemeMode, UiThemeMode } from './design-system/theme';
import { useWorkerResource } from './hooks/useWorkerResource';
import { payIntent, SolanaIntent } from './solana';

interface Product { id: string; handle: string; title: string; description: string; availableForSale: boolean; featuredImage?: { url: string; altText?: string | null } | null; priceRange: { minVariantPrice: { amount: string; currencyCode: string } }; variants: { nodes: Array<{ id: string; title: string; availableForSale: boolean }> } }
interface CampaignImage { url: string; altText?: string | null }
interface CampaignMedia { main: CampaignImage; alt1: CampaignImage; alt2: CampaignImage }
interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { totalAmount: { amount: string; currencyCode: string } };
  lines: { nodes: Array<{ id: string; quantity: number; merchandise: { id: string; title: string; product: { handle: string; title: string } } }> };
  deliveryGroups: { nodes: Array<{ id: string; deliveryOptions: Array<{ handle: string; title: string; description?: string | null; estimatedCost: { amount: string; currencyCode: string } }>; selectedDeliveryOption?: { handle: string } | null }> };
}
interface DeliveryAddress { firstName: string; lastName: string; address1: string; address2: string; city: string; provinceCode: string; zip: string; countryCode: string }
interface CartContextValue { cart?: Cart; loading: boolean; error?: ApiError; addProduct: (product: Product) => Promise<void>; removeLine: (lineId: string) => Promise<void>; updateDeliveryAddress: (address: DeliveryAddress) => Promise<void>; selectDeliveryOption: (deliveryGroupId: string, deliveryOptionHandle: string) => Promise<void> }

const CampaignMediaContext = createContext<CampaignMedia | undefined>(undefined);
const CartContext = createContext<CartContextValue | undefined>(undefined);
const CART_ID_KEY = '0x-shopify-cart-id';

function useCart() { const cart = useContext(CartContext); if (!cart) throw new Error('Cart context is unavailable.'); return cart; }

function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError>();
  const saveCart = (value: Cart) => { setCart(value); localStorage.setItem(CART_ID_KEY, value.id); };
  useEffect(() => {
    const id = localStorage.getItem(CART_ID_KEY);
    if (!id) { setLoading(false); return; }
    apiGet<{ cart: Cart }>(`/v1/carts/${encodeURIComponent(id)}`).then(({ data }) => saveCart(data.cart)).catch((cause: unknown) => {
      const apiError = cause instanceof ApiError ? cause : new ApiError('Unable to load the saved bag.');
      if (apiError.code === 'CART_NOT_FOUND') localStorage.removeItem(CART_ID_KEY);
      else setError(apiError);
    }).finally(() => setLoading(false));
  }, []);
  const addProduct = async (product: Product) => {
    const merchandise = product.variants.nodes.find((variant) => variant.availableForSale);
    if (!merchandise) throw new ApiError('This product has no available variant.', 'PRODUCT_UNAVAILABLE');
    setLoading(true); setError(undefined);
    try {
      const path = cart ? `/v1/carts/${encodeURIComponent(cart.id)}/lines` : '/v1/carts';
      const { data } = await apiPost<{ cart: Cart }>(path, { lines: [{ merchandiseId: merchandise.id, quantity: 1 }] });
      saveCart(data.cart);
    } catch (cause) { setError(cause instanceof ApiError ? cause : new ApiError('Unable to add this product to the bag.')); throw cause; } finally { setLoading(false); }
  };
  const removeLine = async (lineId: string) => {
    if (!cart) return;
    setLoading(true); setError(undefined);
    try { const { data } = await apiPost<{ cart: Cart }>(`/v1/carts/${encodeURIComponent(cart.id)}/lines/${encodeURIComponent(lineId)}`, { quantity: 0 }); saveCart(data.cart); } catch (cause) { setError(cause instanceof ApiError ? cause : new ApiError('Unable to update the bag.')); } finally { setLoading(false); }
  };
  const updateDeliveryAddress = async (address: DeliveryAddress) => {
    if (!cart) return;
    setLoading(true); setError(undefined);
    try { const { data } = await apiPost<{ cart: Cart }>(`/v1/carts/${encodeURIComponent(cart.id)}/delivery-address`, address); saveCart(data.cart); } catch (cause) { setError(cause instanceof ApiError ? cause : new ApiError('Unable to calculate delivery options.')); } finally { setLoading(false); }
  };
  const selectDeliveryOption = async (deliveryGroupId: string, deliveryOptionHandle: string) => {
    if (!cart) return;
    setLoading(true); setError(undefined);
    try { const { data } = await apiPost<{ cart: Cart }>(`/v1/carts/${encodeURIComponent(cart.id)}/delivery-options`, { options: [{ deliveryGroupId, deliveryOptionHandle }] }); saveCart(data.cart); } catch (cause) { setError(cause instanceof ApiError ? cause : new ApiError('Unable to select this delivery option.')); } finally { setLoading(false); }
  };
  return <CartContext.Provider value={{ cart, loading, error, addProduct, removeLine, updateDeliveryAddress, selectDeliveryOption }}>{children}</CartContext.Provider>;
}

function Price({ product }: { product: Product }) {
  const { amount, currencyCode } = product.priceRange.minVariantPrice;
  return <span>{new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode }).format(Number(amount))}</span>;
}

function ProductImage({ product, variant = 0, className = '' }: { product: Product; variant?: number; className?: string }) {
  const campaign = useContext(CampaignMediaContext);
  const [imageFailed, setImageFailed] = useState(false);
  const fallback = campaign && [campaign.main, campaign.alt1, campaign.alt2][variant % 3];
  const image = !imageFailed && product.featuredImage ? product.featuredImage : fallback;
  return <div className={`product-image ${className}`}>{image ? <img className={product.featuredImage && !imageFailed ? '' : 'product-image__placeholder'} src={image.url} alt={image.altText || product.title} onError={() => setImageFailed(true)} /> : <div className="product-image__fallback">Image unavailable</div>}</div>;
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  return <article className="product-card"><Link to={`/products/${product.handle}`}><ProductImage product={product} variant={index} /><div className="product-card__meta"><div><p className="eyebrow">Shopify product</p><h3>{product.title}</h3></div><Price product={product} /></div><p className={product.availableForSale ? 'availability' : 'availability availability--muted'}>{product.availableForSale ? 'Available in catalog' : 'Unavailable'}</p></Link></article>;
}

function CampaignArt({ image = 'main' }: { image?: keyof CampaignMedia }) {
  const campaign = useContext(CampaignMediaContext);
  const media = campaign?.[image];
  return <div className="campaign-art">{media ? <img src={media.url} alt={media.altText || '0x storefront campaign'} /> : <div className="campaign-art__fallback">Campaign image loading</div>}<b>0X / STOREFRONT</b></div>;
}

function ThemeToggle() {
  const [mode, setMode] = useState<UiThemeMode>(initialThemeMode);
  useEffect(() => applyThemeMode(mode), [mode]);
  return <button className="theme-toggle" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`}>{mode === 'dark' ? 'LT' : 'DK'}</button>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const campaign = useWorkerResource<CampaignMedia>('/v1/campaign-media');
  const { cart } = useCart();
  const closeMenu = () => setMenuOpen(false);
  return <CampaignMediaContext.Provider value={campaign.data}><main><div className="announcement"><span>Shopify commerce / custom payment gateway</span><span>Testnet demonstration only</span></div><header className="site-header"><nav aria-label="Primary navigation" className="site-nav"><Link className="wordmark" to="/" onClick={closeMenu}>0X<span>_</span></Link><button className="menu-toggle" aria-expanded={menuOpen} aria-controls="site-links" onClick={() => setMenuOpen(!menuOpen)}>Menu</button><div id="site-links" className={`site-links ${menuOpen ? 'site-links--open' : ''}`}><Link to="/shop" onClick={closeMenu}>Storefront</Link><Link to="/payment-demo" onClick={closeMenu}>Payment gateway</Link><Link to="/about" onClick={closeMenu}>Project</Link></div><div className="site-actions"><ThemeToggle /><Link to="/cart" aria-label="Open bag">Bag <sup>{String(cart?.totalQuantity || 0).padStart(2, '0')}</sup></Link></div></nav></header>{children}<footer className="site-footer"><div><Link className="wordmark" to="/">0X<span>_</span></Link><p>Shopify storefront.<br />Custom payment boundary.</p></div><div><p className="eyebrow">Navigate</p><Link to="/shop">Storefront</Link><Link to="/payment-demo">Payment gateway</Link><Link to="/about">Project scope</Link></div><div><p className="eyebrow">Portfolio boundary</p><p>Testnet only. No real funds, products, or Shopify Payments checkout.</p><small>Build {APP_PACKAGE_VERSION}</small></div></footer></main></CampaignMediaContext.Provider>;
}

function GatewaySummary() {
  return <section className="gateway-summary"><div><p className="eyebrow">Custom payment gateway</p><h2>SHOPIFY TOTALS.<br />WORKER-OWNED<br /><em>STATE.</em></h2></div><div className="gateway-steps"><article><span>01</span><h3>Shopify</h3><p>Catalog and eventual cart total are the source of truth.</p></article><article><span>02</span><h3>0x Worker</h3><p>Owns intent state, public API rules, and future ledger writes.</p></article><article><span>03</span><h3>Testnet verify</h3><p>Transfers must be server-verified before a demo order can settle.</p></article></div></section>;
}

function Home() {
  const { data, loading, error } = useWorkerResource<{ products: Product[] }>('/v1/products');
  const products = data?.products || [];
  return <><section className="hero"><div className="hero__copy"><p className="eyebrow">Shopify / Worker / testnet</p><h1>CUSTOM<br />CRYPTO<br /><em>GATEWAY.</em></h1><p className="hero__intro">A portfolio storefront demonstrating a payment boundary that keeps Shopify totals, payment intent state, and on-chain verification on the correct side of trust.</p><div className="hero__actions"><Link className="button button--solid" to="/payment-demo">View payment boundary</Link><Link className="button button--quiet" to="/shop">Open storefront</Link></div></div><CampaignArt /></section><GatewaySummary /><section className="section section--products"><div className="section-heading"><div><p className="eyebrow">Shopify storefront</p><h2>CATALOG<br /><em>PREVIEW.</em></h2></div><Link className="text-link" to="/shop">Open catalog <span>↗</span></Link></div>{loading && <div className="product-grid product-grid--loading">{[0, 1, 2].map((item) => <div className="product-skeleton" key={item} />)}</div>}{error && <div className="resource-state"><p className="eyebrow">Catalog unavailable</p><p>Shopify catalog data could not be loaded through the Worker.</p></div>}{!loading && !error && (products.length ? <div className="product-grid">{products.slice(0, 3).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="resource-state"><p className="eyebrow">Catalog pending</p><p>Campaign imagery is presentation-only. Publish Shopify products to demonstrate the catalog flow.</p></div>)}</section><section className="project-image"><CampaignArt image="alt1" /><div><p className="eyebrow">Why the storefront exists</p><h2>THE PAYMENT FLOW IS THE PRODUCT.</h2><p>Apparel gives the demo a real commerce context. The custom Worker gateway and safe settlement model are the work being demonstrated.</p><Link className="text-link" to="/payment-demo">Inspect the boundary <span>↗</span></Link></div></section></>;
}

function Shop() {
  const { data, loading, error } = useWorkerResource<{ products: Product[] }>('/v1/products');
  const [params, setParams] = useSearchParams();
  const availableOnly = params.get('availability') === 'available';
  const products = (data?.products || []).filter((product) => !availableOnly || product.availableForSale);
  return <section className="page"><header className="page-header"><p className="eyebrow">Shopify via 0x Worker</p><h1>STOREFRONT<br /><em>CATALOG.</em></h1><p>Product data is retrieved through the Worker. The browser never receives Shopify Admin credentials.</p></header><div className="catalog-tools"><span>{loading ? 'Synchronizing catalog' : `${products.length} products returned`}</span><button aria-pressed={availableOnly} onClick={() => setParams(availableOnly ? {} : { availability: 'available' })}>Availability: {availableOnly ? 'in stock' : 'all'}</button></div>{loading && <div className="product-grid product-grid--loading">{[0, 1, 2, 3].map((item) => <div className="product-skeleton" key={item} />)}</div>}{error && <div className="resource-state"><p className="eyebrow">Catalog unavailable</p><p>{error.message}</p></div>}{!loading && !error && (products.length ? <div className="product-grid product-grid--catalog">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="resource-state"><p className="eyebrow">No published products</p><p>Publish products in Shopify to demonstrate product and catalog data through the Worker.</p></div>)}</section>;
}

function ProductPage() {
  const { handle } = useParams();
  const { data, loading, error } = useWorkerResource<{ products: Product[] }>('/v1/products');
  const product = data?.products.find((item) => item.handle === handle);
  const { addProduct, loading: cartLoading, error: cartError } = useCart();
  if (loading) return <section className="page"><div className="product-detail product-detail--loading"><div className="product-skeleton" /><div className="product-skeleton" /></div></section>;
  if (error) return <section className="page"><div className="resource-state"><p className="eyebrow">Catalog unavailable</p><p>{error.message}</p></div></section>;
  if (!product) return <section className="page"><div className="resource-state"><p className="eyebrow">Product unavailable</p><h1>This product is not in the current Shopify response.</h1><Link className="button button--solid" to="/shop">Return to storefront</Link></div></section>;
  return <section className="page product-detail"><ProductImage product={product} className="product-detail__image" /><div className="product-detail__info"><p className="eyebrow">Shopify product / {product.availableForSale ? 'Available' : 'Unavailable'}</p><h1>{product.title}</h1><p className="product-price"><Price product={product} /></p><p className="product-description">{product.description || 'Product information supplied through the Shopify storefront response.'}</p><button className="button button--solid" disabled={!product.availableForSale || cartLoading} onClick={() => void addProduct(product)}>{cartLoading ? 'Updating bag' : product.availableForSale ? 'Add to bag' : 'Unavailable'}</button>{cartError && <p className="product-note" role="alert">{cartError.message}</p>}<p className="product-note">Shopify calculates this bag total. A future testnet payment intent will be bound to that Worker-fetched value.</p></div></section>;
}

function PaymentDemo() {
  return <section className="page payment-page"><header className="page-header"><p className="eyebrow">0x payment gateway</p><h1>TRUST<br /><em>BOUNDARY.</em></h1><p>A custom payment gateway demonstration for a Shopify development store. It does not replace Shopify Payments and it cannot accept real funds.</p></header><GatewaySummary /><section className="payment-detail"><article><p className="eyebrow">Browser</p><p>Can request storefront data and submit a future payment request. It cannot set authoritative amount, recipient, chain, or status.</p></article><article><p className="eyebrow">Worker</p><p>Will fetch the canonical Shopify cart, bind it to a payment intent, and enforce a single settlement.</p></article><article><p className="eyebrow">Verifier</p><p>Will confirm the ERC-20 transfer and required confirmations before a tagged Shopify demo order is updated.</p></article></section><div className="resource-state"><p className="eyebrow">Crypto checkout disabled</p><p>Chain, token decimals, conversion formula, quote expiry, confirmation count, and settlement policies have not been specified and tested. Payment controls remain unavailable by design.</p></div></section>;
}

function DeliveryEstimator({ cart }: { cart: Cart }) {
  const { loading, updateDeliveryAddress, selectDeliveryOption } = useCart();
  const [address, setAddress] = useState<DeliveryAddress>({ firstName: '', lastName: '', address1: '', address2: '', city: '', provinceCode: '', zip: '', countryCode: 'US' });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void updateDeliveryAddress(address); };
  const set = (key: keyof DeliveryAddress) => (event: React.ChangeEvent<HTMLInputElement>) => setAddress({ ...address, [key]: event.target.value });
  return <section className="delivery-estimator"><p className="eyebrow">Step 01 / Delivery</p><h2>CALCULATE<br /><em>THE TOTAL.</em></h2><p>Shopify calculates delivery and taxes from this one-time address before any future test-USDC quote.</p><form onSubmit={submit}><div className="delivery-grid"><input required placeholder="First name" value={address.firstName} onChange={set('firstName')} /><input required placeholder="Last name" value={address.lastName} onChange={set('lastName')} /><input required placeholder="Address" value={address.address1} onChange={set('address1')} /><input placeholder="Apartment, suite, etc." value={address.address2} onChange={set('address2')} /><input required placeholder="City" value={address.city} onChange={set('city')} /><input placeholder="State / province code" value={address.provinceCode} onChange={set('provinceCode')} /><input required placeholder="Postal code" value={address.zip} onChange={set('zip')} /><input required maxLength={2} placeholder="Country code" value={address.countryCode} onChange={(event) => setAddress({ ...address, countryCode: event.target.value.toUpperCase() })} /></div><button className="button button--quiet" disabled={loading}>{loading ? 'Calculating' : 'Calculate delivery'}</button></form>{cart.deliveryGroups.nodes.length > 0 && <div className="delivery-options"><p className="eyebrow">Step 02 / Select delivery</p>{cart.deliveryGroups.nodes.map((group) => group.deliveryOptions.length ? group.deliveryOptions.map((option) => <button key={option.handle} className={group.selectedDeliveryOption?.handle === option.handle ? 'delivery-option delivery-option--selected' : 'delivery-option'} disabled={loading} onClick={() => void selectDeliveryOption(group.id, option.handle)}><span>{option.title}{option.description ? ` / ${option.description}` : ''}</span><b>{new Intl.NumberFormat('en', { style: 'currency', currency: option.estimatedCost.currencyCode }).format(Number(option.estimatedCost.amount))}</b></button>) : <p key={group.id}>No Shopify delivery options are available for this address.</p>)}</div>}</section>;
}

function CryptoPayment({ cart }: { cart: Cart }) {
  const [message, setMessage] = useState<string>();
  const [working, setWorking] = useState(false);
  const ready = cart.deliveryGroups.nodes.length > 0 && cart.deliveryGroups.nodes.every((group) => group.selectedDeliveryOption);
  const pay = async () => {
    setWorking(true); setMessage(undefined);
    try {
      const { data } = await apiPost<{ intent: SolanaIntent }>('/v1/crypto/intents', { cartId: cart.id });
      setMessage(`Approve ${data.intent.displayAmount} test USDC in Phantom.`);
      const signature = await payIntent(data.intent);
      setMessage('Waiting for finalized Solana confirmation.');
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const { data: result } = await apiPost<{ status: string }> (`/v1/crypto/intents/${data.intent.id}/verify`, { signature });
        if (result.status === 'Verified testnet transfer') { setMessage(result.status); return; }
        await new Promise((resolve) => window.setTimeout(resolve, 2_500));
      }
      setMessage('Transaction submitted. Check again after Solana finalizes it.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Test-USDC payment could not be completed.'); } finally { setWorking(false); }
  };
  return <section className="crypto-payment"><p className="eyebrow">Step 03 / Solana Devnet</p><h2>PAY WITH<br /><em>TEST USDC.</em></h2><p>Phantom transfers the exact Shopify total. The Worker verifies the finalized transfer before creating the pending Shopify test order.</p><button className="button button--solid" disabled={!ready || working} onClick={() => void pay()}>{working ? 'Processing testnet transfer' : ready ? 'Pay with test USDC' : 'Select delivery first'}</button>{message && <p className="product-note" role="status">{message}</p>}</section>;
}

function CartPage() {
  const { cart, loading, error, removeLine } = useCart();
  if (loading && !cart) return <section className="page cart-page"><p className="eyebrow">Bag</p><h1>LOADING<br /><em>BAG.</em></h1></section>;
  if (!cart?.lines.nodes.length) return <section className="page cart-page"><p className="eyebrow">Bag / 00</p><h1>YOUR BAG IS<br /><em>EMPTY.</em></h1><p>Add a Shopify product to create a Worker-managed cart.</p><Link className="button button--solid" to="/shop">Continue browsing</Link></section>;
  return <section className="page cart-page"><p className="eyebrow">Bag / {String(cart.totalQuantity).padStart(2, '0')}</p><h1>YOUR<br /><em>BAG.</em></h1><div className="cart-lines">{cart.lines.nodes.map((line) => <article key={line.id}><div><p className="eyebrow">{line.merchandise.product.handle}</p><h2>{line.merchandise.product.title}</h2><p>{line.merchandise.title} / Qty {line.quantity}</p></div><button className="text-link" disabled={loading} onClick={() => void removeLine(line.id)}>Remove</button></article>)}</div><DeliveryEstimator cart={cart} /><p className="cart-total">{new Intl.NumberFormat('en', { style: 'currency', currency: cart.cost.totalAmount.currencyCode }).format(Number(cart.cost.totalAmount.amount))}</p><CryptoPayment cart={cart} /><a className="button button--quiet" href={cart.checkoutUrl}>Continue to Shopify test checkout</a>{error && <p className="product-note" role="alert">{error.message}</p>}<aside><p className="eyebrow">Demo boundary</p><p>Testnet only. A successful payment is labeled Verified testnet transfer after Worker verification and a pending Shopify test order.</p></aside></section>;
}

function About() {
  return <section className="page payment-page"><header className="page-header"><p className="eyebrow">Project scope</p><h1>COMMERCE<br /><em>WITHOUT TRUST.</em></h1><p>0x is a portfolio demonstration of a Shopify storefront behind a Cloudflare Worker payment boundary.</p></header><div className="payment-detail"><article><p className="eyebrow">Shopify</p><p>Catalog, future cart data, and tagged demo orders.</p></article><article><p className="eyebrow">Cloudflare Worker</p><p>Public API gateway, Shopify credential boundary, payment-intent ownership, and future ledger integration.</p></article><article><p className="eyebrow">Testnet only</p><p>Crypto settlement remains disabled until all payment parameters are defined and tested.</p></article></div></section>;
}

export function App() { return <CartProvider><Layout><Routes><Route path="/" element={<Home />} /><Route path="/shop" element={<Shop />} /><Route path="/products/:handle" element={<ProductPage />} /><Route path="/payment-demo" element={<PaymentDemo />} /><Route path="/cart" element={<CartPage />} /><Route path="/about" element={<About />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Layout></CartProvider>; }
