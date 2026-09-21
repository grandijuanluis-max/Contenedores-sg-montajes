# Manual de Uso Oficial — Sistema de Gestión de Contenedores y Flota
**SG MONTAJES S.R.L. — Logística & Alquiler de Módulos Habitacionales**

---

## 📋 Índice
1. [Introducción & Acceso al Sistema](#1-introducción--acceso-al-sistema)
2. [Tablero de Control & KPIs (Dashboard)](#2-tablero-de-control--kpis-dashboard)
3. [Gestión de Flota Completa (50 Unidades)](#3-gestión-de-flota-completa-50-unidades)
4. [Módulo de Alquileres, Contratos & Vencimientos](#4-módulo-de-alquileres-contratos--vencimientos)
5. [Mantenimiento Técnico & Taller de Reparaciones](#5-mantenimiento-técnico--taller-de-reparaciones)
6. [Mapa Interactivo de Obras](#6-mapa-interactivo-de-obras)
7. [Generación de Remitos Oficiales en PDF](#7-generación-de-remitos-oficiales-en-pdf)
8. [Configuración del Sistema, Usuarios & Copias de Seguridad](#8-configuración-del-sistema-usuarios--copias-de-seguridad)
9. [Sincronización en la Nube con Supabase](#9-sincronización-en-la-nube-con-supabase)

---

## 1. Introducción & Acceso al Sistema

El **Sistema de Contenedores de SG Montajes SRL** es una plataforma web integral diseñada para el control operativo, comercial, logístico y de mantenimiento de los 50 módulos habitacionales de la compañía (*C-101 al C-150*).

### Acceso Inicial (Login)
1. Abra el archivo `index.html` en su navegador (Google Chrome, Microsoft Edge, Safari).
2. El sistema presenta las credenciales predeterminadas para acceso rápido:
   - **Usuario**: `melani`
   - **Contraseña**: `123`
3. Haga clic en **"Ingresar al Sistema"** o presione la tecla **Enter**.

---

## 2. Tablero de Control & KPIs (Dashboard)

El Dashboard es el centro de mando operativo del sistema. Brinda visibilidad en tiempo real mediante:

### 2.1. Barra de Acciones Rápidas (Hero Strip)
- **`+ Alta Contenedor`**: Incorpora una nueva unidad al inventario.
- **`⚡ Asignar Alquiler`**: Abre el asistente directo de contratación.
- **`🗺️ Mapa Obras`**: Acceso directo al mapa geográfico.
- **`📥 Excel`**: Descarga en 1 clic la planilla completa de flota con formato XLS.

### 2.2. Tarjetas de Indicadores Clave (KPIs)
- **Flota Total (50)**: Cantidad total de módulos registrados.
- **Alquilados en Obra**: Cantidad de unidades activas en clientes y **porcentaje de ocupación en vivo**.
- **Disponibles en Base**: Unidades limpias y disponibles en Base Operativa Timbúes.
- **Reservados**: Despachos comprometidos.
- **En Taller / Mantenimiento**: Unidades en acondicionamiento técnico con indicador de alerta.
- **Vencimientos & Pagos**: Alertas de alquileres fuera de plazo o mora comercial.

### 2.3. Paneles de Analítica Visual
1. **Ocupación por Modelo:** Barras de rendimiento para *Oficina, Pañol, Vestuario, Comedor* con desglose de unidades ocupadas vs libres.
2. **Alertas de Contratos:** Listado ordenado por urgencia con conteo de días vencidos (rojo) o días restantes a 7 días (ámbar) con botón directo para emitir el **Remito de Retiro**.
3. **Rendimiento & Obras:** Estimación de facturación mensual, efectividad de cobranzas y ranking de clientes con mayor despliegue (*Techint, YPF, AUSA, CABA*).

---

## 3. Gestión de Flota Completa (50 Unidades)

En la solapa **Contenedores (Flota)**:
- **Navegación por Solapas Principales de Modelo**: Filtre instantáneamente por solapas dedicadas con contador en vivo: `Todas las Unidades (50)`, `Oficinas (12)`, `Pañoles (20)`, `Comedores (18)` y `Vestuarios`.
- **Sub-solapas por Estado Operativo**: Visualice `Todos`, `En Base (Disponibles)`, `Alquilados en Obra`, `Reservados` o `En Taller`.
- **Buscador en Tiempo Real**: Busque por código (ej: `C-105`), empresa contratista o dirección de obra.
- **Acciones por Unidad**:
  - 👁️ **Ficha Técnica**: Historial completo, dimensiones, coordenadas y estado.
  - ✏️ **Editar / Mover**: Modificar datos del contenedor.
  - 🔧 **Taller**: Asignar tareas técnicas inmediatas.
  - 📄 **Remito**: Generar el comprobante oficial.

---

## 4. Módulo de Alquileres, Contratos & Vencimientos

Permite administrar el ciclo contractual completo de cada alquiler:

### Pasos para Asignar un Alquiler:
1. Haga clic en **"⚡ Asignar Alquiler"** o **"+ Asignar Nuevo Alquiler"**.
2. Seleccione el contenedor disponible.
3. Ingrese el nombre del **Cliente / Empresa** y la **Dirección de la Obra**.
4. Verifique la **Fecha de Entrega** (hoy) y la **Fecha de Retiro** (precalculada a 30 días).
5. Indique el canon mensual y el estado inicial de cobranza.
6. Haga clic en **"Guardar Alquiler"** o **"Guardar y Emitir Remito PDF"**.

### Prórrogas y Devoluciones:
- **Prórroga (⏳)**: Permite extender la fecha de vencimiento sin necesidad de rehacer el contrato.
- **Devolución (📦)**: Finaliza el contrato, emite el Remito de Devolución/Retiro y permite enviar la unidad a **Base Operativa Timbúes** o derivarla a **Taller** si presenta roturas.

---

## 5. Mantenimiento Técnico & Taller de Reparaciones

Tablero operativo para el equipo de logística y pañol:

### Estados y Tareas:
- Cada unidad averiada se muestra en una tarjeta con su checklist de tareas pendientes (*ej: "Reparar cerradura", "Revisión eléctrica", "Pintura exterior"*).
- Al finalizar un trabajo, se tilda la tarea para tacharla y registrarla.
- Con el botón **`+ Agregar Tarea`** se pueden sumar nuevas observaciones.
- Una vez concluidas las reparaciones, se pulsa **"Pasar a Base (Disponible)"** para reintegrar la unidad al inventario alquilable.

---

## 6. Mapa Interactivo de Obras

- Visualización geográfica impulsada por **Leaflet.js** y **OpenStreetMap**.
- Muestra la **Base Operativa Timbúes** (marcador destacado) y todos los módulos desplegados en obras activas.
- Al hacer clic en un pin de obra, se abre la ventana emergente con el código del contenedor, cliente, tipo y botón para abrir su ficha.

---

## 7. Generación de Remitos Oficiales en PDF

El sistema cuenta con un motor nativo de remitos con diseño corporativo SG Montajes:
- **Remito de Entrega**: Incluye datos de la empresa (CUIT 30-71602466-7), cliente, obra, estado del contenedor, accesorios entregados (llaves, aire, térmicas) y cuadro de firmas para receptor y transportista.
- **Remito de Retiro / Devolución**: Constancia de recepción de la unidad al finalizar el contrato.
- **Descarga Directa**: Genera el archivo PDF listo para imprimir o enviar por correo/WhatsApp.

---

## 8. Configuración del Sistema, Usuarios & Copias de Seguridad

En la solapa **Configuración**:
1. **Usuarios y Accesos**: Cree nuevos usuarios, asigne roles (*Administrador, Operador Logística, Consulta*) y cambie contraseñas.
2. **Datos de Empresa & Depósito**: Modifique el CUIT, razón social, teléfonos y dirección de la base central.
3. **Respaldos & Base de Datos**:
   - **`Exportar Backup (JSON)`**: Descarga una copia de seguridad íntegra de todos los contenedores y configuraciones.
   - **`Restaurar Backup`**: Permite cargar un archivo JSON previamente guardado para restaurar el sistema.
   - **`Reiniciar a Flota Original`**: Restablece los 50 contenedores base en caso de requerir un reinicio limpio.

---

## 9. Sincronización en la Nube con Supabase

El sistema está preparado para operar en modo local o conectado a la nube Supabase:
- Archivo de conexión: `supabase_config.js`.
- Script SQL de creación de tablas: `schema_supabase_contenedores.sql`.
- Permite sincronización bidireccional en tiempo real entre múltiples terminales de trabajo.
