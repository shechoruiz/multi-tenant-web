# Diseño: Tenant Management

## Technical Approach

Arquitectura multi-tenant con base de datos compartida y columna `tenant_id` en cada tabla con alcance de tenant. El backend expone un plugin Fastify scoped para administración de tenants, middleware de resolución de tenant por slug, y endpoints CRUD protegidos por roles. La personalización visual se maneja mediante un estado `draft`/`published` sobre la configuración del tenant, con preview vía query param temporal. El frontend inyecta CSS variables desde la configuración publicada del tenant al cargar la tienda.

## Architecture Decisions

### Tabla de decisiones

| Decisión | Opción | Alternativas | Justificación |
|----------|--------|-------------|---------------|
| Aislamiento | Shared DB + tenant_id + RLS | Schema-per-tenant, DB-per-tenant | Balance seguridad/complejidad para portfolio. RLS como capa defensiva en DB, validación en app como capa principal |
| ORM | Prisma (schema-first) | Drizzle, TypeORM | Propuesto en `shelf-initial-setup`. Migraciones declarativas, generación de tipos, e integración con Zod via `prisma-zod-generator` |
| Tema dinámico | CSS variables inyectadas en runtime | CSS-in-JS, múltiples archivos CSS | shadcn/ui consume `var(--primary)` nativamente. Sin rebuild, sin bundle extra |
| Preview | Draft/published sobre configuración del tenant | Branch por tenant, staging por tenant | Simple state machine sobre una tabla. Sin infraestructura extra. Preview vía query param `?preview=true` que carga draft |
| Almacenamiento de assets | Local filesystem → migrable a S3 | CDN, DB blob, S3 desde el inicio | Filesystem es suficiente para desarrollo y portfolio. Interface de repositorio permite swap a S3 después |
| Roles | RBAC con 3 roles + enumeración en DB | CASL, Ability RBAC library | Enumeración simple en columna `role` del User. Suficiente para 3 roles sin jerarquía compleja. CASL se agrega si crecen los permisos |

## Data Flow

### Flujo de autenticación scoped

```
Cliente                   Backend                          DB
  │                         │                               │
  │  POST /auth/login       │                               │
  │  {slug, email, pass}    │                               │
  │────────────────────────>│                               │
  │                         │  SELECT tenant WHERE slug=?   │
  │                         │──────────────────────────────>│
  │                         │  tenant (o 404)               │
  │                         │<──────────────────────────────│
  │                         │  SELECT user WHERE            │
  │                         │  tenantId=? AND email=?       │
  │                         │──────────────────────────────>│
  │                         │  user (o 401)                 │
  │                         │<──────────────────────────────│
  │                         │  verify(password_hash)        │
  │                         │  sign JWT {userId, tenantId,  │
  │                         │    role, tenantSlug}          │
  │  Set-Cookie: jwt=...    │                               │
  │<────────────────────────│                               │
```

### Flujo de personalización visual

```
Admin → PATCH /tenants/:id/theme {colors, logo}
  → Backend guarda en campo themeDraft (JSON)
  → Admin preview: GET /tenants/:slug/theme?preview=true
    → Backend retorna themeDraft en vez de themePublished
  → Admin confirma: POST /tenants/:id/theme/publish
    → Backend copia themeDraft → themePublished
    → Frontend next load usa themePublished
```

### Flujo de aislamiento

```
Request → Middleware resolveTenant(tenantSlug)
  → req.tenantId = tenant.id
  → req.tenantSlug = tenant.slug

Endpoint → Middleware requireTenantAccess
  → Valida req.user.tenantId === req.tenantId
    (excepto super-admin)

Toda query → where: { tenantId: req.tenantId }
```

## Modelo de datos

```prisma
model Tenant {
  id             String   @id @default(cuid())
  name           String
  slug           String   @unique
  contactEmail   String
  status         Status   @default(active) // active | suspended
  themePublished Json?    // { colors: {primary,secondary,...}, logo, font }
  themeDraft     Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  users          User[]
  products       Product[]
  categories     Category[]
  orders         Order[]
  carts          Cart[]

  @@index([slug])
}

model User {
  id        String   @id @default(cuid())
  email     String
  name      String?
  password  String   // bcrypt hash
  role      Role     @default(staff) // super_admin | admin | staff
  tenantId  String?
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])
  createdAt DateTime @default(now())

  @@unique([email, tenantId]) // email único dentro del tenant
  @@index([tenantId])
  @@index([email])
}

enum Status { active suspended }
enum Role  { super_admin admin staff }
```

`themePublished` y `themeDraft` almacenan un JSON con la estructura:

```typescript
interface TenantTheme {
  colors: {
    primary: string;    // HEX
    secondary: string;  // HEX
    accent: string;     // HEX
    background: string; // HEX
    foreground: string; // HEX
  };
  logo?: string;        // URL del asset
  favicon?: string;     // URL del asset
  font?: string;        // Google Font name
}
```

## API Endpoints

