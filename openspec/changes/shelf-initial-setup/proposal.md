# Propuesta: Configuración inicial de Shelf

## Intención

Establecer la base técnica del proyecto Shelf: monorepo funcional con frontend y backend, tooling compartido, y esquema de base de datos. Este es el punto de partida desde el cual se construirán todas las capacidades de negocio multi-tenant.

## Alcance

### Incluye
- Scaffolding del monorepo con Turborepo + pnpm workspaces
- Frontend: React + Vite + Tailwind + shadcn/ui + React Router v7
- Backend: Fastify + Prisma + Zod + medidas de CORS/helmet
- Paquete compartido de tipos y DTOs (`packages/shared`)
- Paquete de componentes UI (`packages/ui`) con shadcn/ui
- Paquete de configuración ESLint + TypeScript (`packages/config`)
- Esquema Prisma con entidades base: Tenant, User, Product, Category, Order, Cart, OrderItem, CartItem
- Docker Compose para PostgreSQL local
- Scripts de desarrollo unificados (`pnpm dev` inicia todo)

### Excluye
- Implementación de lógica de negocio (auth, CRUD, carrito, pedidos)
- Tema dinámico por tenant
- Pruebas unitarias o e2e (se añaden durante implementación de capacidades)
- Despliegue o infraestructura cloud
- Row-Level Security en PostgreSQL (se configura con tenant-management)

## Capacidades

Este cambio no implementa capacidades de negocio. Las siguientes se especificarán como cambios independientes:

| Capacidad | Propósito |
|-----------|-----------|
| `tenant-management` | Registro y configuración visual de tiendas |
| `user-auth` | Login multi-tenant con JWT, roles y registro |
| `product-catalog` | CRUD de productos con categorías, stock y SKU |
| `shopping-cart` | Carrito por tenant con persistencia |
| `order-management` | Creación y gestión de pedidos |

## Enfoque

Monorepo con Turborepo + pnpm workspaces. Dos aplicaciones (`frontend/` + `backend/`) y tres paquetes compartidos. Base de datos PostgreSQL compartida con columna `tenant_id` en todas las tablas multi-tenant. Frontend con ruteo basado en `/:tenantSlug/*`. Backend con arquitectura de plugins Fastify y schemas Zod para validación en cada ruta. Tareas secuenciales: (1) init monorepo, (2) scaffold frontend, (3) scaffold backend, (4) esquema Prisma, (5) tipos compartidos.

## Áreas afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `frontend/` | Nuevo | App React + Vite + shadcn/ui |
| `backend/` | Nuevo | API Fastify + Prisma + Zod |
| `packages/shared/` | Nuevo | Tipos y DTOs compartidos |
| `packages/ui/` | Nuevo | Componentes shadcn/ui base |
| `packages/config/` | Nuevo | ESLint + tsconfig compartidos |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Configuración Turborepo con Vite + Fastify | Baja | Usar recipes oficiales de Turborepo |
| Versiones incompatibles de Prisma y PostgreSQL | Baja | Pin Prisma a versión estable; usar Neon compatible |
| Crecimiento desmedido del paquete de UI | Media | Mantener solo componentes necesarios para MVP |

## Plan de reversión

Reversión trivial: eliminar el directorio del proyecto y reinicializar. No hay datos en producción, migraciones aplicadas ni despliegues.

## Dependencias

- Node.js >= 20 LTS
- pnpm >= 9
- Docker Desktop o PostgreSQL local
- Neon cuenta gratuita (opcional)

## Criterios de éxito

- [ ] `pnpm dev` inicia frontend (:5173) y backend (:3001) concurrentemente
- [ ] Frontend compila sin errores con Vite
- [ ] Backend responde `GET /health` con 200
- [ ] Prisma genera migración SQL inicial sin errores
- [ ] Conexión a PostgreSQL verificada desde backend
- [ ] ESLint y TypeScript pasan sin errores en todos los paquetes
