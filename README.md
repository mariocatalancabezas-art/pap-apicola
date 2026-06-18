# PAP Apícola — Gestión de Visitas

PWA offline-first para gestionar visitas apícolas. React + Vite + IndexedDB (Dexie) + Supabase.

## Requisitos previos

- Node.js 18+
- npm o pnpm

## Instalación

```bash
npm install
```

## Configuración de Supabase (opcional)

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **Settings → API**, copia la URL y la `anon key`
3. Crea el archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

4. Ejecuta la migración SQL en el **SQL Editor** de Supabase:

```
supabase/migrations/001_initial.sql
```

> Sin `.env`, la app funciona completamente en modo offline usando sólo IndexedDB.

## Desarrollo

```bash
npm run dev
```

## Build para producción

```bash
npm run build
npm run preview
```

## Módulos

| Módulo | Descripción |
|---|---|
| Dashboard | Estadísticas rápidas y accesos directos |
| Nueva visita | Formulario completo de visita apícola |
| Historial | Listado con búsqueda, filtros, expansión de detalle |
| Apicultores | CRUD completo de apicultores |
| Exportar PDF/Excel | Desde el historial, botones de exportación |
| Copias de seguridad | Exportar/importar JSON, sincronización manual |
| Configuración | Estado de Supabase, última sincronización |

## Sincronización

- **Automática al reconectar**: se activa cuando el dispositivo recupera Internet
- **Cada 5 minutos**: sincronización periódica mientras hay conexión
- **Deduplicación**: usando UUID, nunca se duplican registros
- **Indicadores visuales**: sin conexión / pendiente / sincronizado en el header

## Instalación como PWA

- **Android**: "Añadir a pantalla de inicio" en Chrome
- **iOS**: Safari → botón compartir → "Añadir a pantalla de inicio"
- **PC**: icono de instalación en la barra de Chrome/Edge