| Método | Ruta | Rol | Propósito |
|--------|------|-----|-----------|
| `POST` | `/api/tenants` | super_admin | Crear tenant |
| `GET` | `/api/tenants` | super_admin | Listar todos los tenants |
| `GET` | `/api/tenants/:id` | super_admin, admin propio | Obtener tenant |
| `PATCH` | `/api/tenants/:id` | super_admin, admin propio | Actualizar tenant |
| `PATCH` | `/api/tenants/:id/theme` | admin propio | Actualizar draft visual |
| `GET` | `/api/tenants/:slug/theme` | Público | Obtener tema publicado (o draft si `?preview=true`) |
| `POST` | `/api/tenants/:id/theme/publish` | admin propio | Publicar draft → published |
| `POST` | `/api/assets/upload` | admin propio | Subir logo/favicon |
| `POST` | `/api/auth/login` | Público | Login slug + email + password |

## Middleware de tenant

```typescript
// resolve-tenant.ts — extrae tenantSlug de params, header o subdominio
// scope-tenant.ts — inyecta tenantId en todas las queries de Prisma
// require-role.ts — valida rol mínimo requerido

// Uso:
app.register(tenantPlugin, { prefix: '/api' })
app.register(adminPlugin, { prefix: '/api/admin' })
```

## File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `packages/shared/src/types/tenant.ts` | Crear | Tipos `Tenant`, `TenantTheme`, `CreateTenantDTO`, `UpdateThemeDTO` |
| `packages/shared/src/types/auth.ts` | Crear | Tipos `LoginRequest`, `JwtPayload`, `AuthResponse` |
| `packages/shared/src/types/role.ts` | Crear | Enumeración `Role` y utilidad `hasMinRole` |
| `backend/prisma/schema.prisma` | Modificar | Añadir modelos Tenant, User con relaciones y enums |
| `backend/prisma/seed.ts` | Crear | Seed para tenant por defecto y super-admin inicial |
| `backend/src/plugins/tenant.ts` | Crear | Plugin Fastify con endpoints CRUD de tenant |
| `backend/src/plugins/auth.ts` | Crear | Plugin Fastify con login y refresco de JWT |
| `backend/src/plugins/theme.ts` | Crear | Plugin Fastify para gestión de tema |
| `backend/src/plugins/assets.ts` | Crear | Plugin Fastify para subida de archivos |
| `backend/src/middleware/resolve-tenant.ts` | Crear | Middleware: extrae tenant del slug |
| `backend/src/middleware/require-role.ts` | Crear | Middleware: verifica rol mínimo |
| `backend/src/middleware/scope-tenant.ts` | Crear | Middleware: forza tenantId en queries |
| `backend/src/lib/jwt.ts` | Crear | Utilidades de firma/verificación JWT |
| `backend/src/lib/password.ts` | Crear | Utilidades de hash/verify bcrypt |
| `backend/src/lib/asset-store.ts` | Crear | Interface de almacenamiento (FS impl inicial) |
| `frontend/src/lib/api.ts` | Crear | Cliente HTTP con manejo de cookies |
| `frontend/src/lib/theme.ts` | Crear | Utilidad para inyectar CSS variables |
| `frontend/src/hooks/useTenant.ts` | Crear | Hook: carga y expone tenant activo |
| `frontend/src/hooks/useTheme.ts` | Crear | Hook: carga tema y aplica CSS variables |
| `frontend/src/components/TenantThemeEditor.tsx` | Crear | Editor visual de tema (color pickers, preview) |
| `frontend/src/pages/admin/tenants/index.tsx` | Crear | Lista de tenants (super-admin) |
| `frontend/src/pages/admin/tenants/[id].tsx` | Crear | Detalle y configuración de tenant |
| `frontend/src/pages/admin/tenants/[id]/theme.tsx` | Crear | Editor de tema con preview |
| `frontend/src/pages/login.tsx` | Crear | Página de login con slug + email + password |

## Interfaces / Contracts

```typescript
// packages/shared/src/types/tenant.ts
interface CreateTenantDTO {
  name: string;
  slug: string;
  contactEmail: string;
}

interface UpdateThemeDTO {
  colors?: TenantColors;
  logo?: string;
  favicon?: string;
  font?: string;
}

// packages/shared/src/types/auth.ts
interface LoginRequest {
  slug: string;
  email: string;
  password: string;
}

interface JwtPayload {
  sub: string;        // userId
  tenantId: string;
  role: Role;
  tenantSlug: string;
  iat: number;
  exp: number;
}

// packages/shared/src/types/role.ts
enum Role {
  super_admin = 'super_admin',
  admin = 'admin',
  staff = 'staff',
}

function hasMinRole(userRole: Role, required: Role): boolean {
  const hierarchy = { super_admin: 3, admin: 2, staff: 1 };
  return hierarchy[userRole] >= hierarchy[required];
}
```

## Testing Strategy

| Capa | Qué probar | Enfoque |
|------|-----------|---------|
| Unit | Utilidades JWT, password hash, validación Zod, `hasMinRole`, sanitización de slug | Vitest + mocks. Sin DB |
| Unit | `useTenant`, `useTheme` hooks | React Testing Library con renderHook |
| Integration | CRUD tenant endpoints, login scoped, preview/publish theme | Fastify `inject()` + test DB PostgreSQL (testcontainers o SQLite) |
| Integration | Middleware resolve-tenant, require-role, scope-tenant | Fastify `inject()` con request mockeado |
| E2E | Login multi-tenant, cambio de tema, aislamiento cross-tenant | Playwright con base de datos seed |

