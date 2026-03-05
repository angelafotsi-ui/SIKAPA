const axios = require('axios');

async function testHubtel() {
  const apiId = 'znonv6Y';
  const apiKey = '9cea3d3c26bc4aa58e885620689b18b3';
  const auth = Buffer.from(`${apiId}:${apiKey}`).toString('base64');
  
  console.log('[TEST] Testing HUBTEL with credentials:');
  console.log('[TEST] API ID:', apiId);
  console.log('[TEST] Auth Header: Basic ' + auth.substring(0, 20) + '...');
  
  try {
    const response = await axios.post(
      'https://payproxyapi.hubtel.com/items/initiate',
      {
        totalAmount: 10,
        description: 'Test Payment',
        callbackUrl: 'http://localhost:3000/api/deposit/hubtel/callback',
        returnUrl: 'http://localhost:3000/deposit-success.html',
        merchantAccountNumber: '2038053',
        cancellationUrl: 'http://localhost:3000/deposit-success.html',
        clientReference: 'TEST_' + Math.random().toString(36).substring(7),
        payeeName: 'Test User',
        payeeEmail: 'test@test.com',
        payeeMobileNumber: '0123456789'
      },
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    console.log('[TEST] ✓ SUCCESS - HUBTEL accepted the request');
    console.log('[TEST] Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('[TEST] ✗ ERROR:');
    console.log('[TEST] Status:', error.response?.status);
    console.log('[TEST] Status Text:', error.response?.statusText);
    if (error.response?.data) {
      console.log('[TEST] Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    console.log('[TEST] Error Message:', error.message);
  }
}

testHubtel();
