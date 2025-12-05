const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

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
        const { userIds, userId, title, body: messageBody, message, data } = body;
        const finalMessage = messageBody || message;

        // Normalize userIds
        let targetUserIds = [];
        if (userIds && Array.isArray(userIds)) {
            targetUserIds = userIds;
        } else if (userId) {
            targetUserIds = [userId];
        }

        // Validate input
        if (targetUserIds.length === 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Invalid userIds',
                    message: 'userId or userIds must be provided'
                })
            };
        }

        if (!title || !finalMessage) {
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
        const devicesTableName = process.env.DEVICES_TABLE || 'device-tokens';
        const notificationsTableName = process.env.NOTIFICATIONS_TABLE || 'notifications';

        // Process each user
        for (const userId of targetUserIds) {
            try {
                // Generate notification ID and timestamp
                const timestamp = Date.now(); // Unix timestamp in milliseconds
                const notificationId = `notif_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
                const createdAt = new Date(timestamp).toISOString(); // ISO string for display

                // Save notification to DynamoDB first
                await dynamodb.send(new PutCommand({
                    TableName: notificationsTableName,
                    Item: {
                        userId,
                        notificationId,
                        timestamp,
                        createdAt,
                        title,
                        body: finalMessage,
                        data: data || {},
                        read: false,
                        sent: false,
                        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
                    }
                }));
                console.log(`Notification saved to database: ${notificationId}`);

                // Get user's devices from DynamoDB
                const devicesResult = await dynamodb.send(new QueryCommand({
                    TableName: devicesTableName,
                    KeyConditionExpression: 'userId = :userId',
                    FilterExpression: 'active = :active',
                    ExpressionAttributeValues: {
                        ':userId': userId,
                        ':active': true
                    }
                }));

                if (!devicesResult.Items || devicesResult.Items.length === 0) {
                    console.log(`No active devices found for user ${userId}, but notification was saved`);
                    results.push({
                        userId,
                        notificationId,
                        success: true,
                        saved: true,
                        sent: false,
                        message: 'Notification saved but no active devices to send to'
                    });
                    continue;
                }

                // Send to each device
                const deviceResults = [];
                for (const device of devicesResult.Items) {
                    try {
                        // Create platform-specific message
                        const message = createPlatformMessage(title, finalMessage, data, device.platform);

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
                            await dynamodb.send(new UpdateCommand({
                                TableName: devicesTableName,
                                Key: { userId, deviceId: device.deviceId },
                                UpdateExpression: 'SET active = :active',
                                ExpressionAttributeValues: {
                                    ':active': false
                                }
                            }));
                        }

                        deviceResults.push({
                            deviceId: device.deviceId,
                            platform: device.platform,
                            success: false,
                            error: error.message
                        });
                    }
                }

                const sentSuccessfully = deviceResults.some(r => r.success);

                // Update notification as sent if at least one device received it
                if (sentSuccessfully) {
                    await dynamodb.send(new PutCommand({
                        TableName: notificationsTableName,
                        Item: {
                            userId,
                            notificationId,
                            timestamp,
                            createdAt,
                            title,
                            body: finalMessage,
                            data: data || {},
                            read: false,
                            sent: true,
                            sentAt: new Date().toISOString(),
                            ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
                        }
                    }));
                    console.log(`Notification ${notificationId} marked as sent`);
                }

                results.push({
                    userId,
                    notificationId,
                    success: sentSuccessfully,
                    saved: true,
                    sent: sentSuccessfully,
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
            totalUsers: targetUserIds.length,
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
