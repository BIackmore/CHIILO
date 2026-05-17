# 🔥 Incendios API – Backend REST

Backend completo en **Node.js + Express + PostgreSQL** para el sistema de detección de incendios forestales.

---

## 📁 Estructura del proyecto

```
backend/
├── src/
│   ├── index.js                   ← Punto de entrada
│   ├── config/
│   │   └── db.js                  ← Pool de PostgreSQL
│   ├── middleware/
│   │   ├── auth.js                ← JWT + control de roles
│   │   ├── errorHandler.js        ← Errores centralizados
│   │   └── upload.js              ← Multer (subida de imágenes)
│   ├── services/
│   │   ├── auditService.js        ← Escritura en bitacoras
│   │   └── iaService.js           ← Análisis IA (simulado / reemplazable)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── usuariosController.js
│   │   ├── imagenesController.js
│   │   ├── analisisController.js
│   │   ├── reportesController.js
│   │   ├── bitacorasController.js
│   │   └── dashboardController.js
│   └── routes/
│       ├── auth.js
│       ├── usuarios.js
│       ├── imagenes.js
│       └── misc.js                ← analisis, reportes, bitacoras, dashboard
├── angular-services/              ← Archivos para copiar al frontend Angular
│   ├── api.service.ts
│   ├── auth.service.ts            ← Reemplaza el mock actual
│   ├── imagenes.service.ts
│   ├── reportes.service.ts
│   ├── process-image.ts           ← Versión actualizada del componente
│   └── admin.ts                   ← Versión actualizada del componente
├── uploads/                       ← Imágenes subidas (auto-creado)
├── .env.example
└── package.json
```

---

## 🚀 Instalación y puesta en marcha

### 1. Clonar / posicionarse en la carpeta backend

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL
```

### 3. Crear la base de datos y ejecutar el schema

```bash
psql -U postgres -c "CREATE DATABASE incendios_db;"
psql -U postgres -d incendios_db -f ../schema_incendios.sql
```

### 4. Iniciar el servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

El servidor corre en `http://localhost:3000`

---

## 🔗 Endpoints disponibles

### Autenticación – `/api/auth`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/login` | Login, devuelve JWT | ❌ |
| POST | `/auth/register` | Registro usuario común | ❌ |
| POST | `/auth/register-gov` | Registro usuario gov | Admin |
| GET  | `/auth/me` | Perfil del usuario actual | ✅ |

**Login request:**
```json
{ "correo": "admin@ejemplo.com", "password": "mipassword" }
```
**Login response:**
```json
{
  "ok": true,
  "token": "eyJ...",
  "user": { "id_usuario": 1, "nombre": "Admin", "correo": "...", "rol": "admin" }
}
```

---

### Usuarios – `/api/usuarios`

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/usuarios` | Lista todos (sin admins) | Admin |
| GET | `/usuarios/stats` | Contadores por rol/estado | Admin |
| GET | `/usuarios/:id` | Detalle de usuario | Autenticado |
| PATCH | `/usuarios/:id/estado` | Activar/desactivar | Admin |
| PATCH | `/usuarios/:id/perfil` | Editar perfil | Propio / Admin |
| DELETE | `/usuarios/:id` | Eliminar | Admin |

---

### Imágenes – `/api/imagenes`

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/imagenes/upload` | Sube imagen + lanza análisis IA | ✅ |
| GET | `/imagenes` | Lista con filtros | ✅ |
| GET | `/imagenes/:id` | Detalle + análisis | ✅ |
| GET | `/imagenes/:id/file` | Descarga el archivo | ✅ |
| DELETE | `/imagenes/:id` | Elimina imagen | ✅ |

**Upload (multipart/form-data):**
```
POST /api/imagenes/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Campo: imagen (File) – JPG, PNG, TIFF, máx 50 MB
```

**Upload response:**
```json
{
  "ok": true,
  "imagen": { "id_imagen": 5, "nombre": "bosque.jpg", "tamano": "2.1 MB" },
  "analisis": {
    "id_analisis": 5,
    "nivel": "alto",
    "confianza": 92,
    "zona": "Zona Norte – Sector A",
    "temp": "41°C",
    "humedad": "14%",
    "viento": "32 km/h",
    "areas": ["Vegetación seca detectada", "Baja humedad crítica"],
    "porcentaje_afectacion": 38.5
  }
}
```

**Filtros disponibles:**
```
GET /api/imagenes?zona=Norte&nivel=alto&page=1&limit=20
```

---

