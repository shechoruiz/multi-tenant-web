# Shelf — Multi-tenant E-commerce Platform

Plataforma multi-tenant de e-commerce tipo Shopify, donde cada tienda tiene su propia marca, productos, colores y datos aislados. Proyecto de portafolio profesional.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS 3 + shadcn/ui |
| Backend | Fastify 5 + TypeScript |
| ORM | Prisma 5 + PostgreSQL 16 |
| Validación | Zod |
| Monorepo | Turborepo + pnpm workspaces |
| Infra | Docker Compose |

## Progreso

| Fase | Estado | PR |
|------|--------|----|
| **1. Foundation & Scaffolding** | ✅ Completo | PR 1 |
| **2. Prisma Schema & Shared Types** | ✅ Completo | PR 2 |
| **3. Backend Auth & Middleware** | ✅ Completo | PR 3 |
| **4. Backend Capability Plugins** | ✅ Completo | PR 4 |
| **5. Frontend Foundation & Stores** | ✅ Completo | PR 5 |
| **6. Frontend Pages & Components** | ✅ Completo | PR 13–16 |
| 7. Testing | ⏳ Pendiente | — |

## Guía de pruebas

Para probar todo lo desarrollado en local (setup, credenciales del seed,
rutas del frontend, endpoints de la API y problemas comunes), consulta
[`INSTRUCTIVO-PRUEBAS.txt`](./INSTRUCTIVO-PRUEBAS.txt).

## Arranque rápido

```bash
# Requisitos: Docker, pnpm 11+, Node 20+

# Iniciar PostgreSQL
docker compose up -d

# Instalar dependencias
pnpm install

# Aplicar migración de base de datos
pnpm --filter @shelf/db db:migrate

# Sembrar datos de prueba (tienda demo + admin)
pnpm --filter @shelf/db db:seed

# Iniciar desarrollo (frontend :5173 + backend :3001)
pnpm dev
```

> Para resetear la base de datos sin historial de migraciones usa
> `pnpm --filter @shelf/db db:push` en lugar de `db:migrate`, y vuelve a
> correr `db:seed`.

## API endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | ❌ | Health check |
| POST | `/auth/login` | ❌ | Login multi-tenant |
| POST | `/auth/refresh` | ❌ | Rotar refresh token |
| POST | `/auth/logout` | ❌ | Cerrar sesión |
| POST | `/auth/forgot-password` | ❌ | Solicitar reset |
| POST | `/auth/reset-password` | ❌ | Cambiar contraseña |
| GET/POST | `/api/tenants` | super-admin | CRUD tenants |
| GET/PATCH | `/api/tenants/:id` | super-admin | Detalle/actualizar tenant |
| POST | `/api/assets/upload` | admin | Subir imagen |
| GET | `/:slug/products` | ❌ | Catálogo público |
| GET | `/:slug/products/:id` | ❌ | Detalle de producto público |
| GET | `/:slug/categories` | ❌ | Categorías públicas (árbol) |
| GET/POST/PATCH/DELETE | `/:slug/admin/products` | staff+ | CRUD productos |
| GET | `/:slug/admin/products/:id` | staff+ | Detalle admin de producto |
| GET/POST/PATCH/DELETE | `/:slug/admin/categories` | staff+ | CRUD categorías |
| GET/PUT | `/:slug/admin/theme` | admin | Tema visual |
| GET | `/:slug/theme` | ❌ | Tema público |
| GET | `/:slug/cart` | customer | Carrito de compras |
| POST | `/:slug/cart/items` | customer | Añadir item al carrito |
| PATCH | `/:slug/cart/items/:itemId` | customer | Actualizar cantidad |
| DELETE | `/:slug/cart/items/:itemId` | customer | Quitar item |
| DELETE | `/:slug/cart` | customer | Vaciar carrito |
| POST | `/:slug/cart/merge` | customer | Fusionar carrito anónimo |
| POST | `/:slug/orders/checkout` | customer | Checkout transaccional |
| GET | `/:slug/orders` | customer | Listar pedidos |
| GET | `/:slug/orders/:id` | customer | Detalle de pedido |
| PATCH | `/:slug/orders/:id/status` | staff+ | Avanzar estado |
| POST | `/:slug/orders/:id/cancel` | customer+ | Cancelar pedido |

## Estructura

```
apps/
├── web/                     # Frontend React + Vite + Tailwind + shadcn/ui
│   └── src/
│       ├── components/      # AdminLayout, TenantLayout, StoreBadge, MiniCart,
│       │                    # ProductCard, TenantThemeEditor + ui/ (shadcn)
│       ├── hooks/           # useTenant, useTheme, useCart
│       ├── lib/             # api client, router, theme, cart-local
│       ├── stores/          # Zustand: auth, cart
│       └── pages/           # Public: login, products/[id], category/[slug],
│                            # cart · Admin: products, categories, theme, tenants
└── api/                     # Backend Fastify + Prisma + Zod
    └── src/
        ├── lib/             # JWT, bcrypt, state-machine, events, asset-store
        ├── middleware/       # resolve-tenant, require-role, scope-tenant, validate-cart
        └── plugins/         # auth, tenants, assets, catalog, admin-catalog,
                             # cart, cart-merge, orders
packages/
├── config/                  # TypeScript + ESLint compartidos
├── db/                      # Prisma schema + migraciones + seed
└── shared/                  # Tipos, DTOs y utilidades compartidas
```

## Capacidades implementadas

- [x] **Tenant management** — CRUD de tiendas, tema visual (colores, logo, tipografía)
- [x] **User auth** — login multi-tenant con JWT + refresh rotation, 3 roles jerárquicos
- [x] **Product catalog** — CRUD de productos con categorías jerárquicas, imágenes y stock
- [x] **Shopping cart** — carrito anónimo (localStorage) y autenticado (DB), fusión al login
- [x] **Order management** — checkout transaccional, máquina de estados, historial, cancelación con restitución de stock

## Credenciales del seed

| Rol | Email | Contraseña |
|-----|-------|------------|
| Super-admin | `admin@shelf.com` | `admin123` |
| Cliente | `cliente@demo.com` | `demo123` |

Tenant demo: `tienda-demo` · 8 productos activos · categorías con subcategorías.

## Comandos de calidad

```bash
pnpm lint        # ESLint en todos los paquetes
pnpm typecheck   # TypeScript
pnpm build       # tsc -b + vite build (validación real del frontend)
pnpm test        # vitest (pendiente: Fase 7 — sin tests aún)
```