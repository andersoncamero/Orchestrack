# Orchestrack

Plataforma de orquestación y monitoreo de infraestructura multi-host. Permite registrar máquinas (agentes), supervisar su salud en tiempo real, gestionar contenedores e imágenes, administrar paquetes del sistema operativo y recibir alertas, todo desde un dashboard web.

## Tabla de contenidos

1. [Características principales](#características-principales)
2. [Arquitectura](#arquitectura)
3. [Tecnologías](#tecnologías)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Backend](#backend)
6. [Frontend](#frontend)
7. [API REST](#api-rest)
8. [Bus de eventos NATS](#bus-de-eventos-nats)
9. [Modelos de datos](#modelos-de-datos)
10. [Configuración y ejecución](#configuración-y-ejecución)
11. [Variables de entorno](#variables-de-entorno)
12. [Infrastructura con Docker Compose](#infrastructura-con-docker-compose)

---

## Características principales

- **Autenticación JWT**: registro e inicio de sesión de usuarios con contraseñas hasheadas (bcrypt).
- **Registro de dispositivos con aprobación**: tokens de registro de un solo uso (24h) y flujo `pending → active`.
- **Monitoreo en tiempo real**: heartbeats cada 10s con métricas de CPU, memoria, disco, carga, uptime y procesos.
- **Gestión de contenedores Docker**: listar, crear, iniciar, detener, reiniciar, renombrar y eliminar contenedores remotamente.
- **Gestión de imágenes Docker**: listar, descargar (pull), eliminar y buscar imágenes en Docker Hub.
- **Administración de paquetes del SO**: listar, refrescar, actualizar y eliminar paquetes según el gestor detectado (apt, dnf, yum, pacman, apk, brew, choco, winget).
- **Alertas automáticas**: CPU, memoria, disco, carga y hosts offline con contador de no leídas.
- **Historial de conexión**: agregación horaria de estados online/offline del cluster y por dispositivo.
- **WebSocket con salas**: dashboard, containers y salas específicas por dispositivo para actualizaciones sin polling.
- **Frontend internacionalizado**: soporte de español e inglés, tema claro/oscuro.
- **Agente daemonizable**: el agente puede ejecutarse en primer plano o en segundo plano con logs propios.

---

## Arquitectura

```
┌─────────────────┐      HTTP/REST       ┌──────────────────┐
│   React + Vite  │ ◄──────────────────► │   api-service    │
│    (frontend)   │      WebSocket       │     (Go)         │
└─────────────────┘                      └────────┬─────────┘
                                                  │
                                                  │ NATS
                                                  │ Request/Reply
                                                  │ Pub/Sub
                                                  ▼
                                         ┌──────────────────┐
                                         │  orchestrack-agent │
                                         │     (Go)         │
                                         │  Docker SDK      │
                                         └──────────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │  Docker daemon   │
                                         │  Host metrics    │
                                         │  Package manager │
                                         └──────────────────┘
```

- **api-service**: centraliza autenticación, persistencia PostgreSQL, registro de agentes, REST API y WebSocket.
- **orchestrack-agent**: corre en cada host, conecta a NATS, escucha comandos, ejecuta operaciones Docker/SO y envía heartbeats/eventos.
- **NATS**: mensajería request/reply para comandos y pub/sub para eventos y heartbeats.
- **PostgreSQL**: usuarios, dispositivos, eventos y tokens de registro.

---

## Tecnologías

### Backend

- Go 1.25
- Gorilla Mux + WebSocket
- NATS.go
- GORM + PostgreSQL (pgx)
- Docker Engine SDK
- gopsutil v4
- Protocol Buffers + gRPC types
- golang-jwt, bcrypt, ksuid

### Frontend

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- React Router 7
- Lucide React
- Oxlint

### Infraestructura

- Docker Compose
- NATS server
- PostgreSQL 15
- natsboard (monitor opcional de NATS)

---

## Estructura del proyecto

```
Orchestrack/
├── backend/
│   ├── api-service/              # Servidor central REST/WebSocket
│   │   ├── main.go
│   │   └── src/
│   │       ├── cache/            # Registry en memoria + historial de conexión
│   │       ├── commander/        # Envío de comandos vía NATS
│   │       ├── database/         # Implementación PostgreSQL/GORM
│   │       ├── handlers/         # HTTP handlers
│   │       ├── middleware/       # JWT auth
│   │       ├── models/           # User, Device, Event, RegistrationToken
│   │       ├── ports/            # Interfaces del servidor
│   │       ├── repository/       # Patrón repositorio
│   │       ├── server/           # Broker HTTP + lifecycle
│   │       ├── util/             # Config + logger
│   │       └── websocket/        # Hub y clientes WebSocket
│   ├── orchestrack-agent/        # Agente por host
│   │   ├── main.go
│   │   └── src/
│   │       ├── docker/           # Cliente Docker SDK + repositorio
│   │       ├── handlers/         # Manejador de comandos NATS
│   │       ├── metrics/          # Métricas del host
│   │       ├── repository/       # Patrón repositorio local
│   │       ├── system/           # Gestión de paquetes y sistema
│   │       └── util/             # Config + logger
│   ├── events/                   # Abstracción del bus NATS
│   ├── proto/docker/             # Mensajes protobuf generados
│   ├── .env
│   ├── go.mod
│   └── Dockerfile (api-service)
├── frontend/
│   ├── src/
│   │   ├── components/           # Atomic design: atoms, molecules, organisms, pages, templates
│   │   ├── contexts/             # Auth, WebSocket, Theme, Language, Notifications
│   │   ├── hooks/                # useInstances, useContainers, useSystemPackages, etc.
│   │   ├── services/             # Cliente API REST
│   │   ├── types/                # Tipos TypeScript
│   │   └── utils/                # Formato de tiempo y bytes
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── dashboard.png
├── compose.yaml                  # NATS + PostgreSQL + natsboard
└── README.md
```

---

## Backend

### api-service

Servidor HTTP que expone la API REST y el WebSocket. Al arrancar:

1. Carga configuración desde `.env`.
2. Conecta a NATS.
3. Inicializa el repositorio PostgreSQL y ejecuta migraciones automáticas.
4. Carga el historial de conexiones desde la base de datos.
5. Se suscribe a heartbeats y eventos de contenedores.
6. Inicia el hub WebSocket y el servidor HTTP con CORS.
7. Limpia instancias inactivas cada 30 segundos.

### orchestrack-agent

Proceso por host que:

1. Carga o genera su identidad (`service_id` estable basado en hostname + hex aleatorio).
2. Si tiene `AGENT_TOKEN`, se registra en el backend y espera aprobación.
3. Se daemoniza (segundo plano) salvo que se use `--foreground` o `AGENT_FOREGROUND=true`.
4. Conecta a NATS con callbacks de desconexión/reconexión.
5. Conecta al daemon Docker.
6. Suscribe comandos dirigidos a su `service_id` y a su `hostname`.
7. Publica heartbeats cada 10 segundos con métricas del host.

### Patrones de comunicación

- **Heartbeat**: el agente publica `registry.orchestrack-agent.heartbeat`.
- **Comando**: `api-service` envía request NATS a `commands.orchestrack-agent.{identifier}.<action>` y el agente responde.
- **Evento**: el agente publica eventos en `events.orchestrack-agent.{identifier}.<event>`.

### Monitoreo de red del agente

El `ConnectionMonitor` registra desconexiones y, al reconectar:

- Publica un evento `offline` retroactivo con la marca de desconexión.
- Espera 40 segundos de estabilidad antes de publicar `online`.
- Al cerrar, publica un evento `offline` por shutdown.

---

## Frontend

Aplicación de una sola página (SPA) con las siguientes páginas:

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión |
| `/signup` | Registro de usuario |
| `/` | Dashboard global con estado del cluster e historial |
| `/instances` | Registro y gestión de hosts, aprobación de dispositivos |
| `/instances/:service_id` | Detalle de un host |
| `/containers` | Selector de host para gestionar contenedores |
| `/containers/docker` | Lista global de hosts Docker |
| `/containers/docker/:serviceId/:id` | Detalle de un contenedor |
| `/containers/docker/images` | Imágenes Docker por host |
| `/alerts` | Alertas del sistema por host |
| `/processes` | Procesos del host |
| `/packages` | Gestión de paquetes del SO por host |
| `/settings` | Tema, idioma, notificaciones e información del sistema |

### Contextos

- **AuthContext**: manejo de JWT y sesión.
- **WebSocketContext**: conexión persistente con reconexión automática, suscripción a salas.
- **NotificationContext**: genera alertas a partir de métricas de instancias y persiste lecturas.
- **ThemeContext**: tema claro/oscuro con `localStorage`.
- **LanguageContext**: internacionalización español/inglés.

---

## API REST

### Públicas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/signup` | Registrar usuario |
| POST | `/api/v1/login` | Iniciar sesión, devuelve JWT |
| POST | `/api/v1/devices/register` | Registro de agente con token |
| GET | `/api/v1/devices/{identifier}/status` | Estado de un dispositivo |
| GET | `/api/v1/health` | Health check |

### Protegidas (requieren `Authorization: <jwt>`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/me` | Información del usuario actual |
| GET | `/api/v1/instances` | Listar dispositivos registrados |
| GET | `/api/v1/instances/history` | Historial de conexión del cluster |
| GET | `/api/v1/images/search` | Buscar imágenes en Docker Hub |
| POST | `/api/v1/devices/tokens` | Generar token de registro |
| GET | `/api/v1/ws` | WebSocket (token por query) |
| POST | `/api/v1/instances/{identifier}/approve` | Aprobar dispositivo |
| GET | `/api/v1/instances/{identifier}/history` | Historial de conexión del dispositivo |
| GET | `/api/v1/instances/{identifier}/containers` | Listar contenedores |
| GET | `/api/v1/instances/{identifier}/containers/{id}` | Detalle de contenedor |
| POST | `/api/v1/instances/{identifier}/containers` | Crear contenedor |
| POST | `/api/v1/instances/{identifier}/containers/{id}/start` | Iniciar contenedor |
| POST | `/api/v1/instances/{identifier}/containers/{id}/stop` | Detener contenedor |
| POST | `/api/v1/instances/{identifier}/containers/{id}/restart` | Reiniciar contenedor |
| PATCH | `/api/v1/instances/{identifier}/containers/{id}` | Renombrar contenedor |
| DELETE | `/api/v1/instances/{identifier}/containers/{id}` | Eliminar contenedor |
| GET | `/api/v1/instances/{identifier}/images` | Listar imágenes |
| POST | `/api/v1/instances/{identifier}/images/pull` | Descargar imagen |
| DELETE | `/api/v1/instances/{identifier}/images/{id}` | Eliminar imagen |
| GET | `/api/v1/instances/{identifier}/system/info` | Información del SO |
| GET | `/api/v1/instances/{identifier}/system/packages` | Listar paquetes |
| POST | `/api/v1/instances/{identifier}/system/packages/refresh` | Refrescar paquetes |
| POST | `/api/v1/instances/{identifier}/system/packages/upgrade` | Actualizar paquetes |
| POST | `/api/v1/instances/{identifier}/system/packages/remove` | Eliminar paquetes |

---

## Bus de eventos NATS

### Subjects de registro

- `registry.orchestrack-agent.heartbeat`

### Comandos (request/reply)

Patrón: `commands.orchestrack-agent.{identifier}.<action>`

- `containers.list`, `containers.get`, `containers.create`, `containers.start`, `containers.stop`, `containers.restart`, `containers.rename`, `containers.remove`
- `images.list`, `images.pull`, `images.remove`
- `system.packages.list`, `system.packages.refresh`, `system.packages.upgrade`, `system.packages.remove`
- `system.info`

### Eventos (pub/sub)

Patrón: `events.orchestrack-agent.{identifier}.<event>`

- `container.created`, `container.started`, `container.stopped`, `container.restarted`, `container.renamed`, `container.removed`
- `image.pulled`, `image.removed`
- `{identifier}.status` (online/offline)

---

## Modelos de datos

### PostgreSQL (GORM)

- **User**: `id`, `email`, `password`.
- **Device**: `service_id`, `hostname`, `status` (`pending` | `active` | `offline`), `last_seen`, métricas del host, contadores de contenedores.
- **Event**: `device_id`, `type`, `payload`, `timestamp`.
- **RegistrationToken**: `token`, `used`, `expires_at`.

### En memoria (api-service)

- **Registry**: mapa de dispositivos online con métricas recientes.
- **ConnectionHistory**: muestras horarias de online/offline/total (retención 30 días).
- **WebSocket Hub**: clientes conectados y sus salas.

---

## Configuración y ejecución

### Requisitos

- Go 1.25
- Node.js 20+
- Docker y Docker Compose
- PostgreSQL 15 (o usar `compose.yaml`)
- NATS server (o usar `compose.yaml`)

### 1. Levantar infraestructura

```bash
docker compose up -d
```

Esto inicia PostgreSQL en `localhost:5434` y NATS en `localhost:4222`.

### 2. Ejecutar api-service

```bash
cd backend
# Ajustar backend/.env si es necesario
go run ./api-service/main.go
```

### 3. Ejecutar orchestrack-agent

Generar primero un token de registro desde el frontend o mediante API. Luego:

```bash
cd backend
go build -o orchestrack-agent ./orchestrack-agent/main.go

AGENT_TOKEN="reg_tok_..." \
BACKEND_URL="http://localhost:8080" \
NATS_URL="nats://localhost:4222" \
./orchestrack-agent --foreground
```

### 4. Ejecutar frontend

```bash
cd frontend
npm install
npm run dev
```

Por defecto el frontend se sirve en `http://localhost:5173` y apunta a `http://localhost:8080`.

---

## Variables de entorno

### api-service (`backend/.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de PostgreSQL | `postgres://admin:admin123@localhost:5434/orchestrack_dev?sslmode=disable` |
| `NATS_URL` | URL de NATS | `nats://localhost:4222` |
| `API_SERVICE_PORT` | Puerto HTTP del API | `8080` |
| `JWT_SECRET` | Clave para firmar JWT | `secret` |
| `API_SERVICE_LOG_LEVEL` | Nivel de log | `info` |

### orchestrack-agent

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `AGENT_TOKEN` | Token de registro (24h, un solo uso) | `reg_tok_...` |
| `BACKEND_URL` | URL del api-service | `http://localhost:8080` |
| `NATS_URL` | URL de NATS | `nats://localhost:4222` |
| `AGENT_HOSTNAME` | Hostname personalizado | `server-01` |
| `AGENT_ID` | ID de servicio fijo | `server-01-abc123` |
| `AGENT_LOG_LEVEL` | Nivel de log | `info` |
| `AGENT_FOREGROUND` | Ejecutar en primer plano | `true` |

### frontend

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL base del backend | `http://localhost:8080` |


## Notas adicionales

- El agente genera un archivo `.agent_identity.json` para recordar su `service_id` y `hostname` entre reinicios.
- Los dispositivos nuevos se registran con estado `pending` y deben aprobarse desde el frontend para comenzar a reportar métricas.
- La autenticación WebSocket acepta el token JWT tanto por query string (`?token=...`) como por header `Authorization`.
- El frontend usa salas WebSocket (`dashboard`, `containers`, `containers:{service_id}`) para recibir eventos segmentados.
- Las métricas de procesos incluyen el top 30 por CPU y top 30 por memoria, unificados sin duplicados.
- El agente detecta automáticamente el gestor de paquetes del host y reintenta comandos con `sudo -n` si no es root.
