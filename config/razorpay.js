const Razorpay = require('razorpay');

let razorpay = null;

// Only initialize Razorpay if environment variables are available
if (process.env.RAZORPAY_API_KEY && process.env.RAZORPAY_APT_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_API_KEY,
      key_secret: process.env.RAZORPAY_APT_SECRET
    });
    console.log("Razorpay initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Razorpay:", error.message);
    // Create a mock instance for development
    razorpay = {
      orders: {
        create: async () => ({ id: 'mock_order_id' }),
        fetch: async () => ({ id: 'mock_order_id', status: 'created' })
      },
      payments: {
        fetch: async () => ({ id: 'mock_payment_id', status: 'captured' })
      }
    };
  }
} else {
  console.log("Razorpay environment variables not found, using mock instance");
  // Create a mock instance for development
  razorpay = {
    orders: {
      create: async () => ({ id: 'mock_order_id' }),
      fetch: async () => ({ id: 'mock_order_id', status: 'created' })
    },
    payments: {
      fetch: async () => ({ id: 'mock_payment_id', status: 'captured' })
    }
  };
}

module.exports = razorpay;