### Escenarios críticos de integración

- Login con slug inexistente → 404 sin revelar email
- Admin de tenant A accede a recursos de tenant B → 403
- Staff modifica tema → 403
- Preview carga draft; publish copia draft → published

## Threat Matrix

N/A — El diseño de tenant management no afecta routing de infraestructura, shell commands, subprocesses, VCS/PR automation, clasificación de archivos ejecutables ni integración de procesos.

## Migration / Rollout

No se requiere migración de datos existentes (proyecto nuevo). Las migraciones de Prisma se crearán como parte del cambio `shelf-initial-setup`. El seed crea un tenant por defecto (`tienda-demo`) y un usuario super-admin para desarrollo.

## Catálogo de Productos

### Technical Approach

Plugin Fastify scoped que extiende el middleware existente (resolve-tenant, scope-tenant, require-role) con dos capas de acceso: endpoints públicos (tienda, solo activos, sin stock/SKU) y administrativos (CRUD completo con autorización por rol). Búsqueda vía ILIKE con índice pg_trgm. Imágenes con repositorio intercambiable (FS → S3) y redimensionado con Sharp. Precio como Decimal(10,2) en Prisma.

### Architecture Decisions

| Decisión | Opción | Alternativas | Justificación |
|----------|--------|-------------|---------------|
| Jerarquía categorías | parentId (adjacency list) | Closure table, Nested sets | Profundidad ≤3 en catálogos portfolio. Closure table añade mantenimiento no justificado |
| Búsqueda texto | ILIKE + índice GIN (pg_trgm) | PostgreSQL FTS, Elasticsearch | Suficiente para MVP (<10k prods). Migrar a FTS si escala |
| Imágenes múltiples | Tabla ProductImage con orden | JSON array en Product | Normalizado, sin límite práctico, consultas flexibles |
| Paginación admin | Offset (page/limit) | Cursor-based | Listas admin internas, pocas páginas |
| Paginación pública | Cursor-based (cursor/take) | Offset | Evita saltos por inserción en tienda |
| Soft delete | `status=archived` | Hard delete | Trazabilidad en catálogo. Hard delete solo si se confirma explícito |

### Data Flow

```
Público                          Admin
  GET /api/products                GET /api/admin/products
  → resolve-tenant                 → resolve-tenant + require-role(staff|admin)
  → scope-tenant                   → scope-tenant
  → WHERE status=active            → sin filtro status
  → response sin stock/SKU         → response con stock, SKU, status
                                   DELETE /api/admin/products/:id
                                     → require-role(admin)
                                     → status=archived
```

### Modelos (Prisma Añadir)

```prisma
model Category {
  id        String     @id @default(cuid())
  tenantId  String
  name      String
  slug      String
  parentId  String?
  parent    Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryHierarchy")
  products  Product[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  tenant    Tenant     @relation(fields: [tenantId], references: [id])
  @@unique([tenantId, slug])
  @@index([tenantId])
  @@index([parentId])
}

model Product {
  id          String        @id @default(cuid())
  tenantId    String
  name        String
  description String?
  price       Decimal       @db.Decimal(10, 2)
  sku         String
  stock       Int           @default(0)
  status      ProductStatus @default(active)
  categoryId  String?
  category    Category?     @relation(fields: [categoryId], references: [id])
  images      ProductImage[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  @@unique([tenantId, sku])
  @@index([tenantId])
  @@index([tenantId, status])
}

model ProductImage {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String
  alt       String?
  width     Int?
  height    Int?
  order     Int      @default(0)
  createdAt DateTime @default(now())
  @@index([productId])
}

enum ProductStatus { active inactive archived draft }
```

### API Endpoints

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| `GET` | `/api/products` | No | — | Productos activos (público) |
| `GET` | `/api/products/:id` | No | — | Detalle público |
| `GET` | `/api/categories` | No | — | Árbol categorías activas |
| `GET` | `/api/admin/products` | Sí | staff/admin | Lista con stock, SKU, todos status |
| `POST` | `/api/admin/products` | Sí | staff/admin | Crear producto |
| `GET` | `/api/admin/products/:id` | Sí | staff/admin | Detalle admin |
| `PATCH` | `/api/admin/products/:id` | Sí | staff/admin | Actualizar producto |
| `DELETE` | `/api/admin/products/:id` | Sí | admin | Eliminar (solo admin) |
| `GET` | `/api/admin/categories` | Sí | staff/admin | Lista admin categorías |
| `POST` | `/api/admin/categories` | Sí | staff/admin | Crear categoría |
| `PATCH` | `/api/admin/categories/:id` | Sí | staff/admin | Actualizar categoría |
| `DELETE` | `/api/admin/categories/:id` | Sí | admin | Eliminar (solo admin, solo si sin hijas) |
| `POST` | `/api/admin/uploads` | Sí | staff/admin | Subir imagen producto |

### Search/Filter Contract

```typescript
// Query params para GET /api/products y /api/admin/products
interface ProductFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  q?: string;            // ILIKE sobre name, sku, description
  status?: ProductStatus; // solo admin
  page?: number;          // admin (offset)
  limit?: number;
  cursor?: string;        // público (cursor-based)
}
```

