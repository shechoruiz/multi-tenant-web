# Shopping Cart — Especificación

## Propósito

Gestionar el carrito de compras multi-tenant de Shelf. Soporta carritos anónimos (localStorage) y autenticados (DB), fusión al login, validación de stock en tiempo real, precio contra catálogo actual y expiración de carritos huérfanos. Depende de tenant-management (scope) y product-catalog (productos y stock).

## Requisitos

### Requisito: Carrito Anónimo

Visitantes no autenticados DEBEN poder gestionar un carrito persistido en localStorage, scoped al tenant activo. Al cambiar de tenant, el carrito anónimo DEBE limpiarse.

#### Escenario: Agregar producto a carrito anónimo

- DADO un visitante en "mi-tienda"
- CUANDO agrega un producto activo con stock suficiente
- ENTONCES el sistema persiste en localStorage con tenant_id, product_id y cantidad

#### Escenario: Cambio de tenant limpia carrito anónimo

- DADO un carrito anónimo con productos de "mi-tienda"
- CUANDO el visitante navega a "otra-tienda"
- ENTONCES el sistema limpia el carrito anónimo local

### Requisito: Carrito Autenticado

Usuarios autenticados DEBEN tener su carrito persistido en base de datos, asociado a user_id y tenant_id.

#### Escenario: Persistencia en DB

- DADO un usuario autenticado en "mi-tienda"
- CUANDO agrega un producto
- ENTONCES el sistema persiste el item en CartItem con user_id y tenant_id

### Requisito: Gestión de Items del Carrito

El sistema DEBE permitir agregar productos, quitarlos y actualizar cantidad. Las cantidades DEBEN ser enteros positivos (>0).

#### Escenario: Agregar producto nuevo

- DADO un carrito sin el producto X
- CUANDO el usuario agrega X con cantidad 1
- ENTONCES el sistema crea un nuevo item en el carrito

#### Escenario: Incrementar cantidad de producto existente

- DADO un carrito con producto X, cantidad 2
- CUANDO el usuario agrega producto X nuevamente
- ENTONCES el sistema incrementa la cantidad a 3

#### Escenario: Actualizar cantidad

- DADO un carrito con producto X, cantidad 3
- CUANDO el usuario actualiza a cantidad 1
- ENTONCES el sistema modifica la cantidad

#### Escenario: Quitar producto

- DADO un carrito con producto X
- CUANDO el usuario elimina producto X
- ENTONCES el sistema remueve el item del carrito

#### Escenario: Cantidad inválida

- DADO un carrito con producto X
- CUANDO el usuario intenta establecer cantidad 0 o negativa
- ENTONCES el sistema rechaza y no modifica el carrito

### Requisito: Validación de Stock

El sistema DEBE verificar el stock disponible del producto en el catálogo antes de agregar o actualizar cantidad.

#### Escenario: Stock suficiente

- DADO un producto con stock 10
- CUANDO el usuario agrega cantidad 5
- ENTONCES el sistema permite la operación

#### Escenario: Stock insuficiente

- DADO un producto con stock 3
- CUANDO el usuario intenta agregar cantidad 10
- ENTONCES el sistema rechaza con error de stock insuficiente

### Requisito: Precio contra Producto Actual

El sistema DEBE calcular el precio del carrito contra el precio vigente en el catálogo. NO DEBE almacenar precio por item.

#### Escenario: Precio actualizado se refleja en carrito

- DADO un producto X con precio anterior $10 y precio actual $12
- CUANDO el usuario consulta el carrito
- ENTONCES el sistema muestra el precio a $12 (precio actual del catálogo)

### Requisito: Fusión de Carrito Anónimo al Hacer Login

El sistema DEBE fusionar el carrito anónimo local con el carrito persistente del usuario al iniciar sesión. Los items duplicados DEBEN sumar cantidades. El carrito local DEBE limpiarse tras la fusión.

#### Escenario: Fusión sin conflictos

- DADO carrito anónimo con producto A (cant 2) y carrito en DB con producto B (cant 1)
- CUANDO el usuario inicia sesión
- ENTONCES el carrito final contiene A(2) y B(1)

#### Escenario: Fusión con producto duplicado

- DADO carrito anónimo con X(2) y carrito en DB con X(3)
- CUANDO el usuario inicia sesión
- ENTONCES el carrito final contiene X(5)

#### Escenario: Fusión con stock insuficiente

- DADO carrito anónimo con X(10) pero stock actual del producto es 5
- CUANDO el usuario inicia sesión
- ENTONCES el sistema ajusta cantidad a 5 y notifica al usuario

#### Escenario: Fusión con producto inexistente

- DADO carrito anónimo con producto Y que fue eliminado o está inactivo
- CUANDO el usuario inicia sesión
- ENTONCES el sistema omite Y del carrito final y notifica al usuario

### Requisito: Scope por Tenant

El sistema DEBE asegurar que cada carrito contenga solo productos del mismo tenant. No DEBE permitir mezclar productos de distintos tenants.

#### Escenario: Producto de otro tenant bloqueado

- DADO un carrito activo en "mi-tienda"
- CUANDO el usuario intenta agregar un producto de "otra-tienda"
- ENTONCES el sistema rechaza con error de tenant mismatch

### Requisito: Limpieza de Carritos Expirados

El sistema DEBE limpiar periódicamente carritos anónimos sin actividad por más de 30 días. Los carritos de usuarios autenticados DEBEN persistir hasta vaciado explícito.

#### Escenario: Carrito anónimo expirado

- DADO un carrito anónimo sin actividad por más de 30 días
- CUANDO el sistema ejecuta la limpieza programada
- ENTONCES elimina los items del carrito

#### Escenario: Carrito autenticado preservado

- DADO un carrito autenticado sin actividad por 60 días
- CUANDO el sistema ejecuta la limpieza
- ENTONCES el carrito persiste sin cambios

## Dependencias

| Dependencia | Relación |
|-------------|----------|
| tenant-management | El carrito opera scoped al tenant_id del contexto |
| product-catalog | Los items usan productos y validan stock contra el catálogo |
| user-auth | La fusión al login depende del evento de autenticación exitosa |
