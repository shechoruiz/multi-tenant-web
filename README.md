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
| 6. Frontend Pages & Components | ⏳ Pendiente | — |
| 7. Testing | ⏳ Pendiente | — |

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
pnpm --filter @shelf/db db:push

# Iniciar desarrollo (frontend :5173 + backend :3001)
pnpm dev
```

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
| PATCH | `/api/tenants/:id` | super-admin | Actualizar tenant |
| POST | `/api/assets/upload` | admin | Subir imagen |
| GET | `/:slug/products` | ❌ | Catálogo público |
| GET | `/:slug/categories` | ❌ | Categorías públicas |
| GET/POST/PATCH/DELETE | `/:slug/admin/products` | staff+ | CRUD productos |
| GET/POST/PATCH/DELETE | `/:slug/admin/categories` | staff+ | CRUD categorías |
| GET/POST/PATCH/DELETE | `/:slug/cart` | customer | Carrito de compras |
| POST | `/:slug/cart/merge` | customer | Fusionar carrito |
| POST | `/:slug/orders/checkout` | customer | Checkout transaccional |
| GET | `/:slug/orders` | customer | Listar pedidos |
| PATCH | `/:slug/orders/:id/status` | staff+ | Avanzar estado |
| POST | `/:slug/orders/:id/cancel` | customer+ | Cancelar pedido |
| GET/PUT | `/:slug/admin/theme` | admin | Tema visual |
| GET | `/:slug/theme` | ❌ | Tema público |

## Estructura

```
apps/
├── web/                     # Frontend React + Vite + Tailwind + shadcn/ui
│   └── src/
│       ├── components/      # Componentes compartidos
│       ├── hooks/           # useTenant, useTheme, useCart
│       ├── lib/             # api client, router, theme, cart-local
│       ├── stores/          # Zustand: auth, cart
│       └── pages/           # Placeholder para Fase 6
└── api/                     # Backend Fastify + Prisma + Zod
    └── src/
        ├── lib/             # JWT, bcrypt, state-machine, events, asset-store
        ├── middleware/       # resolve-tenant, require-role, scope-tenant, validate-cart
        └── plugins/         # auth, tenants, assets, catalog, admin-catalog, cart, orders
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