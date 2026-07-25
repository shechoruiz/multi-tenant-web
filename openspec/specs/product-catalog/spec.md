# Catálogo de Productos — Especificación

## Propósito

Gestionar el catálogo de productos multi-tenant de Shelf. Cada tenant administra sus propios productos y categorías con aislamiento total. Expone un listado público para la tienda (solo activos, sin datos de inventario) y uno administrativo (con stock, SKU y estado).

## Requisitos

### Requisito: CRUD de Productos Scoped al Tenant

El sistema DEBE permitir a usuarios con rol admin-tenant o staff gestionar productos dentro de su tenant. Cada producto DEBE incluir: nombre, descripción, precio, imágenes, SKU único por tenant, stock, categoría y estado (activo/inactivo).

#### Escenario: Crear producto exitoso

- DADO un admin-tenant o staff autenticado en su tenant
- CUANDO envía datos válidos con SKU único y formato correcto
- ENTONCES el sistema crea el producto con estado activo

#### Escenario: SKU duplicado en el tenant

- DADO un producto existente con SKU "PROD-001" en el tenant
- CUANDO se crea otro con el mismo SKU
- ENTONCES el sistema rechaza con error de SKU duplicado

#### Escenario: Staff no puede eliminar

- DADO un usuario con rol staff
- CUANDO intenta eliminar un producto
- ENTONCES el sistema rechaza con error 403

#### Escenario: Admin-tenant elimina producto

- DADO un admin-tenant autenticado
- CUANDO elimina un producto existente
- ENTONCES el sistema lo elimina lógica o físicamente

#### Escenario: Acceso cruzado bloqueado

- DADO un admin-tenant en "tienda-a"
- CUANDO intenta acceder a un producto de "tienda-b"
- ENTONCES el sistema valida tenant_id y rechaza con error 404

### Requisito: Categorías Jerárquicas por Tenant

El sistema DEBE permitir que cada tenant cree categorías organizadas jerárquicamente (padre-hijo) con profundidad indefinida.

#### Escenario: Crear categoría raíz

- DADO un admin-tenant autenticado
- CUANDO crea una categoría sin padre
- ENTONCES el sistema la guarda como categoría raíz del tenant

#### Escenario: Crear subcategoría

- DADO una categoría raíz existente
- CUANDO se crea una categoría con padre asignado
- ENTONCES el sistema la asigna como hija

#### Escenario: Eliminar categoría con hijas

- DADO una categoría con subcategorías activas
- CUANDO se intenta eliminar
- ENTONCES el sistema rechaza indicando dependencias hijas

### Requisito: Imágenes de Producto

El sistema DEBE soportar subida de imágenes para productos con validación de formato y almacenamiento persistente.

#### Escenario: Subir imagen válida

- DADO un admin-tenant o staff autenticado
- CUANDO sube una imagen en formato PNG, JPEG o WebP
- ENTONCES el sistema almacena y asocia la URL al producto

#### Escenario: Formato no soportado

- DADO un admin-tenant autenticado
- CUANDO sube un archivo en formato no soportado (GIF, BMP, TIFF)
- ENTONCES el sistema rechaza con error de formato inválido

### Requisito: Búsqueda y Filtrado de Productos

El sistema DEBE ofrecer búsqueda y filtrado dentro del tenant por categoría, rango de precio, estado y texto libre (nombre, SKU, descripción).

#### Escenario: Filtrar por categoría y precio

- DADO productos en categorías y rangos de precio variados
- CUANDO se filtra por categoría específica y rango de precio
- ENTONCES el sistema retorna solo productos que cumplen ambos criterios

#### Escenario: Buscar por texto parcial

- DADO productos con nombres y SKUs diversos
- CUANDO se ingresa un término de búsqueda
- ENTONCES el sistema retorna coincidencias parciales en nombre, descripción o SKU

### Requisito: Vista Pública vs Administrativa

El sistema DEBE exponer dos vistas: una pública para visitantes (tienda) y una administrativa para usuarios autenticados con rol adecuado.

#### Escenario: Vista pública omite inactivos

- DADO productos activos e inactivos en el tenant
- CUANDO un visitante anónimo accede a la tienda
- ENTONCES el sistema retorna solo productos activos, sin stock ni SKU

#### Escenario: Vista admin incluye todo

- DADO un admin-tenant o staff autenticado
- CUANDO consulta el listado administrativo
- ENTONCES el sistema retorna todos los productos con stock, SKU y estado
