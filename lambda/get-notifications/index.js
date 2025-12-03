const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE || 'solidi-notifications';

/**
 * Lambda function to retrieve notifications for a user
 * 
 * API Endpoint: GET /notifications?userId=user@example.com&limit=50&lastKey=...
 * 
 * Query Parameters:
 * - userId: User identifier (required)
 * - limit: Number of notifications to return (optional, default: 50, max: 100)
 * - lastKey: For pagination - the last notification ID from previous response (optional)
 * 
 * Response:
 * {
 *   success: true,
 *   notifications: [...],
 *   lastKey: "..." // For pagination
 * }
 */
exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        // Parse query parameters
        const queryParams = event.queryStringParameters || {};
        const userId = queryParams.userId;
        const limit = Math.min(parseInt(queryParams.limit) || 50, 100);
        const lastKey = queryParams.lastKey;

        // Validate userId
        if (!userId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    error: 'userId is required'
                })
            };
        }

        // Build DynamoDB query
        const dbQueryParams = {
            TableName: NOTIFICATIONS_TABLE,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            },
            ScanIndexForward: false, // Sort by timestamp descending (newest first)
            Limit: limit
        };

        // Add pagination token if provided
        if (lastKey) {
            dbQueryParams.ExclusiveStartKey = {
                userId: userId,
                timestamp: parseInt(lastKey)
            };
        }

        // Query DynamoDB
        const result = await dynamodb.query(dbQueryParams).promise();

        console.log(`Retrieved ${result.Items.length} notifications for user: ${userId}`);

        // Format response
        const response = {
            success: true,
            notifications: result.Items.map(item => ({
                id: item.notificationId,
                title: item.title,
                body: item.body,
                data: item.data || {},
                timestamp: item.timestamp,
                read: item.read || false
            })),
            count: result.Items.length
        };

        // Add pagination token if there are more results
        if (result.LastEvaluatedKey) {
            response.lastKey = result.LastEvaluatedKey.timestamp.toString();
            response.hasMore = true;
        } else {
            response.hasMore = false;
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('Error retrieving notifications:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Failed to retrieve notifications',
                message: error.message
            })
        };
    }
};
