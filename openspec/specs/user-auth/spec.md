# User Auth — Especificación

## Propósito

Gestionar autenticación y autorización multi-tenant en Shelf: registro de usuarios scoped al tenant, login con slug+email+password, JWT con refresh token rotation, roles jerárquicos y protección de rutas en frontend y backend. Depende de tenant-management para la existencia del tenant y validación del slug.

## Requisitos

### Requisito: Registro de Usuario

El sistema DEBE permitir registrar un usuario dentro de un tenant activo. El registro requiere email, contraseña y rol. La contraseña DEBE cumplir requisitos mínimos de fortaleza.

#### Escenario: Registro exitoso

- DADO un tenant activo y datos válidos (email único en el tenant, contraseña segura)
- CUANDO un admin-tenant envía el registro
- ENTONCES el sistema crea el usuario con rol staff por defecto y devuelve los datos del usuario

#### Escenario: Contraseña débil

- DADO una contraseña con menos de 8 caracteres, sin mayúsculas o sin números
- CUANDO se envía el registro
- ENTONCES el sistema rechaza con error indicando los requisitos de fortaleza (8+ caracteres, mayúscula, número)

#### Escenario: Email duplicado en el mismo tenant

- DADO un usuario existente con email "a@b.com" en el tenant "mi-tienda"
- CUANDO se registra otro usuario con el mismo email en "mi-tienda"
- ENTONCES el sistema rechaza con error de email duplicado

#### Escenario: Email duplicado en otro tenant

- DADO un usuario con email "a@b.com" en "mi-tienda"
- CUANDO se registra un usuario con el mismo email en "otra-tienda"
- ENTONCES el sistema permite el registro (email es único por tenant, no global)

### Requisito: Login Multi-Tenant

El sistema DEBE autenticar usuarios usando slug del tenant + email + contraseña. El slug determina el tenant de alcance.

#### Escenario: Login exitoso

- DADO credenciales válidas en un tenant activo
- CUANDO el usuario ingresa slug, email y contraseña correctos
- ENTONCES el sistema devuelve access token en response body y establece refresh token como httpOnly cookie

#### Escenario: Slug inexistente

- DADO que el slug no corresponde a ningún tenant
- CUANDO se intenta autenticar
- ENTONCES el sistema responde error genérico de credenciales sin revelar existencia del slug o email

#### Escenario: Contraseña incorrecta

- DADO un usuario registrado en el tenant con email correcto
- CUANDO ingresa contraseña incorrecta
- ENTONCES el sistema rechaza con error de credenciales inválidas

#### Escenario: Cuenta desactivada

- DADO un usuario con estado inactivo en el tenant
- CUANDO intenta autenticar
- ENTONCES el sistema rechaza con error de cuenta desactivada

#### Escenario: Login desde tenant distinto al del usuario

- DADO un usuario registrado en "mi-tienda"
- CUANDO intenta autenticar con slug "otra-tienda" pero su email y contraseña de "mi-tienda"
- ENTONCES el sistema rechaza con error de credenciales inválidas

### Requisito: JWT Access Token

El sistema DEBE emitir un JWT access token de corta duración (15 minutos). El token DEBE contener los claims: user_id, tenant_id, rol y tenant_slug. El backend DEBE verificar firma y vigencia en cada request protegida.

#### Escenario: Token válido

- DADO un access token vigente con claims correctos
- CUANDO se envía en header Authorization: Bearer \<token\>
- ENTONCES el middleware valida el token y expone el payload en el contexto de la request

#### Escenario: Token expirado

- DADO un access token cuyo tiempo de vida (15 min) ha expirado
- CUANDO se envía en una request protegida
- ENTONCES el sistema rechaza con error 401 y el frontend inicia refresh automático

#### Escenario: Token con firma inválida

- DADO un token modificado o firmado con clave distinta
- CUANDO se envía en una request
- ENTONCES el sistema rechaza con error 401

### Requisito: Refresh Token Rotation

El sistema DEBE emitir un refresh token de larga duración (7 días) almacenado en httpOnly cookie. Al refrescar, el sistema DEBE invalidar el token anterior y emitir un nuevo par (token rotation).

#### Escenario: Refresh exitoso

- DADO un refresh token válido en cookie httpOnly (Secure en producción, SameSite=Strict)
- CUANDO el access token expira y el frontend solicita POST /auth/refresh
- ENTONCES el sistema invalida el refresh token anterior, emite nuevo access token y nuevo refresh token

#### Escenario: Replay de refresh token (detección de robo)

- DADO un refresh token que ya fue usado y rotado
- CUANDO se intenta usar nuevamente
- ENTONCES el sistema invalida TODOS los refresh tokens activos del usuario (robo presumido) y requiere reautenticación completa

#### Escenario: Refresh token expirado

- DADO un refresh token con más de 7 días desde su emisión
- CUANDO se intenta usar
- ENTONCES el sistema rechaza con error 401 y requiere login completo

#### Escenario: Cookie faltante

- DADO una request sin cookie de refresh token
- CUANDO se solicita POST /auth/refresh
- ENTONCES el sistema rechaza con error 401

### Requisito: Cierre de Sesión

