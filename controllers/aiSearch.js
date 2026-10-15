// controllers/aiSearch.js

const Question = require("../models/question");
const User = require("../models/user");

let transformers = null;
let pipeline = null;
let model = null;

/* ---------------------- MODEL LOADING ---------------------- */

async function loadTransformers() {
  if (!transformers) {
    transformers = await import("@xenova/transformers");
    console.log("✅ Transformers library loaded");
    pipeline = transformers.pipeline;
  }
  return pipeline;
}

async function initializeModel() {
  if (model) return model;

  const pipe = await loadTransformers();
  console.log("🔄 Loading transformer model...");

  model = await pipe("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  console.log("✅ Transformer model loaded");
  return model;
}

/* ---------------------- SIMILARITY ---------------------- */

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return -1;

  let dot = 0,
    na = 0,
    nb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }

  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

/* ---------------------- SEARCH ---------------------- */

const searchQuestions = async (req, res) => {
  try {
    const { subject, query, limit = 10, page = 1, question_type } = req.query;

    if (!subject || !query) {
      return res.status(400).json({ error: "subject & query required" });
    }

    if (!model) await initializeModel();

    const findQuery = {
      subject_id: subject,
      embedding: { $exists: true, $ne: [] },
    };
    if (question_type) findQuery.question_type = question_type;

    const docs = await Question.find(findQuery).lean();
    if (!docs.length) {
      return res.json({ success: true, data: [] });
    }

    // --- bookmarks
    let bookmarkedIds = [];
    if (req.user && req.user._id) {
      const user = await User.findById(req.user._id).select(
        "bookmarked_questions"
      );
      bookmarkedIds = user?.bookmarked_questions?.map(String) || [];
    }

    // --- Query embedding
    const out = await model(query, { pooling: "mean", normalize: true });

    // out.data is Float32Array(dim)
    const qemb = Array.from(out.data);

    if (!qemb.length) throw new Error("Query embedding generation failed");

    // --- compute similarity
    const results = docs.map((d) => {
      const floatEmb = Array.isArray(d.embedding) ? d.embedding : [];
      const score = cosineSimilarity(qemb, floatEmb);

      return {
        matching_question: {
          ...d,
          isBookmarked: bookmarkedIds.includes(String(d._id)),
        },
        score,
      };
    });

    // --- sort & paginate
    results.sort((a, b) => b.score - a.score);

    const pageNum = Math.max(parseInt(page), 1);
    const pageLimit = Math.max(parseInt(limit), 1);

    const start = (pageNum - 1) * pageLimit;
    const paginated = results.slice(start, start + pageLimit);

    res.json({ success: true, data: paginated });
  } catch (err) {
    console.error("❌ Error in searchQuestions:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ---------------------- EMBEDDING FOR ONE QUESTION ---------------------- */

async function generateEmbeddingForQuestion(question_id) {
  await initializeModel();

  const doc = await Question.findOne({ question_id });
  if (!doc) throw new Error("Question not found");

  // Determine text to embed
  let text = (doc.embedding_text || "").trim();

  if (!text) {
    const q = (doc.question || "").trim();
    text =
      q.length < 8
        ? Array.isArray(doc.topic) && doc.topic.length
          ? doc.topic[0]
          : q
        : q;
  }

  const out = await model(text, { pooling: "mean", normalize: true });

  const emb = Array.from(out.data);

  await Question.updateOne(
    { _id: doc._id },
    {
      $set: { embedding: emb, embedding_text: text },
    }
  );

  console.log(`✅ Embedding generated for question_id: ${question_id}`);
}

/* ---------------------- BATCH EMBEDDINGS ---------------------- */

async function generateEmbeddingsForSubject(subject_id, options = {}) {
  const { batchSize = 50, force = false } = options;

  await initializeModel();

  const query = force
    ? { subject_id }
    : {
        subject_id,
        $or: [
          { embedding: { $exists: false } },
          { embedding: { $size: 0 } },
          { embedding: [] },
        ],
      };

  const total = await Question.countDocuments(query);
  console.log(
    `🔁 Generating embeddings for subject ${subject_id} — ${total} documents`
  );

  if (total === 0) return { processed: 0, total: 0 };

  let processed = 0;
  const cursor = Question.find(query).cursor();
  const batch = [];

  for await (const doc of cursor) {
    batch.push(doc);

    if (batch.length >= batchSize) {
      await processBatch(batch);
      processed += batch.length;
      console.log(`✅ Processed: ${processed}/${total}`);
      batch.length = 0;
    }
  }

  if (batch.length) {
    await processBatch(batch);
    processed += batch.length;
    console.log(`✅ Processed: ${processed}/${total}`);
  }

  return { processed, total };
}

async function processBatch(batch) {
  const texts = batch.map((d) => {
    let text = (d.embedding_text || "").trim();
    if (!text) {
      const q = (d.question || "").trim();
      text =
        q.length < 8
          ? Array.isArray(d.topic) && d.topic.length
            ? d.topic[0]
            : q
          : q;
    }
    return text;
  });

  const out = await model(texts, { pooling: "mean", normalize: true });

  const dim = out.dims[1]; // 384
  const embeddings = [];

  for (let i = 0; i < texts.length; i++) {
    const start = i * dim;
    const end = start + dim;
    embeddings.push(Array.from(out.data.slice(start, end)));
  }

  const ops = batch.map((doc, i) =>
    Question.updateOne(
      { _id: doc._id },
      {
        $set: {
          embedding: embeddings[i],
          embedding_text: texts[i],
        },
      }
    )
  );

  await Promise.all(ops);
  console.log(`✅ Saved ${batch.length} embeddings`);
}
/* ---------------------- EMBEDDING FOR RAW STRING ---------------------- */

async function generateEmbeddingForString(text) {
  try {
    if (!text || typeof text !== "string") throw new Error("Text required");

    await initializeModel();

    console.log("🔡 Generating embedding for text:");
    console.log("👉", text);

    const out = await model(text, { pooling: "mean", normalize: true });

    const emb = Array.from(out.data);

    console.log("📏 Embedding length:", emb.length);
    console.log("🧩 First 10 values:", emb.slice(0, 10));
    console.log("✅ Embedding generated successfully");

    return emb;
  } catch (err) {
    console.error("❌ Error generating embedding for string:", err);
    return null;
  }
}


/* ---------------------- EXPORTS ---------------------- */

module.exports = {
  initializeModel,
  searchQuestions,
  generateEmbeddingsForSubject,
  generateEmbeddingForQuestion,
  generateEmbeddingForString,
};
