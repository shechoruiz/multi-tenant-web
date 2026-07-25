# Tenant Management — Especificación

## Propósito

Gestionar el ciclo de vida de tenants en Shelf: registro, autenticación scoped, personalización visual, roles de acceso y aislamiento de datos. Cada tenant opera como tienda independiente con datos aislados.

## Requisitos

### Requisito: Registro de Tenant

El sistema DEBE permitir registrar un tenant con nombre, slug único y email de contacto. El slug se usa como identificador en la URL.

#### Escenario: Registro exitoso

- DADO datos válidos (nombre, slug único, email correcto)
- CUANDO el super-admin envía el registro
- ENTONCES el sistema crea el tenant con estado activo

#### Escenario: Slug duplicado

- DADO un tenant existente con slug "mi-tienda"
- CUANDO se registra otro con el mismo slug
- ENTONCES el sistema rechaza con error de slug duplicado

#### Escenario: Email inválido

- DADO un email con formato incorrecto
- CUANDO se envía el registro
- ENTONCES el sistema rechaza indicando formato inválido

### Requisito: Autenticación Scoped al Tenant

El sistema DEBE autenticar usuarios usando slug + email + contraseña. El slug determina el tenant de alcance.

#### Escenario: Login exitoso

- DADO credenciales válidas en "mi-tienda"
- CUANDO el usuario ingresa slug, email y contraseña correctos
- ENTONCES el sistema emite un JWT con tenant_id y rol

#### Escenario: Slug inexistente

- DADO que el slug no corresponde a ningún tenant
- CUANDO se intenta autenticar
- ENTONCES el sistema responde error 404 sin revelar existencia del email

#### Escenario: Contraseña incorrecta

- DADO un usuario en "mi-tienda"
- CUANDO ingresa slug y email correctos pero contraseña incorrecta
- ENTONCES el sistema rechaza con error de credenciales inválidas

### Requisito: Panel de Configuración Visual

El sistema DEBE permitir al admin-tenant personalizar colores, logo, tipografía y favicon.

#### Escenario: Actualizar colores

- DADO un admin-tenant en el panel
- CUANDO actualiza colores con valores HEX válidos
- ENTONCES el sistema guarda y aplica los cambios al frontend

#### Escenario: Subir logo

- DADO un admin-tenant autenticado
- CUANDO sube una imagen en formato soportado (PNG, SVG, WebP)
- ENTONCES el sistema almacena el archivo y actualiza la URL

#### Escenario: Formato no soportado

- DADO un admin-tenant autenticado
- CUANDO sube un archivo en formato no soportado
- ENTONCES el sistema rechaza con error de formato inválido

### Requisito: Roles y Permisos

El sistema DEBE implementar tres roles: super-admin, admin-tenant y staff.

#### Escenario: Super-admin ve todos los tenants

- DADO un usuario con rol super-admin
- CUANDO consulta la lista de tenants
- ENTONCES el sistema muestra todos los tenants sin filtro

#### Escenario: Admin-tenant bloqueado de otro tenant

- DADO un admin-tenant en "mi-tienda"
- CUANDO intenta acceder a configuración de "otra-tienda"
- ENTONCES el sistema bloquea con error 403

#### Escenario: Staff sin permisos de escritura

- DADO un usuario staff en "mi-tienda"
- CUANDO intenta modificar la configuración visual
- ENTONCES el sistema rechaza por permisos insuficientes

### Requisito: Aislamiento de Datos

El sistema DEBE garantizar que cada tenant solo acceda a sus datos. Toda consulta DEBE filtrar por tenant_id del usuario.

#### Escenario: Consulta respeta tenant

- DADO un admin-tenant en "mi-tienda"
- CUANDO consulta productos o usuarios
- ENTONCES el sistema retorna solo datos de su tenant

#### Escenario: Acceso cruzado bloqueado

- DADO un usuario con sesión en "mi-tienda"
- CUANDO accede a un recurso de "otra-tienda" vía URL manipulada
- ENTONCES el sistema valida el tenant_id y rechaza la solicitud

### Requisito: Vista Previa Visual

El sistema DEBE ofrecer vista previa en vivo antes de publicar cambios. Los cambios solo se persisten al confirmar.

#### Escenario: Vista previa temporal

- DADO un admin-tenant que modificó colores y logo
- CUANDO selecciona "Vista previa"
- ENTONCES el sistema muestra la tienda con los cambios sin persistirlos

#### Escenario: Publicación

- DADO un admin-tenant que verificó los cambios
- CUANDO confirma y publica
- ENTONCES el sistema persiste la configuración y la aplica
