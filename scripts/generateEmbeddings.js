// scripts/generateEmbeddings.js
const mongoose = require("mongoose");
const { generateEmbeddingsForSubject } = require("../controllers/aiSearch");
const Question = require("../models/question");

require("dotenv").config({ path: "./.env" });


async function main() {
    console.log("🔄 Connecting to DB...",process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI, {
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
  });
  console.log("✅ Connected to DB");
// generateEmbeddingForString("Explain breathing mechanism");
  // Option A: Generate embeddings for all subjects
  const subjects = await Question.distinct("subject_id");
  console.log("📚 Subjects found:", subjects);

  for (const subject of subjects) {
    console.log(`\n--- Generating embeddings for ${subject} ---`);
    await generateEmbeddingsForSubject(subject, { batchSize: 50, force: true });
  }

  console.log("\n✅ All embeddings generated!");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