La query generada por Prisma aplica condiciones dinámicamente: `tenantId`, filtros opcionales, y `status=active` siempre en público.

### Image Pipeline

```
Upload → Validación (mimetype: image/png, image/jpeg, image/webp)
       → Sharp: resize (thumb 150px, medium 600px, full 1920px, manteniendo aspect ratio)
       → AssetStore.put() → /uploads/{tenantId}/{productId}/{size}/{uuid}.{ext}
       → Crear 3 registros ProductImage (uno por tamaño)
       → Responder URLs
```

El `AssetStore` de tenant-management se extiende con:

```typescript
// Extensión en packages/shared/src/types/asset.ts
interface AssetStore {
  put(filename: string, buffer: Buffer, contentType: string): Promise<string>;
  get(url: string): Promise<Buffer>;
  delete(url: string): Promise<void>;
}
```

### Testing Strategy

| Capa | Qué probar | Enfoque |
|------|-----------|---------|
| Unit | Validación Zod DTOs, transformación price Decimal↔string | Vitest |
| Unit | Image pipeline: formato rechazado, resize dimensiones | Vitest + Sharp mock |
| Integration | CRUD productos/categorías, búsqueda/filtros, paginación | Fastify inject() + test DB |
| Integration | Vista pública omite inactivos y stock/SKU; admin incluye todo | Fastify inject() |
| Integration | Staff no puede eliminar → 403; admin puede | Fastify inject() + require-role mock |
| Integration | Subida PNG/JPEG/WebP OK; GIF/BMP → 400 | Fastify inject() + FormData |

### Escenarios críticos de integración

- SKU duplicado en mismo tenant → 409; SKU duplicado en tenant distinto → OK
- Eliminar categoría con hijas activas → 409 con mensaje de dependencias
- Producto de tenant A inaccesible desde tenant B → 404
- Búsqueda con `q=ca` encuentra "Camisa", "Casaca" vía ILIKE+pg_trgm

### Threat Matrix

N/A — El diseño de catálogo de productos no afecta routing de infraestructura, shell commands, subprocesses, VCS/PR automation, clasificación de archivos ejecutables ni integración de procesos.

### File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `backend/prisma/schema.prisma` | Modificar | Añadir modelos Product, Category, ProductImage, enum ProductStatus |
| `packages/shared/src/types/product.ts` | Crear | DTOs ProductDTO, CreateProductDTO, ProductFilters |
| `packages/shared/src/types/category.ts` | Crear | DTOs CategoryDTO, CategoryTreeNode |
| `packages/shared/src/types/asset.ts` | Crear | Interface AssetStore y tipos de imagen |
| `backend/src/plugins/catalog.ts` | Crear | Plugin Fastify: endpoints públicos catálogo |
| `backend/src/plugins/admin-catalog.ts` | Crear | Plugin Fastify: endpoints admin productos/categorías |
| `backend/src/lib/image-processor.ts` | Crear | Sharp wrapper: validar formato, redimensionar |
| `backend/src/lib/asset-store.ts` | Modificar | Implementar AssetStore con FS local |
| `frontend/src/pages/admin/products/index.tsx` | Crear | Lista admin de productos |
| `frontend/src/pages/admin/products/[id].tsx` | Crear | Formulario crear/editar producto |
| `frontend/src/pages/admin/categories/index.tsx` | Crear | Gestión de categorías |
| `frontend/src/pages/products/[id].tsx` | Crear | Vista pública de producto |
| `frontend/src/pages/category/[slug].tsx` | Crear | Listado público por categoría |

## Carrito de Compras

### Technical Approach

Persistencia dual con Zustand store sincronizado a localStorage (anónimo) y base de datos (autenticado). El carrito anónimo vive exclusivamente en el cliente con expiración por timestamp; al autenticarse, el frontend envía el carrito local al backend que lo fusiona con el carrito del usuario en DB. El precio se calcula siempre contra el catálogo actual — no se almacena precio por item. Stock se valida tanto en el frontend (UX rápida) como en backend (autoritativo). Todo scoped por tenant via middleware `resolve-tenant`.

### Architecture Decisions

| Decisión | Opción | Alternativas | Justificación |
|----------|--------|-------------|---------------|
| Persistencia anónima | Zustand + localStorage sync | IndexedDB, cookies | Zustand ya es el store global del frontend; sync con localStorage es un middleware existente. Sin dependencias extra |
| Sync al login | Cliente envía carrito local → backend fusiona | Backend pull al login, fono de autenticación | El cliente tiene el estado local inmediato; push evita race conditions con el token fresco |
| Precio | Siempre desde catálogo (no almacenado) | Snapshot price en CartItem | Evita datos obsoletos. El carrito es transitorio, no un documento fiscal |
| Expiración | Timestamp `lastActivity` en localStorage, limpieza cliente | Cron backend, TTL en DB | No hay servidor para carritos anónimos (no hay user_id). Limpieza cliente es suficiente para portfolio |
| IDs de carrito | `cartId` en localStorage (anon), `userId + tenantId` compuesto (auth) | UUID único siempre | Carrito anónimo no tiene user_id; usar userId+tenantId evita tabla separada de sesiones |
| Validación stock | Backend valida en cada mutación + checkout | Solo en checkout | Validar temprano evita sorpresas al pagar. UX: error inmediato al agregar si no hay stock |

