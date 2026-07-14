const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../../lib/dynamo');

const ORDERS_TABLE = process.env.ORDERS_TABLE;

const STATUS_POR_DETAIL_TYPE = {
  CocinaPendiente: { step: 'cocina', status: 'EN_COCINA' },
  EmpaquePendiente: { step: 'empaque', status: 'EN_EMPAQUE' },
  EntregaPendiente: { step: 'entrega', status: 'EN_CAMINO' },
};

// event = evento nativo de EventBridge (no API Gateway)
exports.handler = async (event) => {
  const { orderId, tenantId, taskToken } = event.detail;
  const mapeo = STATUS_POR_DETAIL_TYPE[event['detail-type']];

  if (!mapeo) {
    console.warn('detail-type desconocido', event['detail-type']);
    return;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: ORDERS_TABLE,
      Key: { tenantId, orderId },
      UpdateExpression:
        'SET #status = :status, updatedAt = :now, steps.#step.taskToken = :token, steps.#step.#stepStatus = :disponible',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#step': mapeo.step,
        '#stepStatus': 'status',
      },
      ExpressionAttributeValues: {
        ':status': mapeo.status,
        ':now': new Date().toISOString(),
        ':token': taskToken,
        ':disponible': 'DISPONIBLE',
      },
    })
  );
};
