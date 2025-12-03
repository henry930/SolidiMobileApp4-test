const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const snsClient = new SNSClient({});
const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Lambda function to send push notifications to users
 * 
 * Expected input:
 * {
 *   userIds: string[],
 *   title: string,
 *   body: string,
 *   data?: object
 * }
 */
exports.handler = async (event) => {
    console.log('Send notification request:', JSON.stringify(event, null, 2));

    try {
        // Parse request body
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { userIds, title, body: messageBody, data } = body;

        // Validate input
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Invalid userIds',
                    message: 'userIds must be a non-empty array'
                })
            };
        }

        if (!title || !messageBody) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Missing required fields',
                    required: ['userIds', 'title', 'body']
                })
            };
        }

        const results = [];
        const tableName = process.env.DEVICES_TABLE || 'device-tokens';

        // Process each user
        for (const userId of userIds) {
            try {
                // Get user's devices from DynamoDB
                const devicesResult = await dynamodb.send(new QueryCommand({
                    TableName: tableName,
                    KeyConditionExpression: 'userId = :userId',
                    FilterExpression: 'active = :active',
                    ExpressionAttributeValues: {
                        ':userId': userId,
                        ':active': true
                    }
                }));

                if (!devicesResult.Items || devicesResult.Items.length === 0) {
                    console.log(`No active devices found for user ${userId}`);
                    results.push({
                        userId,
                        success: false,
                        error: 'No active devices found'
                    });
                    continue;
                }

                // Send to each device
                const deviceResults = [];
                for (const device of devicesResult.Items) {
                    try {
                        // Create platform-specific message
                        const message = createPlatformMessage(title, messageBody, data, device.platform);

                        // Publish to SNS
                        await snsClient.send(new PublishCommand({
                            TargetArn: device.endpointArn,
                            Message: JSON.stringify(message),
                            MessageStructure: 'json'
                        }));

                        console.log(`Notification sent to device ${device.deviceId}`);
                        deviceResults.push({
                            deviceId: device.deviceId,
                            platform: device.platform,
                            success: true
                        });

                    } catch (error) {
                        console.error(`Failed to send to device ${device.deviceId}:`, error);

                        // If endpoint is disabled, mark device as inactive
                        if (error.code === 'EndpointDisabled' || error.code === 'InvalidParameter') {
                            await dynamodb.update({
                                TableName: tableName,
                                Key: { userId, deviceId: device.deviceId },
                                UpdateExpression: 'SET active = :active',
                                ExpressionAttributeValues: {
                                    ':active': false
                                }
                            }).promise();
                        }

                        deviceResults.push({
                            deviceId: device.deviceId,
                            platform: device.platform,
                            success: false,
                            error: error.message
                        });
                    }
                }

                results.push({
                    userId,
                    success: deviceResults.some(r => r.success),
                    devices: deviceResults
                });

            } catch (error) {
                console.error(`Error processing user ${userId}:`, error);
                results.push({
                    userId,
                    success: false,
                    error: error.message
                });
            }
        }

        // Calculate summary
        const summary = {
            totalUsers: userIds.length,
            successfulUsers: results.filter(r => r.success).length,
            failedUsers: results.filter(r => !r.success).length
        };

        console.log('Notification sending complete:', summary);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                summary,
                results
            })
        };

    } catch (error) {
        console.error('Error sending notifications:', error);

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

/**
 * Create platform-specific message format
 */
function createPlatformMessage(title, body, data, platform) {
    const message = {
        default: body
    };

    // iOS (APNS) format
    message.APNS = JSON.stringify({
        aps: {
            alert: {
                title,
                body
            },
            sound: 'default',
            badge: 1,
            'content-available': 1
        },
        data: data || {}
    });

    // iOS Sandbox (for development)
    message.APNS_SANDBOX = message.APNS;

    // Android (FCM) format
    message.GCM = JSON.stringify({
        notification: {
            title,
            body,
            sound: 'default'
        },
        data: data || {},
        priority: 'high'
    });

    return message;
}
