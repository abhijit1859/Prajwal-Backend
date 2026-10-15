const mongoose = require("mongoose");

exports.connectDatabase = () => {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/medhwan";

  // Connection options to handle timeouts and connection issues
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
    connectTimeoutMS: 30000, // 30 seconds
    maxPoolSize: 10, // Maximum number of connections in the pool
    minPoolSize: 1, // Minimum number of connections in the pool
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    retryWrites: true,
    w: "majority",
  };

  mongoose
    .connect(mongoUri, options)
    .then((con) => {
      console.log(`Database connected successfully ${con.connection.host}`);
    })
    .catch((err) => {
      console.error("Database connection error:", err.message);
      console.log(
        "Please check your MongoDB connection string in environment variables"
      );
      // Exit process if database connection fails
      process.exit(1);
    });

  // Handle connection events
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected");
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    } catch (err) {
      console.error("Error closing MongoDB connection:", err);
      process.exit(1);
    }
  });
};