### Modelo de datos (Prisma - añadir)

```prisma
model Cart {
  id        String   @id @default(cuid())
  userId    String
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User       @relation(fields: [userId], references: [id])
  tenant Tenant     @relation(fields: [tenantId], references: [id])
  items  CartItem[]

  @@unique([userId, tenantId])
  @@index([tenantId])
  @@index([userId])
}

model CartItem {
  id        String   @id @default(cuid())
  cartId    String
  productId String
  quantity  Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cart    Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@unique([cartId, productId])
  @@index([cartId])
}
```

`Cart` usa `@@unique([userId, tenantId])` — un carrito por usuario por tenant. `CartItem` usa `@@unique([cartId, productId])` — un item por producto dentro del carrito (incrementa cantidad, no duplica).

### API Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/cart` | Sí | Obtener carrito con items + precios actuales del catálogo |
| `POST` | `/api/cart/items` | Sí | Agregar producto (o incrementar si existe). Body: `{ productId, quantity }` |
| `PATCH` | `/api/cart/items/:itemId` | Sí | Actualizar cantidad. Body: `{ quantity }`. Quantity 0 elimina |
| `DELETE` | `/api/cart/items/:itemId` | Sí | Quitar item del carrito |
| `POST` | `/api/cart/merge` | Sí (post-login) | Fusionar carrito anónimo. Body: `{ items: [{ productId, quantity }] }` |
| `GET` | `/api/cart/price` | Sí | Total calculado contra precios actuales del catálogo |
| `DELETE` | `/api/cart` | Sí | Vaciar carrito completo |

### Data Flow

#### Persistencia dual

```
ANÓNIMO:
  Frontend: Zustand store <──sync──> localStorage("cart:{tenantSlug}")
  → Sin llamadas a backend (no hay JWT)

AUTENTICADO:
  Frontend: Zustand store ──sync──> Backend API ──> PostgreSQL
  → Cada mutación llama backend (POST/PATCH/DELETE /api/cart/*)
  → Zustand es el cache local, no el source of truth
```

#### Fusión al login

```
Cliente                                    Backend                               DB
  │                                          │                                    │
  │  POST /auth/login                        │                                    │
  │─────────────────────────────────────────>│                                    │
  │  { jwt, user }                           │                                    │
  │<─────────────────────────────────────────│                                    │
  │                                          │                                    │
  │  POST /api/cart/merge                    │                                    │
  │  { items: [{productId, qty}] }           │                                    │
  │─────────────────────────────────────────>│                                    │
  │                                          │  SELECT cart WHERE userId=?        │
  │                                          │  AND tenantId=?                    │
  │                                          │───────────────────────────────────>│
  │                                          │  cart (o null)                     │
  │                                          │<───────────────────────────────────│
  │                                          │                                    │
  │                                          │  Por cada item local:              │
  │                                          │    ¿Existe en DB? → sumar qty      │
  │                                          │    ¿Stock suficiente? → ajustar    │
  │                                          │    ¿Producto inactivo? → omitir    │
  │                                          │                                    │
  │  { merged items, warnings[] }            │                                    │
  │<─────────────────────────────────────────│                                    │
  │                                          │                                    │
  │  Limpia localStorage("cart:{slug}")      │                                    │
```

#### Validación de stock

```
Request POST /api/cart/items { productId, quantity }
  → resolve-tenant → req.tenantId
  → SELECT product WHERE id=? AND tenantId=?
    → 404 si no existe o no pertenece al tenant
  → SELECT cartItems WHERE productId=? (suma cantidades actuales)
  → IF (currentQuantity + requestedQuantity) > product.stock
    → 409 { error: "stock_insufficient", available: N }
  → ELSE
    → INSERT or UPDATE CartItem
    → 201 { cartItem }
```

### Interfaces / Contracts

```typescript
// packages/shared/src/types/cart.ts

interface CartDTO {
  id: string;
  userId: string;
  tenantId: string;
  items: CartItemDTO[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

interface CartItemDTO {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: number;          // precio actual del catálogo
  quantity: number;
  subtotal: number;       // price * quantity
}

interface AddCartItemDTO {
  productId: string;
  quantity: number;       // entero > 0
}

interface UpdateCartItemDTO {
  quantity: number;       // 0 elimina el item
}

interface MergeCartDTO {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

interface MergeCartResponse {
  cart: CartDTO;
  warnings: MergeWarning[];
}

interface MergeWarning {
  type: 'stock_adjusted' | 'product_removed';
  productId: string;
  productName: string;
  message: string;        // ej: "Cantidad ajustada de 10 a 5 (stock disponible)"
}

// Store shape (Zustand, cliente)
interface CartStore {
  items: LocalCartItem[];
  lastActivity: number;   // Date.now() para expiración
  isSynced: boolean;      // true si autenticado (source = DB)

  // Acciones
  addItem(productId: string, quantity: number): Promise<void>;
  updateItem(productId: string, quantity: number): Promise<void>;
  removeItem(productId: string): Promise<void>;
  clear(): void;
  syncFromServer(): Promise<void>;    // GET /api/cart
  mergeAnonymous(token: string): Promise<MergeCartResponse>;
}

interface LocalCartItem {
  productId: string;
  quantity: number;
  addedAt: number;        // timestamp para orden
}
```