### Análisis – `/api/analisis`

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/analisis` | Lista análisis | ✅ |
| GET | `/analisis/stats` | Métricas IA | ✅ |
| GET | `/analisis/:id` | Detalle | ✅ |

---

### Reportes – `/api/reportes`

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/reportes` | Lista reportes | Admin / Gov |
| GET | `/reportes/stats` | Estadísticas | Admin / Gov |
| GET | `/reportes/:id` | Detalle | Admin / Gov |
| POST | `/reportes` | Crear reporte | Admin / Gov |

**Crear reporte:**
```json
{
  "id_analisis": 3,
  "tipo": "Detección de Incendio",
  "contenido_summary": "Incendio detectado en Zona Norte.",
  "parametros": { "zona": "Zona Norte – Sector A", "severidad": "Alta", "estado": "En Proceso" }
}
```

---

### Dashboard – `/api/dashboard`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/dashboard` | Métricas generales | ✅ |
| GET | `/dashboard/niveles` | Lista niveles de riesgo | ❌ |

---

### Bitácora – `/api/bitacoras`

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/bitacoras` | Historial de auditoría | Admin |

---

## 🅰️ Integración con Angular

### 1. Copiar servicios al proyecto Angular

```bash
# Desde la carpeta angular-services/ copiar a src/app/services/
cp angular-services/api.service.ts      ../incendios-app/src/app/services/
cp angular-services/auth.service.ts     ../incendios-app/src/app/services/   # reemplaza el mock
cp angular-services/imagenes.service.ts ../incendios-app/src/app/services/
cp angular-services/reportes.service.ts ../incendios-app/src/app/services/

# Componentes actualizados (opcionales – reemplazan los existentes)
cp angular-services/process-image.ts    ../incendios-app/src/app/pages/process-image/
cp angular-services/admin.ts            ../incendios-app/src/app/pages/admin/
```

### 2. Agregar los servicios en los componentes que los necesiten

En los componentes `gov.ts`, `login.ts`, `register.ts`, etc., inyectar los nuevos servicios:

**login.ts – cambio de `onSubmit`:**
```typescript
// Antes:
const user = this.auth.login(this.email, this.password);

// Después (auth.service ya es async):
async onSubmit() {
  this.loading = true;
  const user = await this.auth.login(this.email, this.password);
  this.loading = false;
  if (!user) { this.error = 'Correo o contraseña incorrectos.'; return; }
  if (user.rol === 'admin') this.router.navigate(['/admin']);
  else if (user.rol === 'gov') this.router.navigate(['/gov']);
  else this.router.navigate(['/home']);
}
```

**register.ts – cambio de `onSubmit`:**
```typescript
async onSubmit() {
  // ... validaciones ...
  this.loading = true;
  try {
    await this.auth.register(this.name, this.email, this.password);
    this.router.navigate(['/home']);
  } catch (err: any) {
    this.error = err.message;
  } finally {
    this.loading = false;
  }
}
```

### 3. Agregar token a las peticiones (interceptor HTTP opcional)

El `ApiService` ya maneja el token automáticamente leyéndolo de `localStorage`.

---

## 🔒 Seguridad

- **Passwords:** Hash con `bcryptjs` (cost factor 12)
- **JWT:** Expira en 8h, firmado con `JWT_SECRET`
- **Roles:** `admin` > `gov` > `user` — cada endpoint verifica el rol mínimo
- **Archivos:** Solo imágenes permitidas (JPG, PNG, TIFF, WebP), máx 50 MB
- **Auditoría:** Toda operación de escritura queda registrada en `bitacoras`
- **Usuarios inactivos:** Login rechazado aunque la contraseña sea correcta

---

## 🤖 Integrar modelo IA real

Edita `src/services/iaService.js` y reemplaza la función `analyzeImage`:

```javascript
const analyzeImage = async (filePath) => {
  // Llamada a tu microservicio Python / FastAPI / ONNX:
  const response = await fetch('http://tu-modelo-ia:8000/predict', {
    method: 'POST',
    body: JSON.stringify({ image_path: filePath }),
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await response.json();
  
  return {
    nivel:                 result.risk_level,   // 'alto' | 'medio' | 'bajo'
    confianza:             result.confidence,    // 0.0–1.0
    zona:                  result.zone,
    temp:                  result.temperature,
    humedad:               result.humidity,
    viento:                result.wind_speed,
    areas:                 result.detected_areas,
    porcentaje_afectacion: result.affected_pct,
    modelo_version:        result.model_version,
    resultado_json:        result,
  };
};
```
