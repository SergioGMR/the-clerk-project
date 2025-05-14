# 📺 The Clerk Project

Directorio de canales Acestream con autenticación de usuarios mediante Clerk. Permite a los usuarios ver una lista de canales organizados por categorías, filtrarlos por etiquetas y calidad, y guardar sus favoritos en una cuenta personal.

[![Visita la Demo](https://img.shields.io/badge/Demo-Online-red)](https://the-clerk-project.vercel.app/)

## 🌟 Características

- 📋 Catálogo completo de canales organizados por grupos
- 🔍 Filtrado avanzado por etiquetas, calidad y término de búsqueda
- 💾 Sistema de favoritos para usuarios registrados
- 🔄 Actualización automática de información de canales
- 🔐 Autenticación de usuarios mediante Clerk
- 📱 Diseño responsive para dispositivos móviles y escritorio

## 📸 Capturas de Pantalla

![Página Principal](https://i.imgur.com/pSUBDDM.png)
*Página principal con todos los grupos de canales disponibles*

![Detalle de Canales](https://i.imgur.com/BMHCdQO.png)
*Vista de detalle de los canales dentro de un grupo*

![Favoritos](https://i.imgur.com/vGDLkeZ.png)
*Sección de favoritos personal para cada usuario*

## 🔒 Integración con Clerk

Este proyecto utiliza [Clerk](https://clerk.dev/) para gestionar la autenticación de usuarios y proporcionar una experiencia segura con las siguientes características:

- **Sesiones de usuario seguras**: Los usuarios pueden registrarse e iniciar sesión de forma segura.
- **Protección de rutas**: Las páginas que requieren autenticación, como `/favorites`, están protegidas mediante middleware.
- **Almacenamiento de preferencias**: Los favoritos de cada usuario se asocian con su ID único de Clerk.
- **Experiencia de usuario personalizada**: La interfaz muestra contenido personalizado cuando el usuario está autenticado.

### Implementación del Middleware

El proyecto utiliza un middleware de Clerk para proteger rutas específicas:

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher([
  '/favorites(.*)',
]);

export const onRequest = clerkMiddleware((auth, context) => {
  if (!auth().userId && isProtectedRoute(context.request)) {
    return auth().redirectToSignIn();
  }
});
```

### API Protegidas

Las API para gestionar favoritos verifican la autenticación del usuario antes de permitir operaciones:

```typescript
// Ejemplo de protección en API
export const GET: APIRoute = async ({ locals }) => {
    const user = await locals.currentUser();

    if (!user) {
        return new Response(JSON.stringify({
            success: false,
            message: "Unauthorized"
        }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    // Código para usuarios autenticados...
};
```

## 🛠️ Tecnologías Utilizadas

- [Astro](https://astro.build) - Framework web de alto rendimiento
- [Clerk](https://clerk.dev) - Autenticación de usuarios
- [Tailwind CSS](https://tailwindcss.com) - Framework CSS para el diseño
- [TypeScript](https://www.typescriptlang.org/) - Lenguaje principal del proyecto
- [Vercel](https://vercel.com) - Plataforma de despliegue

## 🚀 Configuración del Proyecto

### Prerrequisitos

- Node.js (v18 o superior)
- Bun o npm
- Una cuenta en Clerk para las credenciales de autenticación

### Instalación

1. Clona este repositorio:
   ```bash
   git clone https://github.com/tuusuario/the-clerk-project.git
   cd the-clerk-project
   ```

2. Instala las dependencias:
   ```bash
   bun install
   # o
   npm install
   ```

3. Crea un archivo `.env` con tus credenciales de Clerk:
   ```
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   bun dev
   # o
   npm run dev
   ```

5. Abre [http://localhost:4321](http://localhost:4321) para ver la aplicación.

## 📁 Estructura del Proyecto

```
src/
├── components/      # Componentes reutilizables
│   └── Nav.astro    # Barra de navegación
├── data/            # Datos de la aplicación
│   └── channels.json # Caché de canales
├── layouts/         # Plantillas de página
│   └── Layout.astro # Layout principal
├── middleware.ts    # Middleware de Clerk para protección de rutas
├── pages/           # Páginas de la aplicación
│   ├── api/         # Endpoints de API
│   │   ├── channels.ts
│   │   ├── favorites.ts
│   │   └── refresh-channels.ts
│   ├── channels/
│   │   └── [slug].astro # Página dinámica para cada grupo
│   ├── favorites.astro # Página de favoritos (protegida)
│   └── index.astro    # Página principal
├── scripts/         # Scripts del lado del cliente
├── styles/          # Estilos globales
├── types/           # Definiciones de tipos
└── utils/           # Utilidades
    ├── channelDataProvider.ts
    ├── channelOperations.ts
    ├── channelScraper.ts
    └── favoritesUtils.ts
```

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Autor

- Tu Nombre - [GitHub](https://github.com/tuusuario)

## 🙏 Agradecimientos

- [Astro](https://astro.build) por proporcionar un excelente framework
- [Clerk](https://clerk.dev) por su sistema de autenticación
- [Tailwind CSS](https://tailwindcss.com) por facilitar el diseño