### Frontend — Zustand Store

```typescript
// frontend/src/stores/cart.ts
//
// Modo anónimo:
//   createCartStore → middleware persist con localStorage key "cart:{tenantSlug}"
//   Expira si lastActivity > 30 días (se limpia al iniciar store)
//   Al cambiar tenant → se limpia automático (otro key)
//
// Modo autenticado:
//   Cada mutación llama API → actualiza store local con respuesta
//   Al logout → no se limpia (persiste en DB)
//
// Store único detecta modo vía hook useAuth()
```

### File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `packages/shared/src/types/cart.ts` | Crear | DTOs CartDTO, CartItemDTO, MergeCartDTO, MergeWarning, CartStore types |
| `backend/prisma/schema.prisma` | Modificar | Añadir modelos Cart, CartItem + índices |
| `backend/src/plugins/cart.ts` | Crear | Plugin Fastify: endpoints CRUD carrito con validación stock y precio desde catálogo |
| `backend/src/plugins/cart-merge.ts` | Crear | Plugin Fastify: endpoint POST /api/cart/merge con fusión y warnings |
| `backend/src/middleware/validate-cart.ts` | Crear | Middleware: valida pertenencia de item al mismo tenant |
| `frontend/src/stores/cart.ts` | Crear | Zustand store con persist middleware y dual mode (anon/auth) |
| `frontend/src/hooks/useCart.ts` | Crear | Hook que expone store + detecta modo anónimo/autenticado |
| `frontend/src/lib/cart-local.ts` | Crear | Utilidades: expiración, limpieza por cambio de tenant, merge prep |

### Testing Strategy

| Capa | Qué probar | Enfoque |
|------|-----------|---------|
| Unit | DTOs Zod (quantity > 0, productId required), utilidades expiración | Vitest |
| Unit | Zustand store: addItem en modo anónimo (localStorage mock), merge reduce duplicados | Vitest + zustand test utils |
| Integration | CRUD cart endpoints, validación stock insuficiente → 409, precio desde catálogo | Fastify inject() + test DB |
| Integration | Merge con duplicados (suma cantidades), stock ajustado, producto inactivo omitido | Fastify inject() |
| Integration | Cross-tenant: item de tenant B en carrito de tenant A → 403 | Fastify inject() |
| E2E | Flujo completo: anónimo → agrega → login → merge → consulta precio actual | Playwright |

### Escenarios críticos de integración

- Agregar producto sin stock → 409 con `available` count
- Fusionar carrito anónimo con 3 items: 1 duplicado (suma), 1 stock insuficiente (ajusta), 1 inactivo (omite)
- Producto de otro tenant en carrito autenticado → 403
- Carrito anónimo expirado (>30d) se limpia al iniciar store
- Cambio de tenant limpia automáticamente el localStorage

### Threat Matrix

N/A — El diseño de carrito de compras no afecta routing de infraestructura, shell commands, subprocesses, VCS/PR automation, clasificación de archivos ejecutables ni integración de procesos.

## Gestión de Pedidos

### Technical Approach

Plugin Fastify scoped con endpoints de checkout, consulta y cancelación de pedidos. El checkout opera dentro de una transacción Prisma que crea el pedido con snapshot de precios, descuenta stock y vacía el carrito atómicamente. Máquina de estados definida como un mapa de constantes con validación explícita de transiciones. Cada cambio de estado registra una entrada en `OrderHistory` con trazabilidad de usuario y timestamp. La visibilidad se controla por rol: admin/staff ven todos los pedidos del tenant, customer solo los propios. El contrato del evento `order.status.changed` se define como interfaz; la implementación del canal de entrega queda abierta.

### Architecture Decisions

| Decisión | Opción | Alternativas | Justificación |
|----------|--------|-------------|---------------|
| Snapshot en OrderItem | name, price, subtotal al checkout | Precio siempre desde catálogo | El pedido es un documento congelado; el catálogo puede cambiar después |
| Order number | `ORD-{YYYYMMDD}-{random8}` (único) | Auto-increment por tenant, UUID crudo | Legible para humanos, único sin depender de sequences partitioned por tenant |
| Checkout transaccional | `Prisma.$transaction` con todas las ops | Operaciones secuenciales sin transaction | Atomicidad: si falla stock descuento, no debe quedar order huérfano |
| Máquina de estados | Const map con transiciones explícitas | Workflow engine, state pattern OOP | Simple, tipado, sin dependencias externas |
| Stock en cancelación | Misma transacción que el cambio de estado | Job asíncrono de reconciliación | Consistencia inmediata. Sin riesgo de race condition |
| Evento | Contrato definido, implementación abierta | RabbitMQ desde inicio, EventEmitter | Contrato desacopla producer de consumer; se elige canal según necesidades |
| Precio total | Calculado como suma de subtotales de OrderItem | Campo `total` calculado en backend con lógica extra | `OrderItem.subtotal` es source of truth; `Order.total` es campo derivado mantenido por consistencia |

