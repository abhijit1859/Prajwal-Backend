# MSG91 OTP Integration Setup

This guide explains how to set up MSG91 for OTP authentication in your application.

## Environment Variables Required

Add the following environment variables to your `.env` file:

```env
# MSG91 Configuration
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_TEMPLATE_ID=your_msg91_template_id
MSG91_SENDER_ID=your_msg91_sender_id
```

## How to Get MSG91 Credentials

1. **Sign up for MSG91**: Go to [MSG91.com](https://msg91.com) and create an account
2. **Get Auth Key**: After registration, you'll receive an auth key in your dashboard
3. **Create Template**:
   - Go to Templates section in your MSG91 dashboard
   - Create a new template for OTP verification
   - Use variables like `{{otp}}` in your template
   - Get the template ID from the created template
4. **Sender ID**: Use your approved sender ID (usually your brand name)

## Template Example

Your MSG91 template should look something like this:

```
Your OTP for Medhwan verification is {{otp}}. Valid for 10 minutes.
```

## Code Changes Made

1. **Created `config/msg91.js`**: Contains MSG91 configuration and helper functions
2. **Modified `models/user.js`**: Updated OTP generation to create 6-digit OTPs
3. **Modified `controllers/user.js`**:
   - Integrated MSG91 OTP sending in `registerWithPhone`
   - Integrated MSG91 OTP sending in `resendOtp`
   - Removed OTP from API responses for security

## API Endpoints

The following endpoints now use MSG91 for OTP:

- `POST /api/v1/register/phone` - Register with phone number
- `POST /api/v1/resend-otp` - Resend OTP
- `POST /api/v1/verify-otp` - Verify OTP (unchanged)

## Security Improvements

- OTP is no longer returned in API responses
- 6-digit OTP instead of "0000"
- Proper error handling for MSG91 failures
- OTP expiration after 10 minutes

## Testing

1. Set up your environment variables
2. Test the registration flow with a real phone number
3. Check MSG91 dashboard for delivery reports
4. Verify OTP functionality works correctly

## Troubleshooting

- Ensure your MSG91 account has sufficient balance
- Check that your sender ID is approved
- Verify template is approved by MSG91
- Check delivery reports in MSG91 dashboard
