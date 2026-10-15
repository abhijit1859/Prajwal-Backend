const mongoose = require("mongoose");
require("dotenv").config();

async function testDatabaseConnection() {
  console.log("Testing database connection...");

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/medhwan";
  console.log("MongoDB URI:", mongoUri);

  // Connection options
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    w: "majority",
  };

  try {
    console.log("Attempting to connect...");
    const connection = await mongoose.connect(mongoUri, options);
    console.log(
      `✅ Database connected successfully to ${connection.connection.host}`
    );

    // Test a simple query
    console.log("Testing a simple query...");
    const User = require("./models/user");
    const userCount = await User.countDocuments().maxTimeMS(5000);
    console.log(`✅ Query successful. Total users: ${userCount}`);

    // Test finding a user by ID (simulate the bookmark endpoint)
    console.log("Testing user findById query...");
    const testUser = await User.findOne().maxTimeMS(5000);
    if (testUser) {
      const userById = await User.findById(testUser._id).maxTimeMS(5000);
      console.log(
        `✅ User findById successful: ${
          userById ? "User found" : "User not found"
        }`
      );
    } else {
      console.log("⚠️ No users found in database to test findById");
    }

    await mongoose.connection.close();
    console.log("✅ Database connection closed successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("Error details:", error);
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();