### State Machine

```
                 ┌──────────┐
                 │ pending  │
                 └────┬─────┘
                   ┌──┴──┐
                   ▼     ▼
             ┌──────────┐ ┌───────────┐
             │confirmed │ │ cancelled │
             └─────┬────┘ └───────────┘
                   │
                   ▼
             ┌──────────────┐
             │ preparing    │
             └──────┬───────┘
                    │
                    ▼
              ┌──────────┐
              │ shipped  │
              └─────┬────┘
                    │
                    ▼
              ┌───────────┐
              │ delivered │
              └───────────┘
```

```typescript
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['preparing',  'cancelled'],
  preparing:   ['shipped'],
  shipped:     ['delivered'],
  delivered:   [],
  cancelled:   [],
};
```

### Modelo de datos (Prisma — añadir)

```prisma
enum OrderStatus {
  pending
  confirmed
  preparing
  shipped
  delivered
  cancelled
}

model Order {
  id          String      @id @default(cuid())
  orderNumber String      @unique
  tenantId    String
  userId      String
  status      OrderStatus @default(pending)
  total       Decimal     @db.Decimal(10, 2)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user    User          @relation(fields: [userId], references: [id])
  tenant  Tenant        @relation(fields: [tenantId], references: [id])
  items   OrderItem[]
  history OrderHistory[]

  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, userId])
  @@index([tenantId, createdAt])
}

model OrderItem {
  id        String   @id @default(cuid())
  orderId   String
  productId String
  name      String   @default("")    // snapshot al momento de compra
  price     Decimal  @db.Decimal(10, 2)
  quantity  Int
  subtotal  Decimal  @db.Decimal(10, 2)
  createdAt DateTime @default(now())

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@index([orderId])
}

model OrderHistory {
  id         String       @id @default(cuid())
  orderId    String
  fromStatus OrderStatus?
  toStatus   OrderStatus
  userId     String
  createdAt  DateTime     @default(now())

  order Order @relation(fields: [orderId], references: [id])

  @@index([orderId])
  @@index([orderId, createdAt])
}
```

`OrderItem.name` es el nombre del producto al momento del checkout (el nombre en Product puede cambiar después). `OrderItem.price` y `subtotal` también son snapshot. `Order.total` se calcula y persiste al crear/actualizar el pedido como suma de subtotales.

### Data Flow — Checkout

```
POST /api/orders/checkout  [Auth: customer]

Cliente                        Backend                          DB
  │                              │                               │
  │  POST /orders/checkout       │                               │
  │─────────────────────────────>│                               │
  │                              │  resolve-tenant, scope-tenant │
  │                              │  require-role(customer)       │
  │                              │                               │
  │                              │  ┌─ Prisma.$transaction       │
  │                              │  │                            │
  │                              │  │ 1. GET cart + items + prods│
  │                              │  │   → 400 si cart vacío      │
  │                              │  │   → 409 si stock < qty     │
  │                              │  │                            │
  │                              │  │ 2. CREATE order (pending)  │
  │                              │  │                            │
  │                              │  │ 3. CREATE OrderItems       │
  │                              │  │   (snapshot name, price)   │
  │                              │  │                            │
  │                              │  │ 4. UPDATE product.stock    │
  │                              │  │   -= cartItem.quantity     │
  │                              │  │                            │
  │                              │  │ 5. DELETE CartItems (cart) │
  │                              │  │                            │
  │                              │  │ 6. CREATE OrderHistory     │
  │                              │  │   (null → pending)         │
  │                              │  └───────────────────────────>│
  │                              │                               │
  │                              │  [emit order.status.changed]  │
  │  201 { order }              │                               │
  │<─────────────────────────────│                               │
```

### Data Flow — Cancelación con restitución de stock

```
POST /api/orders/:id/cancel  [Auth: admin o customer propio]

Cliente                        Backend                          DB
  │                              │                               │
  │  POST /orders/:id/cancel     │                               │
  │─────────────────────────────>│                               │
  │                              │  resolve-tenant, scope-tenant │
  │                              │  GET order WHERE id=?        │
  │                              │  ────────────────────────────>│
  │                              │  order                        │
  │                              │<──────────────────────────────│
  │                              │                               │
  │                              │  Validar order.tenantId       │
  │                              │  Validar canTransition(status,│
  │                              │    'cancelled')               │
  │                              │  Validar: si customer, dueño  │
  │                              │                               │
  │                              │  ┌─ Prisma.$transaction       │
  │                              │  │ 1. UPDATE set status       │
  │                              │  │2. UPDATE product.stock    │
  │                              │  │   += orderItem.quantity   │
  │                              │  │3. CREATE OrderHistory     │
  │                              │  └───────────────────────────>│
  │                              │                               │
  │                              │  [emit order.status.changed]  │
  │  200 { order }              │                               │
  │<─────────────────────────────│                               │
```

