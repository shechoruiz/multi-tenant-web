## Exploración: Arquitectura multi-tenant Shelf

### Estado actual

Proyecto nuevo, repositorio inicializado (`multi-tenant-web`) con configuración SDD híbrida (Engram + OpenSpec). No hay código fuente, dependencias ni estructura de directorios más allá de `openspec/`. Sin commits de git.

### Áreas afectadas

- **Aislamiento de datos multi-tenant**: Estrategia de base de datos
- **Estructura del monorepo**: Organización de paquetes y herramientas de build
- **Stack frontend**: Framework, estado global, UI, tema dinámico
- **Stack backend**: Framework HTTP, ORM, validación, autenticación
- **Modelo de dominios**: Entidades de negocio para e-commerce multi-tenant
- **Autenticación y autorización**: Login multi-tenant, roles, protección de rutas
- **Infraestructura y despliegue**: Base de datos, entorno de desarrollo

### Enfoques evaluados

---

#### 1. Estrategia de aislamiento multi-tenant

| Enfoque | Descripción | Aislamiento | Costo | Complejidad |
|---------|-------------|-------------|-------|-------------|
| **Shared DB + tenant_id** | Una sola base, todas las tablas con columna `tenant_id` | Lógico (bajo) | Bajo | Bajo |
| **Schema per tenant** | Una base, un schema de PostgreSQL por tenant | Nivel schema (medio) | Medio | Medio |
| **Database per tenant** | Una base de datos independiente por tenant | Físico (alto) | Alto | Alto |

**Pros y contras:**

- **Shared DB + tenant_id**
  - ✅ Más simple de desarrollar, migrar y mantener
  - ✅ Consultas cross-tenant posibles (dashboard global)
  - ✅ PostgreSQL Row-Level Security (RLS) añade capa de seguridad en DB
  - ✅ Ideal para proyectos pequeños/medianos (< 100 tenants)
  - ❌ Riesgo de fuga de datos si una query omite `tenant_id`
  - ❌ Una sola base es punto único de fallo
  - ❌ Sin aislamiento físico para cumplimiento regulatorio

- **Schema per tenant**
  - ✅ Aislamiento moderado sin multiplicar bases de datos
  - ✅ Posible personalizar esquemas por tenant
  - ✅ Backups a nivel schema
  - ❌ Mayor complejidad en migraciones (N schemas)
  - ❌ Connection pooling más complejo
  - ❌ La base compartida sigue siendo punto único de fallo

- **Database per tenant**
  - ✅ Aislamiento total: seguridad, rendimiento, cumplimiento
  - ✅ Escalado independiente por tenant
  - ✅ Despliegue multi-región posible
  - ❌ Costo operativo alto (monitoreo, backups, pools N×)
  - ❌ Esfuerzo de desarrollo significativamente mayor
  - ❌ Overkill para proyecto de portafolio

**Recomendación para Shelf (proyecto de portafolio):** **Shared DB + tenant_id con PostgreSQL RLS**. Ofrece el equilibrio óptimo entre aprender patrones reales de SaaS multi-tenant sin la sobrecarga operativa de database-per-tenant. RLS añade una capa de seguridad a nivel de base de datos que demuestra conocimiento avanzado en entrevistas. Migrar a schema-per-tenant o database-per-tenant más adelante es viable si el proyecto escala.

---

#### 2. Estructura del monorepo

| Enfoque | Descripción | Configuración | Ideal para |
|---------|-------------|---------------|------------|
| **pnpm workspaces solos** | Sin herramienta externa, workspaces nativos de pnpm | Mínima | 1-3 developers, < 5 paquetes |
| **Turborepo** | Task runner con caché, orquestación de scripts | Baja | JS/TS-only, equipos pequeños/medianos |
| **Nx** | Plataforma completa: generadores, grafos, gobernanza | Alta | Equipos grandes, necesidades de gobernanza |

**Pros y contras:**

- **pnpm workspaces solos**
  - ✅ Sin dependencias extra, configuración mínima
  - ✅ Suficiente para proyectos pequeños
  - ❌ Sin caché de build, sin orquestación avanzada

- **Turborepo**
  - ✅ Configuración minimalista (un `turbo.json`)
  - ✅ Caché de build local y remota (Vercel)
  - ✅ Excelente DX para JS/TypeScript
  - ✅ Migración trivial desde pnpm workspaces
  - ❌ Sin generadores, sin enforce de boundaries
  - ❌ Solo JS/TS (no limita para Shelf)

- **Nx**
  - ✅ Generadores de código, graph visualization
  - ✅ Enforce de módulos y boundaries
  - ✅ `affected` commands precisos
  - ❌ Curva de aprendizaje alta
  - ❌ ~45MB vs ~8MB de Turborepo
  - ❌ Sobredimensionado para proyecto de portafolio individual

