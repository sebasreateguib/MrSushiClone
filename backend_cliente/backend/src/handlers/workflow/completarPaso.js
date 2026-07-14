const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { SFNClient, SendTaskSuccessCommand } = require('@aws-sdk/client-sfn');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { docClient } = require('../../lib/dynamo');
const res = require('../../lib/response');

const TENANT_ID = process.env.TENANT_ID;
const ORDERS_TABLE = process.env.ORDERS_TABLE;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME;

const PASOS_VALIDOS = ['cocina', 'empaque', 'entrega'];

const sfn = new SFNClient({});
const eventBridge = new EventBridgeClient({});

exports.handler = async (event) => {
  const { orderId, step } = event.pathParameters || {};
  if (!PASOS_VALIDOS.includes(step)) return res.badRequest('Paso inválido.');

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return res.badRequest('JSON inválido');
  }
  const { workerId, workerNombre } = body;
  if (!workerId) return res.badRequest('Falta workerId');

  const { Item: orden } = await docClient.send(
    new GetCommand({ TableName: ORDERS_TABLE, Key: { tenantId: TENANT_ID, orderId } })
  );
  if (!orden) return res.notFound('Pedido no encontrado');

  const pasoActual = orden.steps[step];
  if (!pasoActual?.taskToken) {
    return res.badRequest(`El paso "${step}" todavía no está listo para completarse.`);
  }

  const now = new Date().toISOString();

  // 1) Le dice a Step Functions que esta tarea humana terminó -> el workflow avanza
  await sfn.send(
    new SendTaskSuccessCommand({
      taskToken: pasoActual.taskToken,
      output: JSON.stringify({ orderId, step, completedBy: workerId, completedAt: now }),
    })
  );

  // 2) Actualiza el registro del pedido
  await docClient.send(
    new UpdateCommand({
      TableName: ORDERS_TABLE,
      Key: { tenantId: TENANT_ID, orderId },
      UpdateExpression:
        'SET steps.#step.#status = :completado, steps.#step.finishedAt = :now, steps.#step.finishedBy = :worker, updatedAt = :now REMOVE steps.#step.taskToken',
      ExpressionAttributeNames: { '#step': step, '#status': 'status' },
      ExpressionAttributeValues: {
        ':completado': 'COMPLETADO',
        ':now': now,
        ':worker': { workerId, workerNombre: workerNombre || workerId },
      },
    })
  );

  // 3) Publica el cambio de estado (lo consume el dashboard, y a futuro el notificador de Rappi en otra nube)
  await eventBridge.send(
    new PutEventsCommand({
      Entries: [
        {
          Source: 'mrsushi.orders',
          DetailType: 'OrderStatusChanged',
          EventBusName: EVENT_BUS_NAME,
          Detail: JSON.stringify({ orderId, tenantId: TENANT_ID, step, status: 'COMPLETADO', at: now }),
        },
      ],
    })
  );

  return res.ok({ orderId, step, status: 'COMPLETADO' });
};