El sistema DEBE permitir cerrar sesión invalidando el refresh token activo.

#### Escenario: Logout exitoso

- DADO un usuario autenticado con refresh token activo en cookie
- CUANDO solicita POST /auth/logout
- ENTONCES el sistema invalida el refresh token en base de datos y elimina la cookie

#### Escenario: Logout sin sesión activa

- DADO un usuario sin cookie de refresh token o con token ya invalidado
- CUANDO solicita POST /auth/logout
- ENTONCES el sistema responde 200 (idempotente, no genera error)

### Requisito: Middleware de Tenant

El backend DEBE incluir middleware que extrae el slug del tenant de la ruta (/:tenantSlug/*), valida que el tenant exista y esté activo, y adjunta tenant_id al contexto de la request.

#### Escenario: Slug activo y válido

- DADO una request GET /mi-tienda/productos
- CUANDO el middleware procesa la ruta antes del handler
- ENTONCES extrae el slug "mi-tienda", consulta el tenant, verifica estado activo y adjunta tenant_id al request context

#### Escenario: Slug de tenant desactivado o inexistente

- DADO una request a /slug-inexistente/productos
- CUANDO el middleware procesa la ruta
- ENTONCES responde 404 sin revelar si el slug existe o está desactivado

### Requisito: Middleware de Rol

El backend DEBE incluir middleware que verifica el rol del usuario autenticado contra el rol requerido por la ruta. Roles definidos: super-admin (acceso global), admin-tenant (acceso a su tenant), staff (acceso limitado de lectura/operación).

#### Escenario: Acceso permitido por rol suficiente

- DADO un usuario autenticado con rol admin-tenant
- CUANDO accede a una ruta decorada con @requiresRole("admin-tenant")
- ENTONCES el middleware permite la ejecución del handler

#### Escenario: Acceso denegado por rol insuficiente

- DADO un usuario autenticado con rol staff
- CUANDO accede a una ruta decorada con @requiresRole("admin-tenant")
- ENTONCES el middleware deniega con error 403 Forbidden

#### Escenario: Ruta pública sin autenticación

- DADO una request sin token de acceso
- CUANDO accede a una ruta pública (ej. POST /auth/login)
- ENTONCES el middleware de rol no se ejecuta (ruta excluida)

#### Escenario: Super-admin acceso cruzado

- DADO un usuario con rol super-admin autenticado
- CUANDO accede a recursos de cualquier tenant
- ENTONCES el middleware de rol permite el acceso (super-admin no tiene restricción de tenant)

### Requisito: Protección de Rutas en Frontend

El frontend DEBE proteger rutas según el rol del usuario autenticado y redirigir al login si no hay sesión válida.

#### Escenario: Usuario autenticado con rol suficiente

- DADO un usuario autenticado con rol staff y access token vigente
- CUANDO navega a /:tenantSlug/productos
- ENTONCES el frontend renderiza la página normalmente

#### Escenario: Usuario no autenticado redirigido al login

- DADO un visitante sin access token ni refresh token válido
- CUANDO intenta navegar a /:tenantSlug/admin
- ENTONCES el frontend redirige a /:tenantSlug/login

#### Escenario: Rol insuficiente en navegación

- DADO un usuario autenticado con rol staff
- CUANDO intenta navegar a /:tenantSlug/admin/configuracion
- ENTONCES el frontend muestra una página 403 o redirige al dashboard principal

#### Escenario: Refresh automático al cargar la app

- DADO un usuario con refresh token en cookie pero sin access token en memoria
- CUANDO carga la aplicación
- ENTONCES el frontend intenta refresh automático antes de renderizar rutas protegidas

### Requisito: Recuperación de Contraseña

El sistema DEBE permitir recuperación de contraseña mediante email con token de un solo uso y tiempo de expiración de 1 hora.

#### Escenario: Solicitud de recuperación exitosa

- DADO un usuario registrado con email válido en el tenant
- CUANDO solicita POST /auth/forgot-password con slug y email
- ENTONCES el sistema genera un token único, lo almacena con expiración de 1 hora y envía un email con el enlace de restablecimiento

#### Escenario: Email no registrado

- DADO un email no registrado en ningún tenant del sistema
- CUANDO se solicita recuperación
- ENTONCES el sistema responde 200 (éxito genérico) sin revelar si el email existe

#### Escenario: Token expirado

- DADO un token de recuperación con más de 1 hora desde su creación
- CUANDO se envía en POST /auth/reset-password con nueva contraseña
- ENTONCES el sistema rechaza con error de token expirado y solicita nueva solicitud

#### Escenario: Restablecimiento exitoso

- DADO un token de recuperación válido y contraseña que cumple requisitos de fortaleza
- CUANDO el usuario envía POST /auth/reset-password con token y nueva contraseña
- ENTONCES el sistema actualiza la contraseña, invalida todos los refresh tokens del usuario y redirige al login

#### Escenario: Contraseña débil en restablecimiento

- DADO un token de recuperación válido
- CUANDO el usuario intenta establecer una contraseña que no cumple requisitos de fortaleza
- ENTONCES el sistema rechaza indicando los requisitos de fortaleza
