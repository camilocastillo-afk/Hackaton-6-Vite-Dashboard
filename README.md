# RRHH Bewe — Gestión de Solicitudes (Interno)

> **Proyecto privado — Uso interno**  
> Aplicación web para gestionar solicitudes de certificados laborales, almacenamiento de archivos en Google Drive y flujo de estados para el equipo de RRHH.

---

## 🧭 Resumen
RRHH Bewe es una aplicación interna para la gestión de solicitudes de certificados laborales. Provee interfaces para empleados y administradores: creación de solicitudes, revisión, rechazo con motivo, subida de archivos (Google Drive) y marcación como procesada. Interfaz minimalista tipo Notion para facilitar adopción.

---

## 🧩 Características principales
- Gestión de solicitudes (crear, ver detalle, filtrar).
- Gestión de Usuarios
- Gestión de Empleados
- Gestión de Jefes y Áreas 
- Roles: **Usuario** y **Administrador** (control de accesos y permisos).
- Rechazo de solicitudes con motivo (modal de confirmación).
- Carga de archivos PDF a **Google Drive** y marcado automático de solicitud como `Procesada`.
- Importación/Exportación de datos de empleados por medio de arhivos .csv
- Filtros por estado, nombre y rango de fechas.
- Dashboard y métricas básicas (Home).
- Cache y sincronización con **React Query**.

---

## 🛠 Tecnología
- Frontend: **React + TypeScript**
- Bundler: **Vite**
- UI primitives: **Radix UI / shadcn/ui**, **TailwindCSS**
- Estado/server-state: **@tanstack/react-query**
- Backend-as-a-Service: **Supabase** (DB + Auth)
- Integración Drive: **Google Drive API** (OAuth / token flow)
- Otras: `react-router-dom`, `recharts`, `react-hook-form`

(Detalles de dependencias en `package.json`.)

---

## 📦 Requisitos
- Node >= 18
- Cuenta/instancia de Supabase con el esquema de tablas presentado en supabase/setup.js
- Google Cloud Project + credenciales OAuth (Drive API habilitada)
- Acceso a credenciales privadas de la empresa (no subir a repos públicos)

---

## ⚙️ Instalación (desarrollo)

1. Clonar el repo:
   ```bash
   git clone https://github.com/camilocastillo-afk/Hackaton-6-Vite-Dashboard
   cd Hackaton-6-Vite-Dashboard

2. Instalar dependencias:
   ```bash
   npm install

3. Renombrar `.env~~.local~~` y relleanar con las credenciales correspondientes 
   ```env
   VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"
   VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   VITE_SECRET_KEY_GOOGLE="YOUR_SECRET_KEY"
   # Usar .env.example para más detalles

4. Ejecutar en desarrollo
   ```bash
   npm run dev
   # Si usa Bun -> Bun Vite (run), Bun Vite Build,

5. Build de producción
   ```bash
   npm run build
   npm run preview

---

> ⚠️ **Importante**: no commitear credenciales. Usar secret management del entorno (Vault, GitHub Actions Secrets, etc.).

---

## Flujo de estados de solicitudes
- **En Progreso** → estado inicial al crear la solicitud.  
- **Completada** → cuando se adjunta archivo o el admin marca como completada.  
- **Rechazada** → requiere motivo obligatorio, se gestiona vía modal.

---

# Licencia

Este proyecto es **software propietario** y de uso interno exclusivo de la empresa.  

- No se permite la copia, distribución, sublicencia ni modificación fuera de la organización sin autorización escrita.  
- El acceso al código fuente está restringido únicamente al equipo autorizado.  
- Cualquier uso no autorizado, parcial o total, será considerado una violación a los términos de esta licencia.  

© 2025 Bewe Software. Todos los derechos reservados.