### API Endpoints

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| `POST` | `/api/orders/checkout` | Sí | customer | Crear pedido desde carrito (transaccional) |
| `GET` | `/api/orders` | Sí | * | Listar pedidos (admin/staff: todos del tenant; customer: propios) con filtros |
| `GET` | `/api/orders/:id` | Sí | * | Detalle con items y precios snapshot |
| `PATCH` | `/api/orders/:id/status` | Sí | admin/staff | Avanzar estado según máquina |
| `POST` | `/api/orders/:id/cancel` | Sí | admin, customer propio | Cancelar (restituye stock) |

### Filtros — GET /api/orders

```typescript
interface OrderFilters {
  status?: OrderStatus;
  dateFrom?: string;   // ISO 8601
  dateTo?: string;     // ISO 8601
  minTotal?: number;
  maxTotal?: number;
  page?: number;
  limit?: number;
}
```

Admin/staff: query base `WHERE tenantId=?` más filtros opcionales. Customer: query base `WHERE tenantId=? AND userId=?` más filtros opcionales.

### Interfaces / Contracts

```typescript
// packages/shared/src/types/order.ts

enum OrderStatus {
  pending = 'pending',
  confirmed = 'confirmed',
  preparing = 'preparing',
  shipped = 'shipped',
  delivered = 'delivered',
  cancelled = 'cancelled',
}

interface OrderDTO {
  id: string;
  orderNumber: string;
  tenantId: string;
  userId: string;
  status: OrderStatus;
  total: number;
  items: OrderItemDTO[];
  history: OrderHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

interface OrderItemDTO {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface OrderHistoryEntry {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  userId: string;
  createdAt: string;
}

interface OrderStatusChangedEvent {
  event: 'order.status.changed';
  payload: {
    orderId: string;
    orderNumber: string;
    tenantId: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    userId: string;
    timestamp: string;  // ISO 8601
  };
}

// Función de validación de transiciones
function canTransition(from: OrderStatus, to: OrderStatus): boolean;
```

### File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `packages/shared/src/types/order.ts` | Crear | Tipos `OrderDTO`, `OrderItemDTO`, `OrderHistoryEntry`, `OrderStatus`, `OrderFilters`, evento `OrderStatusChangedEvent` |
| `backend/prisma/schema.prisma` | Modificar | Añadir modelos Order, OrderItem, OrderHistory y enum OrderStatus |
| `backend/src/plugins/orders.ts` | Crear | Plugin Fastify: checkout, listado, detalle, cambio de estado, cancelación |
| `backend/src/lib/state-machine.ts` | Crear | Función `canTransition` con mapa de transiciones permitidas |
| `backend/src/lib/order-number.ts` | Crear | Generador de order number `ORD-{YYYYMMDD}-{random8}` |
| `backend/src/lib/events.ts` | Crear | Definición de tipos de evento y emitter (impl simple: EventEmitter) |

### Testing Strategy

| Capa | Qué probar | Enfoque |
|------|-----------|---------|
| Unit | `canTransition`: todas las combinaciones permitidas y denegadas | Vitest — tabla de casos parametrizados |
| Unit | Generador `orderNumber`: formato, unicidad en test loop | Vitest |
| Unit | Validación Zod DTOs: filters, checkout request | Vitest |
| Integration | Checkout exitoso: order creado, stock descontado, carrito vacío | Fastify inject() + test DB + Prisma $transaction |
| Integration | Checkout con carrito vacío → 400 | Fastify inject() |
| Integration | Checkout con stock insuficiente → 409 (stock no descontado) | Fastify inject() |
| Integration | Cancelación: estado cambia, stock restituido | Fastify inject() |
| Integration | Cancelación denegada en `en_preparación` → 409 | Fastify inject() |
| Integration | Admin/staff ve todos los pedidos; customer solo los propios | Fastify inject() con mock JWT de distintos roles |
| Integration | Filtros por estado, fecha y precio | Fastify inject() |

### Escenarios críticos de integración

- Checkout con 3 items: 1 sin stock → 409, ningún cambio persistido (transacción rollback)
- Cancelar pedido en `pending` → stock restituido, historial registrado
- Cancelar pedido ya cancelado → 409
- Customer cancela pedido de otro usuario → 403
- Admin cambia estado de `pending` a `shipped` (salta `confirmed`) → 409
- Consulta cross-tenant: usuario tenant A no ve pedidos de tenant B → 404

### Threat Matrix

N/A — El diseño de gestión de pedidos no afecta routing de infraestructura, shell commands, subprocesses, VCS/PR automation, clasificación de archivos ejecutables ni integración de procesos.

### Open Questions (Acumuladas)

- [ ] ¿Se prefiere Prisma Zod Generator para tipos compartidos o tipos manuales en `packages/shared`?
- [ ] ¿Almacenamiento de assets se implementa con multer/gridfs o se difiere a CDN desde el inicio?
- [ ] ¿El slug del tenant se extrae de la URL path (`/:tenantSlug/...`) o de un encabezado HTTP personalizado para APIs?
- [ ] ¿Soft delete (status=archived) o hard delete para productos? (Diseño propone soft delete)
- [ ] ¿El evento `order.status.changed` se implementa con EventEmitter en proceso, o se reserva para un bus de mensajes (RabbitMQ/Redis PubSub) desde el inicio?
- [ ] ¿Se necesita paginación cursor-based para pedidos o offset (page/limit) es suficiente para el volumen esperado?
