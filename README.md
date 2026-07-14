# MrSushi - Proyecto Final (CS2032 Cloud Computing)

Este es el repositorio principal del proyecto **MrSushi**, un sistema integral para la gestión de pedidos de un restaurante de sushi. El proyecto cuenta con una arquitectura orientada a la nube (AWS Serverless) y se divide en múltiples aplicaciones para clientes y trabajadores.

## 🏗️ Estructura y Arquitectura del Proyecto

El sistema está dividido en 4 componentes principales:

### 1. 🍣 Frontend Cliente (`/MR_sushi`)
Aplicación web orientada a los clientes del restaurante.
- **Tecnologías:** React, Vite, Leaflet (mapas).
- **Funcionalidades:** Permite a los clientes registrarse, iniciar sesión, crear pedidos y hacer un seguimiento del estado del mismo.

### 2. 👨‍🍳 Frontend Trabajadores (`/frontend_trabajador`)
Panel de control (Kitchen Control) para el personal interno (cocina, empaque, entrega).
- **Tecnologías:** React 18, Vite, Tailwind CSS v3, TypeScript, Lucide React.
- **Funcionalidades:** Tablero Kanban (Drag & Drop) para mover los pedidos por las distintas etapas operativas (`Recibidos` → `Cocinando` → `Empacando` → `En reparto` → `Entregados`), dashboard en tiempo real y autenticación por roles.
- *Nota: Soporta un "Modo Demo" local sin conexión a backend.*

### 3. ☁️ Backend Core / Cliente (`/backend_cliente/backend`)
Servicio backend serverless en AWS principal que orquesta los pedidos y clientes.
- **Tecnologías:** AWS Lambda, API Gateway, DynamoDB, EventBridge, AWS Step Functions, Serverless Framework, Node.js.
- **Funcionalidades:** Gestión de usuarios (auth con JWT y bcrypt), endpoints para creación y seguimiento de pedidos. Orquesta el flujo de trabajo utilizando el patrón *Step Functions (Wait for Callback with Task Token)*, pausando la ejecución (sin costo) hasta que los trabajadores avanzan el estado del pedido. Emite eventos a un bus de EventBridge (`mrsushi-pedidos-bus`).

### 4. ⚙️ Backend Trabajadores (`/backend`)
Servicio backend serverless complementario para el panel de trabajadores.
- **Tecnologías:** AWS (DynamoDB, EventBridge, Step Functions), Node.js, Serverless Framework.
- **Funcionalidades:** Provee los endpoints necesarios para que los trabajadores consulten y avancen el estado de los pedidos que están en la base de datos de DynamoDB orquestada por el core.

---

## 🚀 Requisitos Previos

- **Node.js** (v18.x o superior recomendado)
- **AWS CLI** configurado con credenciales válidas
- **Serverless Framework** (`npm install -g serverless`)

---

## 🛠️ Cómo Iniciar y Desplegar el Proyecto

Cada componente tiene su propio entorno. Debes configurar y ejecutar cada uno de forma independiente:

### Backends
Debes desplegar ambos servicios serverless en tu cuenta de AWS.

1. **Backend Cliente / Core:**
   ```bash
   cd backend_cliente/backend
   npm install
   export JWT_SECRET="tu-secreto-seguro" # Define un secreto para JWT
   npx serverless deploy --stage dev
   ```
   *Al finalizar, Serverless te imprimirá un `HttpApiUrl`. Deberás copiar esta URL para conectarla a tus frontends.*

2. **Backend Trabajadores:**
   ```bash
   cd backend
   npm install
   npx serverless deploy --stage dev
   ```

### Frontends
Asegúrate de configurar las variables de entorno en ambos frontends usando las URLs API obtenidas de los backends correspondientes.

1. **Frontend Cliente:**
   ```bash
   cd MR_sushi
   npm install
   # Configura las URLs de la API en el código / .env
   npm run dev
   ```

2. **Frontend Trabajadores:**
   ```bash
   cd frontend_trabajador
   npm install
   cp .env.example .env
   # Edita el archivo .env e ingresa la variable VITE_API_URL con la URL de tu backend
   npm run dev
   ```

---

## 📄 Documentación Adicional

Puedes encontrar información técnica más detallada leyendo los archivos `README.md` ubicados dentro de las carpetas de los sub-proyectos y el documento del proyecto original:
- [Frontend Trabajadores README](./frontend_trabajador/README.md)
- [Backend Cliente / Core README](./backend_cliente/backend/README.md)
- Documento de especificación general: [Proyecto-Final.pdf](./Proyecto-Final.pdf)
