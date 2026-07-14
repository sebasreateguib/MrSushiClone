# Mr Sushi — Backend (AWS, serverless)

## Qué resuelve esto

La parte del proyecto que tú necesitabas: **el backend detrás de tu web de clientes** —
registro/login reales, crear pedido, y que el cliente vea el estado de su pedido en vivo.
También deja listo el **flujo de trabajo** (cocina → empaque → entrega) para que la web de
trabajadores (que aún no han hecho) lo consuma.

## Arquitectura

```
Web de CLIENTES (tu frontend)                 Web de TRABAJADORES (pendiente)
        |                                              |
        | POST /auth/register, /auth/login             |
        | POST /orders                                 |
        | GET  /orders/{id}, /orders                    | POST /orders/{id}/steps/{step}/iniciar
        v                                              | POST /orders/{id}/steps/{step}/completar
   API Gateway (HTTP API) ------------------------------+
        |
        v
     Lambdas  ---->  DynamoDB (UsersTable, OrdersTable)
        |
        v
  EventBridge (bus "mrsushi-pedidos-bus")
    - "OrderCreated"  --(regla)-->  Step Functions: arranca el workflow del pedido
    - "CocinaPendiente" / "EmpaquePendiente" / "EntregaPendiente"
         --(regla)--> Lambda onWorkflowEvent (guarda el taskToken en el pedido)
    - "OrderStatusChanged" -> (a futuro: dashboard, notificador de Rappi en otra nube)

  Step Functions (Wait for Callback with Task Token):
    EsperarCocina -> EsperarEmpaque -> EsperarEntrega -> PedidoEntregado
    (cada estado "espera" hasta que un trabajador llama a /steps/{step}/completar,
     que hace SendTaskSuccess con el taskToken guardado en DynamoDB)
```

**Por qué Step Functions y no solo Lambda+EventBridge:** cocinar, empacar y entregar son
tareas humanas con duración indefinida. Step Functions con el patrón *Wait for Callback with
Task Token* deja la ejecución "pausada" (sin costo, sin Lambda corriendo) hasta que alguien
confirma el paso desde la web de trabajadores. Eso es justo lo que pide el enunciado.

**Multi-tenancy:** ambas tablas usan `tenantId` como partition key. Hoy solo tienes un tenant
(`mrsushi`), pero el diseño soporta agregar más restaurantes sin tocar el esquema.

## Endpoints

| Método | Ruta | Quién lo llama | Qué hace |
|---|---|---|---|
| POST | `/auth/register` | Web cliente | Crea usuario (bcrypt), devuelve JWT |
| POST | `/auth/login` | Web cliente | Login, devuelve JWT |
| POST | `/orders` | Web cliente (o el 2do API en otra nube simulando Rappi) | Crea el pedido y dispara el workflow |
| GET | `/orders/{orderId}` | Web cliente | Estado actual del pedido (para polling) |
| GET | `/orders` | Web cliente | Historial de pedidos del usuario autenticado |
| POST | `/orders/{orderId}/steps/{step}/iniciar` | Web trabajadores | Marca que alguien empezó el paso (`step`: cocina\|empaque\|entrega) |
| POST | `/orders/{orderId}/steps/{step}/completar` | Web trabajadores | Cierra el paso y libera el Step Functions (SendTaskSuccess) |

## Cómo desplegarlo

```bash
cd backend
npm install
export JWT_SECRET="pon-un-secreto-largo-aqui"
npx serverless deploy --stage dev
```

Al terminar, `serverless deploy` imprime el output `HttpApiUrl`. Copia esa URL a
`VITE_API_URL` en el frontend (archivo `.env` o `src/utils/api.js`).
