# Environment Setup Guide

To fix the current errors, you need to create a `.env` file in the `config/` directory with the following variables:

## Required Environment Variables

Create a file named `.env` in the `config/` directory with the following content:

```env
# MSG91 Configuration
MSG91_AUTH_KEY=your_msg91_auth_key_here
MSG91_TEMPLATE_ID=your_msg91_template_id_here
MSG91_SENDER_ID=your_msg91_sender_id_here

# Razorpay Configuration
RAZORPAY_API_KEY=your_razorpay_api_key_here
RAZORPAY_APT_SECRET=your_razorpay_secret_key_here

# Database Configuration
MONGO_URI=mongodb://localhost:27017/medhwan
# Alternative: MONGODB_URI=mongodb://localhost:27017/medhwan

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

## How to Get Credentials

### MSG91 Setup
1. Sign up at [MSG91.com](https://msg91.com)
2. Get your auth key from the dashboard
3. Create an OTP template and get the template ID
4. Use your approved sender ID

### Razorpay Setup
1. Sign up at [Razorpay.com](https://razorpay.com)
2. Get your API key and secret from the dashboard
3. Use test keys for development

### Database Setup
- For local development, use MongoDB locally or MongoDB Atlas
- Update the MONGO_URI with your connection string

## Current Status

The application has been updated with fallback handling:
- If environment variables are missing, the app will use mock instances
- This allows the app to start without crashing
- You'll see console messages indicating which services are using mock instances

## Next Steps

1. Create the `.env` file with your actual credentials
2. Restart the application
3. Check console logs to confirm services are properly initialized 