# PROMPT MAESTRO — SISTEMA DE GESTIÓN DE CONTENEDORES SG MONTAJES SRL
**Versión**: 2.0 (Glassmorphism Boca Blue & Gold — Standalone + Supabase Ready)

---

## 🎯 PROPÓSITO GENERAL DEL PROYECTO
Desarrollar, mantener y evolucionar la aplicación web profesional e independiente para la gestión integral de la flota de 50 contenedores y módulos habitacionales de **SG MONTAJES S.R.L.** (CUIT: 30-71602466-7, Depósito Central Sarandí).

---

## 🏛️ ARQUITECTURA TÉCNICA & STACK
- **Frontend Core**: HTML5 Semántico, Vanilla JavaScript (ES6+), CSS3 con Glassmorphism Corporativo.
- **Librerías CDN Integradas**:
  - `FontAwesome 6` (Iconografía)
  - `Inter Font Family` (Google Fonts)
  - `Leaflet.js 1.9.4` (Cartografía y Mapa de Obras)
  - `html2pdf.bundle.min.js` (Generación client-side de Remitos Oficiales en PDF)
  - `@supabase/supabase-js` (Conector opcional para sincronización en tiempo real)
- **Persistencia**:
  - Primaria: `LocalStorage` (`sg_contenedores_data_v1`, `sg_contenedores_users_v1`, `sg_contenedores_settings_v1`).
  - Nube: Supabase PostgreSQL (`contenedores`, `usuarios_contenedores`, `configuracion_contenedores`).
- **Compatibilidad**: Funciona 100% de forma local (`file:///.../index.html`) sin requerir servidores Node.js ni herramientas de compilación pesadas.

---

## 🎨 SISTEMA DE DISEÑO (DESIGN TOKENS)
- **Tema Corporativo**: Boca Juniors Glassmorphism
  - **Azul Boca Principal**: `#00529F` | Hover: `#003D78`
  - **Amarillo / Oro Boca**: `#F3B229` | Hover: `#D09315`
  - **Celeste Acento / Info**: `#38bdf8` | `#0284c7`
  - **Verde Éxito / Base**: `#10b981`
  - **Rojo Alerta / Vencido**: `#f43f5e` | `#e11d48`
  - **Fondo Oscuro Glass**: `rgba(15, 23, 42, 0.94)` con `backdrop-filter: blur(12px)`
  - **Bordes Glass**: `rgba(255, 255, 255, 0.12)`
  - **Tipografía**: `'Inter', system-ui, -apple-system, sans-serif`

---

## 📦 ESTRUCTURA DE DATOS (DATA MODEL)

### Objeto Contenedor:
```json
{
  "code": "C-101",
  "tipo": "Oficina | Pañol | Comedor | Vestuario",
  "medida": "10' | 20' | 40'",
  "estado": "empresa | alquilado | reservado | reparacion",
  "pago": "al_dia | pendiente | retrasado",
  "cliente": "Razón social del cliente o vacío",
  "ubicacion": "Dirección de obra o Depósito Sarandí",
  "lat": -34.7415,
  "lng": -58.2733,
  "entrega": "YYYY-MM-DD",
  "retiro": "YYYY-MM-DD",
  "monto": "$ 250.000",
  "obsEntrega": "Condiciones de entrega...",
  "obsRetiro": "Condiciones de devolución...",
  "tareas": ["Tarea 1", "Tarea 2"],
  "historial": [
    {
      "fecha": "YYYY-MM-DD",
      "accion": "Alquiler / Devolución / Mantenimiento",
      "cliente": "...",
      "ubicacion": "...",
      "estado": "..."
    }
  ]
}
```

---

## 📑 MÓDULOS DEL SISTEMA

1. **Autenticación & Seguridad**:
   - Pantalla de login desacoplada (sin recargas de página).
   - Usuarios predeterminados (`melani` / `123`).
   - Gestión de roles (`Administrador`, `Operador Logística`, `Consulta`).

2. **Dashboard Ejecutivo**:
   - Hero strip con accesos rápidos (`+ Alta Contenedor`, `⚡ Asignar Alquiler`, `🗺️ Mapa`, `📥 Excel`).
   - 6 KPI Cards con micro-indicadores pulsantes.
   - 3 Paneles de Analítica: Ocupación por Modelo con barras porcentuales, Centro de Alertas de Vencimiento y Rendimiento con Obras Principales.
   - Tabla rápida de unidades con buscador y filtros por chips.

3. **Gestión de Flota (50 Unidades)**:
   - Filtros por estado, buscador dinámico, modal de alta, edición y ficha técnica.

4. **Alquileres & Contratos**:
   - Modal de asignación rápida (`modal-alquiler`) con cálculo de fechas, prórrogas y devoluciones.

5. **Mantenimiento & Taller**:
   - Tablero Kanban de reparaciones con checklist de tareas y pase directo a Base.

6. **Mapa de Obras**:
   - Cartografía interactiva con marcadores de obras y depósito Sarandí.

7. **Generador de Remitos PDF**:
   - Plantillas HTML/PDF oficiales con firmas y logo para Entrega y Retiro.

8. **Configuración & Respaldo**:
   - Gestión de usuarios, datos fiscales y exportación/importación JSON.
