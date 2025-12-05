const { SNSClient, CreatePlatformEndpointCommand, SetEndpointAttributesCommand } = require('@aws-sdk/client-sns');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const snsClient = new SNSClient({});
const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Lambda function to register device tokens for push notifications
 * 
 * Expected input:
 * {
 *   userId: string,
 *   deviceId: string,
 *   platform: 'ios' | 'android',
 *   token: string
 * }
 */
exports.handler = async (event) => {
    console.log('Register device request:', JSON.stringify(event, null, 2));

    try {
        // Parse request body
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { userId, deviceId, platform, token } = body;

        // Validate input
        if (!userId || !deviceId || !platform || !token) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Missing required fields',
                    required: ['userId', 'deviceId', 'platform', 'token']
                })
            };
        }

        if (!['ios', 'android'].includes(platform)) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Invalid platform',
                    message: 'Platform must be either "ios" or "android"'
                })
            };
        }

        // Get platform ARN from environment
        const platformArn = platform === 'ios'
            ? process.env.PLATFORM_APPLICATION_ARN_IOS
            : process.env.PLATFORM_APPLICATION_ARN_ANDROID;

        if (!platformArn) {
            console.error(`Platform ARN not configured for ${platform}`);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    error: 'Platform not configured',
                    message: `${platform.toUpperCase()} platform ARN not set`
                })
            };
        }

        // Check if endpoint already exists for this device
        let endpointArn;
        const existingDevice = await dynamodb.send(new GetCommand({
            TableName: process.env.DEVICES_TABLE || 'solidi-devices-dev',
            Key: { userId, deviceId }
        }));

        if (existingDevice.Item && existingDevice.Item.endpointArn) {
            // Update existing endpoint
            try {
                await snsClient.send(new SetEndpointAttributesCommand({
                    EndpointArn: existingDevice.Item.endpointArn,
                    Attributes: {
                        Token: token,
                        Enabled: 'true'
                    }
                }));
                endpointArn = existingDevice.Item.endpointArn;
                console.log('Updated existing endpoint:', endpointArn);
            } catch (error) {
                console.log('Failed to update endpoint, creating new one:', error.message);

                // If endpoint exists with same token but different attributes, delete it first
                if (error.message && error.message.includes('already exists with the same Token')) {
                    console.log('Deleting conflicting endpoint...');
                    try {
                        const { DeleteEndpointCommand } = require('@aws-sdk/client-sns');
                        await snsClient.send(new DeleteEndpointCommand({
                            EndpointArn: existingDevice.Item.endpointArn
                        }));
                        console.log('Deleted old endpoint');
                    } catch (deleteError) {
                        console.log('Failed to delete endpoint:', deleteError.message);
                    }
                }

                // Create new endpoint
                const endpoint = await snsClient.send(new CreatePlatformEndpointCommand({
                    PlatformApplicationArn: platformArn,
                    Token: token,
                    CustomUserData: userId
                }));
                endpointArn = endpoint.EndpointArn;
            }
        } else {
            // Create new SNS Platform Endpoint
            try {
                const endpoint = await snsClient.send(new CreatePlatformEndpointCommand({
                    PlatformApplicationArn: platformArn,
                    Token: token,
                    CustomUserData: userId
                }));
                endpointArn = endpoint.EndpointArn;
                console.log('Created new endpoint:', endpointArn);
            } catch (error) {
                // If endpoint exists with same token, try to find and delete it
                if (error.message && error.message.includes('already exists with the same Token')) {
                    console.log('Endpoint conflict detected, attempting to resolve...');
                    // Extract endpoint ARN from error message if possible, or create with force
                    const endpoint = await snsClient.send(new CreatePlatformEndpointCommand({
                        PlatformApplicationArn: platformArn,
                        Token: token,
                        CustomUserData: userId
                    }));
                    endpointArn = endpoint.EndpointArn;
                } else {
                    throw error;
                }
            }
        }

        // Store/update in DynamoDB
        const timestamp = Date.now();
        await dynamodb.send(new PutCommand({
            TableName: process.env.DEVICES_TABLE || 'solidi-devices-dev',
            Item: {
                userId,
                deviceId,
                platform,
                token,
                endpointArn,
                createdAt: existingDevice.Item?.createdAt || timestamp,
                updatedAt: timestamp,
                active: true
            }
        }));

        console.log('Device registered successfully');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                endpointArn,
                message: 'Device registered successfully'
            })
        };

    } catch (error) {
        console.error('Error registering device:', error);

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
