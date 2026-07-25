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
| 2. Prisma Schema & Shared Types | ⏳ Pendiente | PR 2 |
| 3. Backend Auth & Middleware | ⏳ Pendiente | PR 3 |
| 4. Backend Capability Plugins | ⏳ Pendiente | PR 4 |
| 5. Frontend Foundation & Stores | ⏳ Pendiente | PR 5 |
| 6. Frontend Pages & Components | ⏳ Pendiente | PR 6 |
| 7. Testing | ⏳ Pendiente | — |

## Arranque rápido

```bash
# Iniciar PostgreSQL
docker compose up -d

# Instalar dependencias
pnpm install

# Iniciar desarrollo (frontend :5173 + backend :3001)
pnpm dev
```

## Estructura

```
apps/
├── web/          # Frontend React + Vite + Tailwind + shadcn/ui
└── api/          # Backend Fastify + Prisma + Zod
packages/
├── config/       # TypeScript + ESLint compartidos
├── db/           # Prisma schema + cliente
└── shared/       # Tipos y DTOs compartidos
```

## Próximas capacidades

- [ ] Tenant management — registro y configuración visual de tiendas
- [ ] User auth — login multi-tenant con JWT, roles y registro
- [ ] Product catalog — CRUD de productos con categorías y stock
- [ ] Shopping cart — carrito por tenant con persistencia dual
- [ ] Order management — pedidos con máquina de estados