**Recomendación para Shelf:** **Turborepo**. Para un proyecto de portafolio individual con JS/TS puro, Turborepo da el mejorratio DX/esfuerzo. La migración a Nx más adelante es posible (~5 días de trabajo) si el proyecto crece. Turborepo se integra nativamente con Vercel, lo que facilita el despliegue.

**Estructura propuesta:**

```
shelf/
├── apps/
│   ├── web/                    # Frontend React + Vite
│   └── api/                    # Backend Node.js + Fastify
├── packages/
│   ├── shared/                 # Tipos compartidos (DTOs, interfaces)
│   ├── db/                     # Schema Drizzle + migraciones
│   ├── ui/                     # Componentes UI compartidos (shadcn/ui)
│   └── config/                 # ESLint, TypeScript configs
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

#### 3. Stack frontend concreto

##### Estado global

| Opción | Bundle | Boilerplate | Curva | Ideal para |
|--------|--------|-------------|-------|------------|
| **Context API** | 0 KB | Bajo | Baja | Estado global pequeño (tema, auth) |
| **Zustand** | ~1 KB | Mínimo | Baja | Apps medianas, MVPs, rendimiento |
| **Redux Toolkit** | ~10 KB | Medio | Media | Apps grandes, equipos, debugging |

**Recomendación:** **Zustand** + **Context API** (combinados). Zustand para estado de negocio (carrito, productos, tenant activo). Context API para estado global de bajo cambio (tema, idioma). No necesitas Redux Toolkit para un proyecto de portafolio — Zustand da excelente rendimiento con menos ceremonia.

##### UI y estilos

| Opción | Enfoque | Tema dinámico | Curva |
|--------|---------|---------------|-------|
| **shadcn/ui + Tailwind** | Copy-paste components, CSS variables | CSS variables + clase `.dark` | Baja |
| **Radix + Tailwind** | Primitivas headless, tú diseñas | CSS variables | Media |
| **Tailwind solo** | Sin componentes prehechos | CSS variables + `@apply` | Media |
| **CSS Modules** | Módulos CSS tradicionales | Temas con `data-*` attributes | Baja |
| **Bootstrap** | Framework CSS completo | `data-bs-theme` | Baja |

**Recomendación:** **shadcn/ui + Tailwind CSS v4**. Razones:
- Tailwind v4 con `@theme` directive y OKLCH para colores
- shadcn/ui usa CSS variables → cambiar variables por tenant = tema nuevo al instante
- Componentes accesibles (Radix UI por debajo)
- Código copiado, no es una dependencia oculta — ideal para portfolio donde se vea el código
- `shadcn-white-label` existe como referencia para multi-tenancy

##### Tema dinámico por tenant

**Recomendación: CSS variables con inyección runtime.** El backend devuelve la paleta del tenant (colores primario, secundario, acento, fondo) como parte del perfil del tenant. El frontend aplica esas variables en `:root` via JavaScript. shadcn/ui lo consume automáticamente porque sus componentes referencian `var(--primary)`, `var(--background)`, etc.

```
// Ejemplo de carga de tema tenant
const theme = await api.get(`/tenants/${slug}/theme`);
Object.entries(theme.colors).forEach(([key, value]) => {
  document.documentElement.style.setProperty(`--${key}`, value);
});
```

##### Ruteo

**Recomendación:** **React Router v7**. Es la evolución natural de v6 con mejor soporte de loaders/actions tipo Remix. La estructura de rutas reflejará la jerarquía multi-tenant:

```
/                          → Landing page
/:tenantSlug               → Tienda pública del tenant
/:tenantSlug/productos     → Catálogo
/:tenantSlug/producto/:id  → Detalle
/:tenantSlug/carrito       → Checkout
/:tenantSlug/admin/*       → Panel admin del tenant
/admin/*                   → Panel super-admin (cross-tenant)
```

---

#### 4. Stack backend concreto

##### Framework HTTP

| Opción | Req/s (Node 22) | Bundle | TypeScript | Ecosistema |
|--------|-----------------|--------|------------|------------|
| **Express** | ~18K | ~1.5MB | vía `@types` | Masivo |
| **Fastify** | ~72K | ~50KB | Nativo | Grande |
| **Hono** | ~230K | ~14KB | Nativo | Creciendo |
| **NestJS** | similar a Express | Alto | Nativo | Grande |

**Recomendación:** **Fastify**. Para un API server Node.js tradicional (no edge/serverless), Fastify ofrece el mejor equilibrio entre rendimiento, madurez y DX. Tiene schema validation nativo (JSON Schema + ajv), plugin system con encapsulación por scope, y TypeScript first-class. Hono es tentador por el rendimiento, pero su ecosistema de plugins y middleware es más pequeño — para un proyecto de portafolio donde quieras mostrar patrones sólidos, Fastify es más seguro.

##### ORM

| Opción | Enfoque | Bundle | Migraciones | Edge |
|--------|---------|--------|-------------|------|
| **Prisma** | Schema-first (.prisma) | ~17MB | Prisma Migrate | Limitado |
| **Drizzle** | Code-first (TypeScript) | ~7KB | Drizzle Kit | Nativo |
| **TypeORM** | Decorators | ~15MB | Propio | No |
| **Kysely** | Query builder | ~50KB | Manual | Sí |

**Recomendación:** **Drizzle ORM**. Razones:
- Sin paso de generación → los tipos siempre están sincronizados
- Bundle pequeño (~7KB) → ideal si migras a edge/serverless después
- SQL-like query builder → escribes SQL real con type-safety
- Drizzle Kit genera migraciones SQL que revisas antes de aplicar
- PlanetScale contrató al equipo core en 2026 → sostenibilidad asegurada
- Para proyecto de portafolio demuestra que sabes SQL, no solo un ORM

##### Validación

| Opción | Bundle | Enfoque | Velocidad |
|--------|--------|---------|-----------|
| **Zod** | ~20KB | Schema con inferencia TypeScript | Rápido |
| **Valibot** | ~1KB (modular) | Similar a Zod, modular | Más rápido |
| **Yup** | ~25KB | Cadena de métodos | Lento |

**Recomendación:** **Zod**. Es el estándar de facto en el ecosistema TypeScript en 2026. Su integración con Drizzle, Fastify (via `@fastify/type-provider-zod`) y React Hook Form es madura. Valibot es más rápido y pequeño, pero Zod tiene mejor ecosistema y más recursos de aprendizaje — importante para un portfolio.

##### Base de datos

| Opción | Tipo | Ideal para |
|--------|------|------------|
| **PostgreSQL** | Relacional, maduro | Producción, multi-tenant RLS, JSONB |
| **SQLite** | Embebido, archivo | Desarrollo local, prototipos |
| **Neon (serverless PG)** | PostgreSQL serverless | Despliegue sinops |

**Recomendación:** **PostgreSQL** (vía **Neon** para desarrollo y staging gratuito). PostgreSQL ofrece Row-Level Security que es clave para multi-tenancy seguro, JSONB para campos flexibles por tenant, y es la base de datos más valorada en el mercado laboral. Neon da una base PostgreSQL serverless con free tier generoso y branching para desarrollo.

---

#### 5. Estructura de dominios del negocio

Para un MVP de portafolio, los dominios iniciales son:

```
shelf/
├── Tenant          # Organización/tienda
│   ├── slug (identificador único en URL)
│   ├── nombre, descripción, logo
│   ├── paleta de colores (tema)
│   └── configuración (moneda, idioma, timezone)
│
├── User            # Usuario con contexto de tenant
│   ├── email, nombre, avatar
│   ├── tenantId (pertenece a un tenant)
│   └── rol: admin, staff, customer
│
├── Product         # Catálogo scoped a tenant
│   ├── tenantId
│   ├── nombre, descripción, precio
│   ├── imágenes, categoría
│   ├── stock, SKU
│   └── activo/inactivo
│
├── Category        # Categorías por tenant
│   ├── tenantId
│   ├── nombre, slug
│   └── parentId (jerarquía)
│
├── Order           # Pedido scoped a tenant
│   ├── tenantId
│   ├── items (productos + cantidades + precio congelado)
│   ├── total, estado (pendiente, confirmado, enviado, entregado)
│   ├── dirección de envío
│   └── userId (cliente que compra)
│
└── Cart            # Carrito de compras (sesión temporal)
    ├── tenantId
    ├── items
    └── userId o sessionId
```

**Dominios diferidos (post-MVP):**
- Pagos (integrar con Stripe)
- Envíos (cálculo de costo, tracking)
- Cupones/descuentos
- Reviews/valoraciones
- Analytics básico por tenant

---

#### 6. Autenticación multi-tenant

**Flujo recomendado:**

1. **Login con tenant context**: El usuario ingresa `{tenantSlug}` + `email` + `contraseña`
2. **Backend valida**: Busca al usuario con ese email DENTRO del tenant indicado
3. **JWT con claims**: El token incluye `{ userId, tenantId, role, tenantSlug }`
4. **httpOnly cookies**: El token se envía como cookie segura (no accesible desde JS)
5. **Refresh token**: Token de larga duración para renovar el access token

**Middleware de tenant:**

```typescript
// Extraer tenantSlug de la URL (público: /:tenantSlug/*)
// o del subdominio (opcional más adelante: tenant.mishelf.com)
// Inyectar tenantId en el contexto de request
// Scopear todas las queries a tenantId
```

**Roles dentro del tenant:**

| Rol | Permisos |
|-----|----------|
| **super-admin** | Cross-tenant, gestionar tenants, ver todo |
| **admin** | Administrar su tienda: productos, pedidos, usuarios staff |
| **staff** | Gestionar pedidos, actualizar stock, ver catálogo |
| **customer** | Comprar, ver historial de pedidos propio |

**Protección de rutas (frontend):**

```typescript
// <ProtectedRoute role=["admin", "staff"] tenantSlug={slug} />
// Si el JWT no tiene el rol o tenant requerido → redirect
```

**Refresh token rotation**: Cada vez que se usa un refresh token, se emite uno nuevo y se invalida el anterior. Esto previene replay attacks.

---

### Recomendación general

| Decisión | Elección | Por qué |
|----------|----------|---------|
| Aislamiento | Shared DB + tenant_id + RLS | Balance aprendizaje/complejidad para portfolio |
| Monorepo | Turborepo + pnpm workspaces | Suficiente potencia, mínima configuración |
| Frontend | React + Vite + shadcn/ui + Zustand + React Router v7 | Stack moderno, portfolio atractivo |
| Backend | Fastify + Drizzle + Zod | Rendimiento + type-safety + SQL real |
| UI multi-tenant | CSS variables inyectadas por tenant | shadcn/ui lo consume nativamente |
| Base de datos | PostgreSQL (Neon) | RLS, JSONB, gratis, marketable |
| Autenticación | JWT + httpOnly cookies + refresh rotation | Seguro y demostrable |
| Testing | Vitest (unit) + Playwright (e2e) | Stack moderno de testing |

### Riesgos

1. **Sobreingeniería temprana**: Database-per-tenant o Nx agregarían complejidad sin beneficio real para un proyecto de portafolio individual. El riesgo es gastar tiempo en infraestructura en vez de features demostrables.
2. **RLS como único mecanismo de seguridad**: RLS es potente pero no reemplaza la validación en aplicación. Siempre debe haber doble verificación.
3. **Tema dinámico en shadcn/ui**: Aunque CSS variables funcionan, hay que probar que todos los componentes de shadcn/ui respeten correctamente las variables inyectadas dinámicamente. Componentes como charts o calendar pueden necesitar configuración adicional.
4. **Complejidad del alcance**: Un proyecto multi-tenant tiene más moving parts que uno mono-tenant. El riesgo es no llegar a un MVP funcional. Se recomienda priorizar: (1) tenant y auth, (2) productos, (3) carrito y pedidos, (4) tema dinámico.
5. **Neon + Drizzle en serverless**: Si Shelf migra a edge/serverless más adelante, verificar que Drizzle Kit y las migraciones funcionen correctamente con el branching de Neon.

### Listo para propuesta

**Sí.** Esta exploración cubre todas las decisiones de arquitectura necesarias para comenzar. El orquestador debe iniciar la fase de **propuesta** (`sdd-propose`) con los siguientes elementos claros:

- **Change name**: `multi-tenant-architecture` (o dividir en cambios más pequeños si se prefiere)
- **Decisiones ya exploradas**: Las 6 áreas están analizadas con opciones, pros/cons y recomendación
- **Lo que necesita la propuesta**: Definir el alcance exacto del MVP (qué features entran en la primera iteración), plan de reversión, y estimación de esfuerzo
- **Alternativa**: Dividir en cambios secuenciales: (1) scaffolding del monorepo + shared types, (2) backend auth + tenant domain, (3) frontend base + tema dinámico, (4) catálogo + pedidos

---

**Status**: success
**Resumen ejecutivo**: Exploración completa de la arquitectura multi-tenant para Shelf. Se evaluaron 6 áreas críticas: aislamiento de datos, estructura del monorepo, stack frontend, stack backend, dominios de negocio y autenticación multi-tenant. Cada área incluye comparativa de opciones con análisis de pros/cons y recomendación concreta basada en el contexto de proyecto de portafolio profesional.

**Artefactos**:
- Engram: `sdd/explore/multi-tenant-architecture` (topic_key: `sdd/explore/multi-tenant-architecture`)
- OpenSpec: `openspec/explorations/multi-tenant-architecture.md`

**Siguiente fase recomendada**: `sdd-propose`

**Riesgos**: Sobreingeniería temprana, RLS como única capa de seguridad, compatibilidad de temas dinámicos con shadcn/ui, complejidad del alcance MVP.
