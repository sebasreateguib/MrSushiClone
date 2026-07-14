const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');

const sfn = new SFNClient({});
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN;

// Disparado por el evento "OrderCreated" (EventBridge, no API Gateway)
exports.handler = async (event) => {
  const { orderId, tenantId } = event.detail;

  await sfn.send(
    new StartExecutionCommand({
      stateMachineArn: STATE_MACHINE_ARN,
      name: orderId, // evita ejecuciones duplicadas para el mismo pedido
      input: JSON.stringify({ orderId, tenantId }),
    })
  );
};