# 0x Shopify Storefront

Portfolio clothing storefront built with React, Vite, TypeScript, React Router, and Tailwind. Shopify is accessed only through the companion Cloudflare Worker API.

Its UI uses the Iris token-system approach: light/dark palettes, compact operational metadata, bordered surface panels, and responsive primitives. Its digital-underground editorial composition is distinct from Iris's dashboard layouts.

## Demo Boundary

- Shopify development store provides catalog data.
- The Worker, not the browser, accesses Shopify.
- Crypto checkout is testnet-only and disabled until its payment specification is implemented and tested.
- This is not Shopify Payments or a Shopify-approved payment method.
- No real funds or products are accepted.

## Storefront Scope

- Editorial home, catalog, curated collections, product-detail routes, bag boundary, and manifesto are active.
- The catalog is sourced only through the Worker endpoint at `/v1/products`.
- The bag is intentionally non-transactional until the Worker exposes verified Shopify cart endpoints.
- Product, collection, and bag presentation must never imply that checkout or crypto settlement is available.

## Local Development

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `VITE_API_BASE` to the Worker origin. The development default is `http://localhost:8787`.

## Verification

```powershell
npm test
npm run build
```

## Deployment

Deploy `dist` to Vercel and set `VITE_API_BASE` for the deployed Worker. Configure the Worker's `CORS_ORIGINS` with the exact storefront origin.
