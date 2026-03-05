// HUBTEL Payment Gateway Configuration
const axios = require('axios');
const crypto = require('crypto');

const HUBTEL_API_ID = process.env.HUBTEL_API_ID;
const HUBTEL_API_KEY = process.env.HUBTEL_API_KEY;
const HUBTEL_API_URL = process.env.HUBTEL_API_URL || 'https://payproxyapi.hubtel.com';
const HUBTEL_MERCHANT_ACCOUNT = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER;

if (!HUBTEL_API_ID || !HUBTEL_API_KEY || !HUBTEL_MERCHANT_ACCOUNT) {
  console.warn('⚠ HUBTEL credentials not set in .env - HUBTEL payment gateway will not work');
}

console.log('[Hubtel] Configuration loaded');
console.log('[Hubtel] API URL:', HUBTEL_API_URL);
console.log('[Hubtel] Merchant Account:', HUBTEL_MERCHANT_ACCOUNT);
console.log('[Hubtel] API ID configured:', !!HUBTEL_API_ID);

/**
 * Initialize HUBTEL payment
 * @param {Object} paymentData - Payment information
 * @returns {Promise<Object>} - HUBTEL payment response
 */
async function initializePayment(paymentData) {
  try {
    const {
      amount,
      description,
      customerName,
      customerEmail,
      customerPhone,
      returnUrl,
      callbackUrl,
      reference
    } = paymentData;

    console.log('[Hubtel] Initializing payment:', {
      amount,
      description,
      customerPhone,
      reference
    });

    // Create authorization header
    const auth = Buffer.from(`${HUBTEL_API_ID}:${HUBTEL_API_KEY}`).toString('base64');

    const payload = {
      totalAmount: amount,
      description,
      callbackUrl,
      returnUrl,
      merchantAccountNumber: HUBTEL_MERCHANT_ACCOUNT,
      cancellationUrl: returnUrl,
      clientReference: reference,
      payeeName: customerName,
      payeeEmail: customerEmail,
      payeeMobileNumber: customerPhone
    };

    const response = await axios.post(
      `${HUBTEL_API_URL}/items/initiate`,
      payload,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[Hubtel] Payment initialization successful:', response.data);
    return {
      success: true,
      data: response.data,
      paymentUrl: response.data.data?.checkoutUrl || response.data.checkoutUrl || null,
      transactionId: response.data.data?.checkoutId || response.data.checkoutId || reference
    };
  } catch (error) {
    console.error('[Hubtel] Payment initialization error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Verify HUBTEL payment
 * @param {string} transactionId - Transaction ID from HUBTEL
 * @returns {Promise<Object>} - Payment status
 */
async function verifyPayment(transactionId) {
  try {
    console.log('[Hubtel] Verifying payment:', transactionId);

    const auth = Buffer.from(`${HUBTEL_API_ID}:${HUBTEL_API_KEY}`).toString('base64');

    const response = await axios.get(
      `${HUBTEL_API_URL}/merchants/transactions/${transactionId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[Hubtel] Verification response:', response.data);

    const transaction = response.data.data;
    return {
      success: transaction?.status === 'completed',
      status: transaction?.status,
      amount: transaction?.amount ? transaction.amount / 100 : 0,
      reference: transaction?.clientReference,
      timestamp: transaction?.createdAt,
      rawData: transaction
    };
  } catch (error) {
    console.error('[Hubtel] Payment verification error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      statusCode: error.response?.status
    };
  }
}

module.exports = {
  initializePayment,
  verifyPayment,
  HUBTEL_API_URL,
  HUBTEL_API_ID
};
