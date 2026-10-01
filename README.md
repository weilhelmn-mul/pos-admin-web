# POS Admin Web — Remote Point of Sale Management

> Plataforma web remota para administrar ventas, productos y clientes sincronizados
> desde una aplicación POS Desktop mediante Firebase Firestore.

**URL de producción**: https://pos-crear.vercel.app

## Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (estilo New York) + `lucide-react` para iconos
- **Auth + DB**: Firebase Authentication + Cloud Firestore
- **Server SDK**: `firebase-admin` en API Routes
- **Deployment**: Vercel (standalone output)

## Funcionalidades

- **Login** con Firebase Auth (Email/Password) y recuperación de contraseña
- **Dashboard resumen**: tarjetas de KPIs (ventas totales, ingresos del mes, productos, clientes),
  ventas recientes, top productos, estado de sincronización
- **Ventas**: tabla filtrable por estado y búsqueda por número/cliente/DNI, diálogo de detalle,
  exportación CSV
- **Productos**: tabla filtrable por categoría y stock, tarjetas resumen (total, bajo, agotado,
  valor de inventario), exportación CSV
- **Clientes**: tabla con búsqueda por DNI/RUC y filtro por tipo de documento, tarjetas
  resumen (total, con email, con teléfono, empresas), exportación CSV
- **Configuración**: estado de la conexión Firebase, información del usuario actual con UID
  copiable, formulario editable de datos del negocio (guardado en `settings/store`)
- **API REST** en `/api/sales`, `/api/products`, `/api/customers`, `/api/sync` que usa
  `firebase-admin` con `FIREBASE_SERVICE_ACCOUNT` (server-side)

## Arquitectura de sincronización

```
POS Desktop (Electron + SQLite)
        │
        │  POST /api/sales, /api/products, /api/customers, /api/sync
        ▼
   Firebase Firestore  ◄────  POS Admin Web (esta app, lectura)
        │
        ▼
   Firebase Auth  ◄────  POS Admin Web (login)
```

- El POS Desktop escribe en Firestore usando los endpoints REST de esta app
  (idempotencia por `externalId`, anti-duplicados por DNI/RUC).
- Esta app web lee directamente desde el SDK cliente de Firestore.
- Las escrituras desde el escritorio se reflejan automáticamente en la web.

## Estructura

```
src/
  app/
    page.tsx                         # Redirige a /dashboard o /login
    login/page.tsx                   # Formulario login + recuperación
    dashboard/
      layout.tsx                     # Auth guard + Sidebar
      page.tsx                        # Resumen
      ventas/page.tsx                 # Tabla de ventas
      productos/page.tsx              # Catálogo de productos
      clientes/page.tsx               # Directorio de clientes
      configuracion/page.tsx          # Ajustes + info Firebase
    api/
      sales/route.ts                  # GET + POST (idempotencia)
      products/route.ts               # GET + POST (upsert)
      customers/route.ts              # GET + POST (anti-duplicado 409)
      sync/route.ts                   # GET (status) + POST (batch)
  components/
    sidebar.tsx                      # Sidebar responsive (Sheet en móvil)
    theme-provider.tsx               # next-themes wrapper
    ui/                              # Componentes shadcn-style
      button input label card badge
      skeleton table dialog select
      scroll-area separator avatar
      sheet toaster
  hooks/
    use-auth.ts                      # Hook de auth con Firebase
  lib/
    firebase.ts                      # Client SDK (auth, db)
    admin.ts                         # Admin SDK (getAdminDb)
    export.ts                        # CSV helpers
    format.ts                        # formatCurrency, formatDate, ...
    utils.ts                         # cn() helper
```

## Desarrollo

```bash
# 1. Configurar variables de entorno
cp .env.local.example .env.local
# Edita .env.local con tus credenciales Firebase

# 2. Instalar dependencias
bun install

# 3. Correr en desarrollo
bun run dev
# → abre http://localhost:3000

# 4. Build de producción
bun run build
bun run start
```

## Configuración Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com) llamado `pos-creard`.
2. Habilita **Authentication → Email/Password**.
3. Crea un usuario `admin@pos-creard.com` con su contraseña.
4. Habilita **Cloud Firestore** en modo producción o pruebas.
5. Copia las variables `NEXT_PUBLIC_FIREBASE_*` desde la configuración web.
6. Genera una **service account** en `Configuración del proyecto → Cuentas de servicio`
   y pega el JSON completo en `FIREBASE_SERVICE_ACCOUNT`.

## Reglas de Firestore recomendadas

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

Para producción considera restringir por `uid` o `custom claims` de rol.

## Deploy en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel, **New Project** → importa el repo.
3. Añade todas las variables de entorno (incluida `FIREBASE_SERVICE_ACCOUNT`
   como JSON string sin saltos de línea).
4. Deploy. La URL final es `https://pos-crear.vercel.app`.

## Licencia

Privado — © POS Creard
