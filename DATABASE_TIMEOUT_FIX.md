# Database Timeout Fix

## Problem

You were experiencing the error: `Operation 'users.findOne()' buffering timed out after 10000ms` when accessing the bookmark endpoint.

## Root Causes

1. **Insufficient database connection timeout settings**
2. **Missing database indexes** causing slow queries
3. **No connection pooling** configuration
4. **No query timeout limits** on individual operations

## Fixes Applied

### 1. Enhanced Database Connection Configuration (`config/database.js`)

- Added proper connection options with increased timeouts
- Implemented connection pooling
- Added error handling and graceful shutdown
- Added connection event listeners

### 2. Added Database Indexes

- **User Model** (`models/user.js`): Added indexes for `_id`, `user_id`, `mobile_number`, `email_id`, and `bookmarked_questions`
- **Question Model** (`models/question.js`): Added indexes for `_id`, `question_id`, `subject`, `chapter`, and `category_id`

### 3. Improved Query Performance

- Added `maxTimeMS(5000)` to database queries in:
  - `controllers/user.js` - `addRemoveBookmarkQuestion` function
  - `middlewares/auth.js` - `isAuthenticated` function
- Added better error handling for timeout scenarios

### 4. Enhanced Error Handling

- Added specific timeout error detection
- Improved error messages for better debugging
- Added console logging for debugging

## Testing the Fix

### 1. Test Database Connection

```bash
node test-db-connection.js
```

### 2. Restart Your Server

```bash
npm start
# or
node server.js
```

### 3. Test the Bookmark Endpoint

Try accessing your bookmark endpoint again:

```
https://commonbackend-f3bwf8dnezayejh3.centralindia-01.azurewebsites.net/api/v1/bookmark/e10bio07blank00989
```

## Environment Variables Required

Make sure you have these environment variables set:

```env
MONGO_URI=your_mongodb_connection_string
# or
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

## Additional Recommendations

### 1. Monitor Database Performance

- Use MongoDB Compass or similar tools to monitor query performance
- Check for slow queries in MongoDB logs

### 2. Consider Database Optimization

- If you have a large dataset, consider implementing pagination
- Use database aggregation for complex queries
- Consider implementing caching for frequently accessed data

### 3. Production Considerations

- Use a managed MongoDB service (Atlas, DocumentDB, etc.)
- Set up proper monitoring and alerting
- Implement database connection retry logic
- Consider using read replicas for read-heavy operations

## Troubleshooting

If you still experience timeout issues:

1. **Check MongoDB Connection String**: Ensure your MongoDB URI is correct and accessible
2. **Verify Network Connectivity**: Check if your server can reach the MongoDB instance
3. **Monitor Resource Usage**: Check CPU and memory usage on both application and database servers
4. **Check MongoDB Logs**: Look for any errors or warnings in MongoDB logs
5. **Test with Different Query**: Try a simple query first to isolate the issue

## Files Modified

- `config/database.js` - Enhanced connection configuration
- `models/user.js` - Added database indexes
- `models/question.js` - Added database indexes
- `controllers/user.js` - Added query timeouts and error handling
- `middlewares/auth.js` - Added query timeouts and error handling
- `test-db-connection.js` - Created test script
- `DATABASE_TIMEOUT_FIX.md` - This documentation file
