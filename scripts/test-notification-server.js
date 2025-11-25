// Simple Local Notification Test Server
// This simulates receiving a push notification by directly calling the notification storage

const http = require('http');

const PORT = 3001;

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/send-test-notification') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const notification = {
                    title: data.title || 'Test Notification',
                    body: data.body || 'This is a test notification',
                    data: data.data || {}
                };

                console.log('\n📱 Sending test notification:');
                console.log('  Title:', notification.title);
                console.log('  Body:', notification.body);
                console.log('  Data:', JSON.stringify(notification.data));
                console.log('\n✅ Notification would be sent to device\n');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    notification,
                    message: 'Test notification logged. In production, this would be sent via AWS SNS.'
                }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    } else if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Push Notification Test</title>
        <style>
          body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
          input, textarea { width: 100%; padding: 10px; margin: 10px 0; }
          button { padding: 10px 20px; background: #007AFF; color: white; border: none; cursor: pointer; }
          button:hover { background: #0056b3; }
          .result { margin-top: 20px; padding: 10px; background: #f0f0f0; }
        </style>
      </head>
      <body>
        <h1>📱 Push Notification Test</h1>
        <p>Send a test notification to your device</p>
        
        <form id="notificationForm">
          <label>Title:</label>
          <input type="text" id="title" value="Test Notification" required>
          
          <label>Message:</label>
          <textarea id="body" rows="3" required>This is a test notification sent at ${new Date().toLocaleTimeString()}</textarea>
          
          <button type="submit">Send Test Notification</button>
        </form>
        
        <div id="result" class="result" style="display:none;"></div>
        
        <script>
          document.getElementById('notificationForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('title').value;
            const body = document.getElementById('body').value;
            
            try {
              const response = await fetch('http://localhost:${PORT}/send-test-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title,
                  body,
                  data: { timestamp: Date.now(), type: 'test' }
                })
              });
              
              const result = await response.json();
              const resultDiv = document.getElementById('result');
              resultDiv.style.display = 'block';
              resultDiv.innerHTML = '<strong>✅ Success!</strong><br>' + result.message;
              
              console.log('Response:', result);
            } catch (error) {
              const resultDiv = document.getElementById('result');
              resultDiv.style.display = 'block';
              resultDiv.innerHTML = '<strong>❌ Error:</strong> ' + error.message;
            }
          });
        </script>
        
        <hr>
        <h3>📝 Instructions:</h3>
        <ol>
          <li>Make sure your React Native app is running</li>
          <li>Fill in the notification details above</li>
          <li>Click "Send Test Notification"</li>
          <li>Check the server console for the notification details</li>
        </ol>
        
        <p><strong>Note:</strong> This is a mock server for testing. In production, notifications are sent via AWS SNS → APNS/FCM.</p>
      </body>
      </html>
    `);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log('\n🚀 Push Notification Test Server Running');
    console.log(`📱 Open http://localhost:${PORT} in your browser`);
    console.log(`\n💡 This simulates the notification sending process`);
    console.log(`   In production, this would use AWS SNS + APNS/FCM\n`);
});
