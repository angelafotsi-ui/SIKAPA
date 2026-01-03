const stripe = require('../config/stripe');
const { db } = require('../config/firebase');

/**
 * Create a Stripe Payment Intent
 */
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { amount, email, name, metadata } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid amount'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        email,
        name,
        ...metadata
      },
      receipt_email: email
    });

    // Log to Firestore
    await db.collection('payment_intents').add({
      stripeIntentId: paymentIntent.id,
      email,
      name,
      amount,
      status: paymentIntent.status,
      createdAt: new Date(),
      clientSecret: paymentIntent.client_secret
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
};

/**
 * Verify a Payment Intent
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: true,
        message: 'Payment Intent ID is required'
      });
    }

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Check if payment is successful
    if (paymentIntent.status === 'succeeded') {
      // Update Firestore
      const querySnapshot = await db.collection('payment_intents')
        .where('stripeIntentId', '==', paymentIntentId)
        .get();

      if (querySnapshot.docs.length > 0) {
        await querySnapshot.docs[0].ref.update({
          status: 'succeeded',
          completedAt: new Date()
        });

        // Add to payments collection
        const intentData = querySnapshot.docs[0].data();
        await db.collection('payments').add({
          email: intentData.email,
          name: intentData.name,
          amount: intentData.amount,
          paymentIntentId: paymentIntentId,
          status: 'succeeded',
          timestamp: new Date(),
          currency: 'usd'
        });
      }

      res.json({
        success: true,
        status: 'succeeded',
        message: 'Payment verified successfully'
      });
    } else {
      res.json({
        success: false,
        status: paymentIntent.status,
        message: `Payment status: ${paymentIntent.status}`
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
};

/**
 * Handle Stripe Webhook Events
 */
exports.handleWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('✓ Payment succeeded:', event.data.object.id);
        // Handle payment success
        break;

      case 'payment_intent.payment_failed':
        console.log('✗ Payment failed:', event.data.object.id);
        // Handle payment failure
        break;

      case 'charge.refunded':
        console.log('↩ Charge refunded:', event.data.object.id);
        // Handle refund
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      error: true,
      message: error.message
    });
  }
};

/**
 * Get Payment History for User
 */
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        error: true,
        message: 'Email is required'
      });
    }

    const querySnapshot = await db.collection('payments')
      .where('email', '==', email)
      .orderBy('timestamp', 'desc')
      .get();

    const payments = [];
    querySnapshot.forEach(doc => {
      payments.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
};
