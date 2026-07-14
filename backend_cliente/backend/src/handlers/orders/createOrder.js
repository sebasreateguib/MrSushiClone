const { v4: uuidv4 } = require('uuid');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { docClient } = require('../../lib/dynamo');
const { verificar } = require('../../lib/jwt');
const res = require('../../lib/response');

const TENANT_ID = process.env.TENANT_ID;
const ORDERS_TABLE = process.env.ORDERS_TABLE;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME;

const eventBridge = new EventBridgeClient({});

exports.handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return res.badRequest('JSON inválido');
  }

  const { items, direccion, canal, cliente } = body;
  // canal: "web" (app de clientes del restaurante) | "rappi" (segundo api rest en otra nube)

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.badRequest('El pedido debe tener al menos un producto.');
  }

  // Si viene del canal web, el cliente ya está autenticado con JWT.
  // Si viene de "rappi" (otra nube), el body debe traer los datos del cliente directamente.
  let userEmail = cliente?.email;
  let userNombre = cliente?.nombre;

  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const payload = verificar(token);
    if (payload) {
      userEmail = payload.email;
      userNombre = payload.nombre;
    }
  }

  if (!userEmail) {
    return res.badRequest('No se pudo identificar al cliente del pedido.');
  }

  const total = items.reduce((acc, it) => acc + Number(it.precio) * Number(it.cantidad), 0);
  const orderId = uuidv4();
  const now = new Date().toISOString();

  const orden = {
    tenantId: TENANT_ID,
    orderId,
    userEmail,
    userNombre,
    items,
    total,
    direccion: direccion || null,
    canal: canal || 'web',
    status: 'PEDIDO_RECIBIDO',
    createdAt: now,
    updatedAt: now,
    steps: {
      cocina: { status: 'PENDIENTE' },
      empaque: { status: 'PENDIENTE' },
      entrega: { status: 'PENDIENTE' },
    },
  };

  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: orden }));

  // Publica el evento que arranca el Step Functions (regla EventBridge -> State Machine)
  await eventBridge.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: 'mrsushi.orders',
          DetailType: 'OrderCreated',
          EventBusName: EVENT_BUS_NAME,
          Detail: JSON.stringify({ orderId, tenantId: TENANT_ID }),
        },
      ],
    })
  );

  return res.created({ orderId, status: orden.status, total });
};
