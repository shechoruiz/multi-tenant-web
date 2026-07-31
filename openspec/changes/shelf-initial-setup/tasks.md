# Tasks: Shelf MVP — Configuración Inicial

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 6,500–9,000 |
| 400-line budget risk | **High** |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Work Units (Chained PRs)

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| Scaffolding | Turborepo + configs + Prisma + Docker + shared types | PR 1 | `pnpm lint && pnpm typecheck` | `pnpm dev` + `curl localhost:3001/health` | `git revert` — no migrations applied |
| Backend Auth & Middleware | Fastify plugins, JWT, refresh rotation, resolve-tenant, require-role, seed | PR 2 | `pnpm --filter api test` — auth integration tests | `pnpm dev` + `POST /auth/login` | `git revert` — no data migration |
| Backend Capabilities (tenants + catalog) | Tenant CRUD, theme preview/publish, product/category CRUD, images | PR 3 | `pnpm --filter api test` — tenant + catalog tests | `pnpm dev` + `POST /api/tenants` | `git revert` — schema + seed exist |
| Backend Capabilities (cart + orders) | Cart CRUD, merge, stock validation, checkout, state machine, order history | PR 4 | `pnpm --filter api test` — cart + order tests | `pnpm dev` + `POST /api/orders/checkout` | `git revert` — isolated plugin |
| Frontend Foundation | Vite + shadcn/ui + layouts + Router + Zustand stores + theme + auth guard | PR 5 | `pnpm --filter web test` — hook + store unit tests | `pnpm dev` + visit `/:tenantSlug` | `git revert` — no server coupling |
| Frontend Pages | Admin pages, public product/category, login, cart UI | PR 6 | `pnpm --filter web test` — component tests | `pnpm dev` + full UI walkthrough | `git revert` — pages only |

## Phase 1: Foundation & Scaffolding

- [x] 1.1 Init Turborepo + pnpm workspaces: root `package.json`, `turbo.json`, `pnpm-workspace.yaml`
- [x] 1.2 Create `packages/config`: shared `tsconfig.json`, ESLint flat config, `package.json`
- [x] 1.3 Scaffold `apps/web` with Vite + React + TypeScript + Tailwind
- [x] 1.4 Init shadcn/ui: `npx shadcn@latest init`, configure CSS variables
- [x] 1.5 Scaffold `apps/api` with Fastify + TypeScript + tsx watch mode
- [x] 1.6 Create `packages/db` with Prisma schema + client generator + `prisma-zod-generator` (note: prisma-zod-generator v2.x requires Prisma >=7, currently on 5.22.0 — upgrade Prisma before using Zod generated schemas)
- [x] 1.7 Create `packages/shared` with barrel exports and path aliases
- [x] 1.8 Create `docker-compose.yml` with PostgreSQL + pgAdmin
- [x] 1.9 Wire `turbo.json` pipelines: dev, build, lint, test, typecheck

## Phase 2: Prisma Schema & Shared Types

- [x] 2.1 Write full Prisma schema: Tenant, User, RefreshToken, Product, Category, ProductImage, Cart, CartItem, Order, OrderItem, OrderHistory + enums (Status, Role, ProductStatus, OrderStatus)
- [x] 2.2 Create `packages/shared/src/types/tenant.ts`: Tenant, TenantTheme, CreateTenantDTO, UpdateThemeDTO
- [x] 2.3 Create `packages/shared/src/types/auth.ts`: LoginRequest, JwtPayload, AuthResponse, ForgotPasswordRequest, ResetPasswordRequest
- [x] 2.4 Create `packages/shared/src/types/product.ts`: ProductDTO, CreateProductDTO, ProductFilters
- [x] 2.5 Create `packages/shared/src/types/category.ts`: CategoryDTO, CategoryTreeNode
- [x] 2.6 Create `packages/shared/src/types/cart.ts`: CartDTO, CartItemDTO, AddCartItemDTO, MergeCartDTO, MergeWarning, CartStore
- [x] 2.7 Create `packages/shared/src/types/order.ts`: OrderDTO, OrderItemDTO, OrderHistoryEntry, OrderFilters, OrderStatusChangedEvent
- [x] 2.8 Create `packages/shared/src/types/asset.ts`: AssetStore interface, ImageSizes
- [x] 2.9 Create `packages/shared/src/types/role.ts`: Role enum, hasMinRole utility
- [x] 2.10 Write Prisma seed: demo tenant (`tienda-demo`) + super-admin user
- [x] 2.11 Generate migration, verify `prisma db push` connects to PostgreSQL
- [x] 2.12 Verify: `pnpm lint`, `pnpm typecheck` pass across all packages

## Phase 3: Backend — Auth & Middleware

- [x] 3.1 Create `apps/api/src/lib/jwt.ts`: sign/verify JWT with HS256, JwtPayload type
- [x] 3.2 Create `apps/api/src/lib/password.ts`: bcrypt hash/compare
- [x] 3.3 Create `apps/api/src/lib/state-machine.ts`: OrderStatus canTransition with typed transitions map
- [x] 3.4 Create `apps/api/src/lib/order-number.ts`: order number generator `ORD-YYYYMMDD-XXXXXXXX`
- [x] 3.5 Create `apps/api/src/lib/events.ts`: EventEmitter wrapper with typed event contracts
- [x] 3.6 Create `apps/api/src/middleware/resolve-tenant.ts`: extract slug from path params → Prisma lookup → attach tenantId to request
- [x] 3.7 Create `apps/api/src/middleware/require-role.ts`: verify JWT in Authorization header, check role hierarchy
- [x] 3.8 Create `apps/api/src/middleware/scope-tenant.ts`: Prisma extension that injects tenantId into all queries
- [x] 3.9 Create `apps/api/src/plugins/auth.ts`: POST /auth/login, POST /auth/refresh, POST /auth/logout, POST /auth/forgot-password, POST /auth/reset-password

