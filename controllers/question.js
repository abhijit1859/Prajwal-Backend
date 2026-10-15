const Question = require("../models/question");
const User = require("../models/user");
//const Course = require("../models/course");
const Subject = require("../models/subject");
const fs = require("fs");
const path = require("path");
const {generateEmbeddingForQuestion} = require("../controllers/aiSearch");
const os = require("os");
// TODO: Check embedding generation when ConnectionRefused or Socket Exception
// Create a new question
exports.createQuestion = async (req, res) => {
  try {
    // Ensure all required fields are set to defaults if missing
    const data = normalizeQuestionData(req.body);
    
    const question = await Question.create(data);
     generateEmbeddingForQuestion(question.question_id)
      .then(() => console.log("✅ Single question embedding added"))
      .catch(console.error);
    res.status(201).json({
      success: true,
      question,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all questions
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.status(200).json({
      success: true,
      questions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a question by ID
exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findOne({ question_id: req.params.id });
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }
    res.status(200).json({
      success: true,
      question,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a question
exports.updateQuestion = async (req, res) => {
  try {
    let question = await Question.findOne({ question_id: req.params.id });
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }
    const data = normalizeQuestionData(req.body);
    question = await Question.findByIdAndUpdate(question._id, data, {
      new: true,
      runValidators: true,
    });
     generateEmbeddingForQuestion(question.question_id)
      .then(() => console.log("✅ Embedding updated for edited question"))
      .catch(console.error);
    res.status(200).json({
      success: true,
      question,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a question
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findOne({ question_id: req.params.id });
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }
    await question.remove();
    res.status(200).json({
      success: true,
      message: "Question deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Upload a question file (JSON) and save data to the database
exports.uploadQuestionFile = async (req, res) => {
  console.log("Reached uploadQuestionFile controller");

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }
    // console.log("Uploaded file:", req.file);
  
  const tempFileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = path.join(os.tmpdir(), tempFileName);

    await fs.promises.writeFile(filePath, req.file.buffer);

    const fileContent = fs.readFileSync(filePath, "utf8");
// let data
//      data = JSON.parse(fileContent);
// console.log("Total questions:", data.length);

    let questions;
    try {
      questions = JSON.parse(fileContent);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON file format",
      });
    }

    // Respond immediately (prevents socket hang up)
     // 🔥 Send Immediate Response (Avoids Socket Timeout)
    res.status(202).json({
      success: true,
      message: "File received! Processing in background...",
    });

    // Continue processing AFTER response
    setTimeout(() => processQuestions(questions, filePath), 60);

  } catch (error) {
    console.error("Internal error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};


async function processQuestions(questions, filePath) {
  console.log("📌 Starting background processing...");

  questions = questions.map(normalizeQuestionData);

  const existing = await Question.find({
    question_id: { $in: questions.map(q => q.question_id) }
  });

  const existingMap = Object.fromEntries(
    existing.map(q => [q.question_id, q])
  );

  let added = 0;
  let updated = 0;

  for (const q of questions) {
    try {
      if (!isValid(q)) continue;

      const exists = existingMap[q.question_id];

      if (exists) {
        Object.assign(exists, q);
        await exists.save();
        updated++;
      } else {
        await new Question(q).save();
        added++;
      }

    } catch (err) {
      console.error("❌ Failed processing:", q.question_id, err.message);
    }
  }

  console.log("🎉 Finished processing file");
  console.log("Added:", added, "Updated:", updated);

  // delete file
  try { await fs.promises.unlink(filePath); } catch {}

  console.log("🧹 File deleted.");
}

function isValid(q) {
  return (
    q.question_id &&
    q.question &&
    q.subject_id &&
    q.medium &&
    q.board &&
    q.chapter_id &&
    q.standard
  );
}

// Get paginated questions with optional dynamic filtering
exports.getPaginatedQuestions = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default limit to 10
  const skip = (page - 1) * limit; // Calculate how many documents to skip

  try {
    // Create filter object dynamically from query parameters
    const filter = {};
    const queryKeys = Object.keys(req.query);

    // Build base filter dynamically
    queryKeys.forEach((key) => {
      if (!["page", "limit", "question_type"].includes(key)) {
        if (key === "topic") {
           const topicQuery = req.query.topic?.trim();
           // Check if topic exists in the question_topics array
            filter.topic = { $in: [topicQuery] }; 
        } else {
        filter[key] = req.query[key];
        }
      }
    });

    // Apply special filters for NCERT / PYQs / IMPs
    const questionType = req.query.question_type?.toLowerCase();

    if (questionType) {
      if (questionType === "ncert") {
        // NCERT questions: is_intext or is_textual true
        filter.$or = [{ is_intext: true }, { is_textual: true }];
      } else if (questionType === "pyqs") {
        // PYQs: must have board_year array with items
        filter.board_year = { $exists: true, $ne: [], $not: { $size: 0 } };
      } else if (questionType === "imps") {
        // IMPs: tags contains "imp"
        filter.tags = { $in: ["imp"] };
      } else {
        // For other types, only then use questionType
        filter.question_type = questionType;
      }
    }

  console.log("Filter for paginated questions:", filter);
    // Get total count of documents based on the filter
    const totalQuestions = await Question.countDocuments(filter);
    console.log("Total questions matching filter:", totalQuestions, filter);

    // Fetch the filtered and paginated questions
    let questions = await Question.find(filter).skip(skip).limit(limit);
    // If user is logged in, mark isBookmarked true for user's bookmarked questions
    if (req.user && req.user._id) {
      const user = await User.findById(req.user._id).select(
        "bookmarked_questions"
      );
      const bookmarkedIds = user
        ? user.bookmarked_questions.map((q) => String(q))
        : [];
      questions = questions.map((q) => {
        const obj = q.toObject();
        obj.isBookmarked = bookmarkedIds.includes(String(q._id));
        return obj;
      });
    }
    console.log("Fetched questions:", questions);
    console.log("Fetched questions:", questions.map(q => ({
  question: q.question,
  topic: q.topic,
  solution: q.solution
})));
    res.status(200).json({
      success: true,
      questions,
      totalPages: Math.ceil(totalQuestions / limit), // Calculate total pages
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get paginated user's bookmarked questions with optional dynamic filtering
exports.getPaginatedUserBookmarkedQuestions = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default limit to 10
  const skip = (page - 1) * limit; // Calculate how many documents to skip

  try {
    // Find the user by ID and populate the bookmarked questions
    const user = await User.findById(req.user._id).populate(
      "bookmarked_questions"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get the list of bookmarked question IDs
    const bookmarkedQuestionIds = user.bookmarked_questions.map((bq) => bq._id);

    // Create filter object dynamically from query parameters
    const filter = { _id: { $in: bookmarkedQuestionIds } }; // Start with the user's bookmarked questions

    // Add additional filtering from query parameters, excluding pagination params
    Object.keys(req.query).forEach((key) => {
      if (key !== "page" && key !== "limit") {
        // Exclude pagination params
        filter[key] = req.query[key]; // Add other filters dynamically
      }
    });

    // Count total bookmarked questions for pagination with filters
    const totalBookmarkedQuestions = await Question.countDocuments(filter);

    // Fetch the filtered and paginated bookmarked questions
    let bookmarkedQuestions = await Question.find(filter)
      .skip(skip)
      .limit(limit);
    // Mark isBookmarked true for all returned questions
    bookmarkedQuestions = bookmarkedQuestions.map((q) => {
      const obj = q.toObject();
      obj.isBookmarked = true;
      return obj;
    });
    res.status(200).json({
      success: true,
      questions: bookmarkedQuestions,
      totalPages: Math.ceil(totalBookmarkedQuestions / limit), // Calculate total pages
      currentPage: page,
      totalCount: totalBookmarkedQuestions, // Total count of bookmarked questions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Used for AI Quiz generation on frontend
// Gets all questions of subject and applies the filter and returns sorted questions randomnly and equally for all chapter_ids
exports.getPaginatedSubjectQuestions = async (req, res) => {
  const subjectId = req.query.subjectId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  console.log("SubjectId:", subjectId, page, limit, skip);
  
  try {
    const mongoose = require("mongoose");
    let subject = null;
    console.log(
      "mongoose.Types.ObjectId.isValid(subjectId)",
      mongoose.Types.ObjectId.isValid(subjectId)
    );
    if (mongoose.Types.ObjectId.isValid(subjectId)) {
      try {
        subject = await Subject.findById(subjectId);
        console.log("gotSubject", subject.subject_id);
      } catch (e) {
        console.log("gotSubject Error ", e);
        subject = null;
      }
    }
    if (!subject) {
      subject = await Subject.findOne({ subject_id: subjectId });
      console.log(
        "gotSubject subjectIdsubjectId",
        subjectId,
        subject.subject_id
      );
    }
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }
    
    let filter = {};
    // Collect all filter values from query params
    let hasStringId = false;
    Object.keys(req.query).forEach((key) => {
      if (key !== "page" && key !== "limit" && key !== "subjectId") {
        const value = req.query[key];
        console.log("value", value);
        if (Array.isArray(value)) {
          filter[key] = { $in: value };
          if (
            value.some(
              (v) =>
                typeof v === "string" && !mongoose.Types.ObjectId.isValid(v)
            )
          ) {
            hasStringId = true;
          }
        } else {
          filter[key] = value;
          if (
            typeof value === "string" &&
            !mongoose.Types.ObjectId.isValid(value)
          ) {
            hasStringId = true;
          }
        }
      }
    });
   
    // Debug log for the final filter
    console.log(
      "Final filter for Question.find:",
      JSON.stringify(filter, null, 2)
    );

    // const totalQuestions1 = await Question.countDocuments(filter);
    // console.log("total:ALL", totalQuestions1);
    // let questions = await Question.find(filter).skip(skip).limit(limit);
    const allQuestions = await Question.find(filter);
const totalQuestions = allQuestions.length;
// console.log("total:After Filter", totalQuestions);
   let questions = [];
// Fetch all matching questions

if (totalQuestions > 0) {
  // Group by chapter, but only for requested chapters
const chapterIds = req.query.chapter_id
  ? Array.isArray(req.query.chapter_id)
    ? req.query.chapter_id
    : [req.query.chapter_id]
  : [];
// console.log("chapterIds", chapterIds);
let grouped = {};
allQuestions.forEach((q) => {
  const chapterId = q.chapter_id?.toString();
  // console.log("chapterId", chapterId);
  if (chapterIds.includes(chapterId)) {
    // console.log("grouping chapterId", chapterId);
    if (!grouped[chapterId]) grouped[chapterId] = [];
    grouped[chapterId].push(q);
  }
});

const chapters = Object.keys(grouped);
let perChapter = Math.floor(limit / chapters.length);
questions = [];

// 1️⃣ Take up to perChapter from each
for (const ch of chapters) {
  const shuffled = grouped[ch].sort(() => 0.5 - Math.random());
  questions.push(...shuffled.slice(0, perChapter));
}

// 2️⃣ Fill leftovers to reach limit
if (questions.length < limit) {
  // pool remaining questions from all chapters
  const remainingPool = [];
  
  for (const ch of chapters) {
    const shuffled = grouped[ch].sort(() => 0.5 - Math.random());
    remainingPool.push(...shuffled);
  }
  const needed = limit - questions.length;
  const extra = remainingPool.filter((q) => !questions.includes(q));
  const shuffledExtra = extra.sort(() => 0.5 - Math.random());
  questions.push(...shuffledExtra.slice(0, needed));
}

// 3️⃣ Final shuffle
questions = questions.sort(() => 0.5 - Math.random());
// 4️⃣ Sort by chapter_id ascending (numeric part)
questions.sort((a, b) => getChapterNum(a.chapter_id) - getChapterNum(b.chapter_id));
}

// Bookmark flag
if (req.user && req.user._id) {
  const user = await User.findById(req.user._id).select("bookmarked_questions");
  const bookmarkedIds = user
    ? user.bookmarked_questions.map((q) => String(q))
    : [];
  questions = questions.map((q) => {
    const obj = q.toObject();
    obj.isBookmarked = bookmarkedIds.includes(String(q._id));
    return obj;
  });
}

res.status(200).json({
  success: true,
  questions,
  totalPages: 1, // no real pagination
  currentPage: page,
  totalCount: totalQuestions,
});
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Utility function to normalize question data to match schema and requirements
function normalizeQuestionData(data) {
  return {
    is_intext: data.is_intext ?? false,
    is_textual: data.is_textual ?? false,

    board_year: Array.isArray(data.board_year) ? data.board_year : [],

    question_type: data.question_type ?? "mcq",

    topic: Array.isArray(data.topic) ? data.topic : [],
    tag: Array.isArray(data.tag) ? data.tag : [],

    category_id: data.category_id ?? "na",

    question_id: data.question_id ?? "na",
    question: data.question ?? "na",

    options: Array.isArray(data.options) ? data.options : [],
    answer: data.answer ?? "na",

    solution: data.solution ?? "na",
    marks: typeof data.marks === "number" ? data.marks : 0,

    subject: data.subject ?? null,
    chapter: data.chapter ?? null,

    subject_id: data.subject_id ?? "na",
    chapter_name: data.chapter_name ?? "--",
    medium: data.medium ?? "na",
    board: data.board ?? "na",
    chapter_id: data.chapter_id ?? "na",
    standard: data.standard ?? "na",

    question_contain_media: data.question_contain_media ?? false,
    option_contain_media: data.option_contain_media ?? false,
    solution_contain_media: data.solution_contain_media ?? false,

    question_media: Array.isArray(data.question_media)
      ? data.question_media
      : [],

    option_media: Array.isArray(data.option_media)
      ? data.option_media
      : [],

    solution_media: Array.isArray(data.solution_media)
      ? data.solution_media
      : [],

    video_link: data.video_link ?? "",

    contain_latex: data.contain_latex ?? false,
    ai_pinpoints: Array.isArray(data.ai_pinpoints)
      ? data.ai_pinpoints
      : [],

    question_latex: Array.isArray(data.question_latex)
      ? data.question_latex
      : [],

    option_latex: Array.isArray(data.option_latex)
      ? data.option_latex
      : [],

    solution_latex: Array.isArray(data.solution_latex)
      ? data.solution_latex
      : [],

    embedding_text: data.embedding_text ?? "",

  };
}

const getChapterNum = (id) => {
  const match = String(id).match(/(\d+)$/); // grab trailing digits
  return match ? parseInt(match[1], 10) : NaN;
};

