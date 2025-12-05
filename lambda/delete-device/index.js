const { SNSClient, DeleteEndpointCommand } = require('@aws-sdk/client-sns');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const snsClient = new SNSClient({});
const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

exports.handler = async (event) => {
    console.log('Delete device request:', JSON.stringify(event, null, 2));

    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { userId, deviceId } = body;

        if (!userId || !deviceId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Missing required fields',
                    required: ['userId', 'deviceId']
                })
            };
        }

        // Get device to find endpoint ARN
        const getCommand = new GetCommand({
            TableName: process.env.DEVICES_TABLE || 'solidi-devices-dev',
            Key: { userId, deviceId }
        });

        const device = await dynamodb.send(getCommand);

        if (device.Item && device.Item.endpointArn) {
            // Delete from SNS
            try {
                await snsClient.send(new DeleteEndpointCommand({
                    EndpointArn: device.Item.endpointArn
                }));
                console.log('Deleted SNS endpoint:', device.Item.endpointArn);
            } catch (snsError) {
                console.error('Error deleting SNS endpoint:', snsError);
                // Continue to delete from DynamoDB even if SNS fails
            }
        }

        // Delete from DynamoDB
        const deleteCommand = new DeleteCommand({
            TableName: process.env.DEVICES_TABLE || 'solidi-devices-dev',
            Key: { userId, deviceId }
        });

        await dynamodb.send(deleteCommand);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: 'Device deleted successfully'
            })
        };
    } catch (error) {
        console.error('Error deleting device:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};