## Phase 4: Backend — Capability Plugins

- [x] 4.1 Create tenant plugin: CRUD /api/tenants + theme preview/publish + GET public theme
- [x] 4.2 Create `apps/api/src/lib/asset-store.ts`: FS-based AssetStore with put/get/delete
- [x] 4.3 Create `apps/api/src/lib/image-processor.ts`: Sharp resize (thumb/medium/full) + format validation
- [x] 4.4 Create assets plugin: POST /api/assets/upload with Sharp pipeline
- [x] 4.5 Create catalog plugin: public GET /api/products, GET /api/products/:id, GET /api/categories
- [x] 4.6 Create admin-catalog plugin: admin CRUD products + categories + upload
- [x] 4.7 Create cart plugin: GET /api/cart, POST/PATCH/DELETE /api/cart/items, DELETE /api/cart, GET /api/cart/price
- [x] 4.8 Create cart-merge plugin: POST /api/cart/merge with dedup + stock adjust + inactive removal + warnings
- [x] 4.9 Create `apps/api/src/middleware/validate-cart.ts`: tenant-ownership check for cart items
- [x] 4.10 Create orders plugin: POST /api/orders/checkout (transactional), GET /api/orders, GET /api/orders/:id, PATCH status, POST cancel

## Phase 5: Frontend — Foundation & Stores

- [x] 5.1 Configure React Router v7 with `/:tenantSlug/*` layout route + auth guard
- [x] 5.2 Create `apps/web/src/lib/api.ts`: fetch client with cookie forwarding + auto-refresh on 401
- [x] 5.3 Create `apps/web/src/lib/theme.ts`: inject CSS variables from TenantTheme into `<html>` style
- [x] 5.4 Create `apps/web/src/hooks/useTenant.ts`: load tenant by slug, expose tenant context
- [x] 5.5 Create `apps/web/src/hooks/useTheme.ts`: load published theme, apply CSS variables
- [x] 5.6 Create `apps/web/src/stores/auth.ts`: Zustand store with JWT state, login/refresh/logout actions
- [x] 5.7 Create `apps/web/src/stores/cart.ts`: Zustand persist middleware (localStorage for anon, API for auth)
- [x] 5.8 Create `apps/web/src/hooks/useCart.ts`: detect anon vs auth mode, delegate to correct store backend
- [x] 5.9 Create `apps/web/src/lib/cart-local.ts`: localStorage expiry (30d), tenant-switch cleanup utility

## Phase 6: Frontend — Pages & Components

- [x] 6.1 Create `apps/web/src/pages/login.tsx`: slug + email + password form with validation
- [x] 6.2 Create admin layout: sidebar nav scoped to tenant, role-based menu items
- [x] 6.3 Create `apps/web/src/pages/admin/tenants/index.tsx`: tenant list table (super-admin only)
- [x] 6.4 Create `apps/web/src/pages/admin/tenants/[id].tsx`: tenant detail + config form
- [x] 6.5 Create `apps/web/src/pages/admin/tenants/[id]/theme.tsx`: theme editor with color pickers + preview toggle
- [x] 6.6 Create `apps/web/src/components/TenantThemeEditor.tsx`: reusable color picker + logo upload + live preview
- [x] 6.7 Create `apps/web/src/pages/admin/products/index.tsx`: product data table with search/filter
- [x] 6.8 Create `apps/web/src/pages/admin/products/[id].tsx`: product create/edit form with image upload
- [x] 6.9 Create `apps/web/src/pages/admin/categories/index.tsx`: category tree management with drag hierarchy
- [ ] 6.10 Create `apps/web/src/pages/products/[id].tsx`: public product detail with images + add-to-cart
- [ ] 6.11 Create `apps/web/src/pages/category/[slug].tsx`: public category listing with product grid
- [ ] 6.12 Wire cart StoreBadge + mini-cart to header, create checkout flow button

## Phase 7: Testing

- [ ] 7.1 Unit: jwt.ts, password.ts, hasMinRole, canTransition, orderNumber generator, Zod DTO schemas
- [ ] 7.2 Unit: Zustand stores (auth, cart) with mock localStorage + async action mocking
- [ ] 7.3 Unit: useTenant, useTheme hooks via React Testing Library renderHook
- [ ] 7.4 Unit: image-processor format rejection, AssetStore FS put/get/delete
- [ ] 7.5 Integration: resolve-tenant, require-role, scope-tenant middleware via Fastify inject()
- [ ] 7.6 Integration: tenant CRUD + theme preview/publish + cross-tenant isolation → 403
- [ ] 7.7 Integration: auth login/refresh/logout/rotation + replay detection
- [ ] 7.8 Integration: product CRUD + categories + search ILIKE + cross-tenant isolation → 404
- [ ] 7.9 Integration: cart CRUD + stock validation → 409 + merge scenarios (dup, adjust, omit, warn)
- [ ] 7.10 Integration: checkout transactional (stock—, cart emptied), cancel stock restore, invalid transitions → 409
- [ ] 7.11 E2E Playwright: login flow, cross-tenant isolation, product browsing (public vs admin)
- [ ] 7.12 E2E Playwright: anonymous cart → add items → login → merge → checkout → cancel order
- [ ] 7.13 Final verify: `pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm build` all pass
