# Gestión de Pedidos — Especificación

## Propósito

Gestionar el ciclo de vida de pedidos multi-tenant en Shelf: checkout desde carrito, máquina de estados con trazabilidad, validación/descuento de stock, cancelación, consultas con filtros y notificación de cambios. Depende de tenant-management (scope), product-catalog (items/stock), shopping-cart (origen) y user-auth (autenticación).

## Requisitos

### Requisito: Checkout desde Carrito

El sistema DEBE permitir a un usuario autenticado (rol customer) crear un pedido desde su carrito activo. DEBE validar stock disponible, descontar stock, vaciar el carrito y asignar estado `pendiente`. Si el carrito está vacío o hay stock insuficiente, DEBE rechazar sin descontar stock.

#### Escenario: Checkout exitoso
- DADO un usuario autenticado con carrito no vacío y stock suficiente
- CUANDO solicita crear el pedido
- ENTONCES el sistema crea el pedido en `pendiente`, descuenta stock y vacía el carrito

#### Escenario: Carrito vacío
- DADO un usuario con carrito vacío
- CUANDO intenta checkout
- ENTONCES el sistema rechaza indicando que el carrito está vacío

#### Escenario: Stock insuficiente
- DADO un producto en el carrito con cantidad mayor al stock disponible
- CUANDO se intenta crear el pedido
- ENTONCES el sistema rechaza indicando los productos sin stock suficiente

### Requisito: Máquina de Estados

El sistema DEBE gestionar pedidos con esta máquina de estados: `pendiente` → `confirmado` → `en_preparación` → `enviado` → `entregado`. Desde `pendiente` o `confirmado` se PUEDE cancelar. Al cancelar, DEBE restituir el stock.

#### Escenario: Transiciones progresivas
- DADO un pedido en `pendiente`
- CUANDO el admin-tenant o staff avanza al siguiente estado
- ENTONCES el pedido transiciona según el flujo definido

#### Escenario: Cancelación permitida
- DADO un pedido en `pendiente` o `confirmado`
- CUANDO el admin-tenant o customer solicitan cancelar
- ENTONCES el sistema cambia a `cancelado` y restituye el stock

#### Escenario: Cancelación denegada
- DADO un pedido en `en_preparación`, `enviado` o `entregado`
- CUANDO se solicita cancelar
- ENTONCES el sistema rechaza indicando que el estado no permite cancelación

### Requisito: Historial de Cambios

El sistema DEBE registrar cada cambio de estado: timestamp, usuario, estado anterior y estado nuevo.

#### Escenario: Registro de transición
- DADO un pedido en `pendiente`
- CUANDO un admin confirma el pedido
- ENTONCES el sistema crea una entrada historial con estado_anterior, estado_nuevo, usuario_id y timestamp

### Requisito: Visibilidad Según Rol

admin-tenant y staff DEBEN ver todos los pedidos del tenant. customer DEBE ver solo sus propios pedidos.

#### Escenario: Admin ve todo
- DADO un admin-tenant autenticado
- CUANDO consulta pedidos
- ENTONCES el sistema retorna todos los pedidos del tenant

#### Escenario: Customer ve lo propio
- DADO un usuario customer autenticado
- CUANDO consulta pedidos
- ENTONCES el sistema retorna solo pedidos creados por ese usuario

### Requisito: Listado con Filtros

El sistema DEBE permitir filtrar pedidos por estado, rango de fechas y rango de precio total.

#### Escenario: Filtro por estado
- DADO pedidos en múltiples estados
- CUANDO se filtra por `pendiente`
- ENTONCES el sistema retorna solo pedidos en ese estado

#### Escenario: Filtro por fechas
- DADO pedidos en distintas fechas
- CUANDO se filtra por rango de fechas
- ENTONCES el sistema retorna pedidos dentro del rango

### Requisito: Notificación de Cambio de Estado

El sistema DEBE emitir un evento `order.status.changed` al cambiar de estado, con order_id, estado_anterior, estado_nuevo y timestamp. El canal de entrega (email, WebSocket, push) queda abierto.

#### Escenario: Evento emitido
- DADO un pedido que cambia de estado
- CUANDO el sistema procesa la transición
- ENTONCES se emite el evento con los datos de la transición
