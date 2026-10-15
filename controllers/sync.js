const Subject = require("../models/subject");
const { sendEmail } = require("../middlewares/sendEmail");
const Question = require("../models/question");
const User = require("../models/user");
const Preference = require("../models/preference");
const fs = require("fs");
const path = require("path");

//! Sync Subjects with Questions
exports.syncSubjectsWithQuestions = async (req, res) => {
  try {
    // Fetch all subjects and questions
    const subjects = await Subject.find();
    const questions = await Question.find();

    let logDetails = [];

    // Iterate through each subject
    for (let subject of subjects) {
      // Filter out questions matching the subject's board, medium, subject, and standard (case-insensitive comparison)
      const matchingQuestions = questions.filter(
        (q) =>
          q.board.toLowerCase() === subject.board.toLowerCase() &&
          q.medium.toLowerCase() === subject.medium.toLowerCase() &&
          q.subject.toLowerCase() === subject.subject_id.toLowerCase() &&
          q.standard.toString().toLowerCase() ===
            subject.standard.toString().toLowerCase()
      );

      // Create a Set of matching question IDs
      const matchingQuestionIds = new Set(
        matchingQuestions.map((q) => q._id.toString())
      );

      // Existing question IDs in the subject
      const existingQuestionIds = new Set(subject.questions.map((q) => q));

      let questionsAdded = [];
      let questionsRemoved = [];

      // Identify questions to be added
      for (let qId of matchingQuestionIds) {
        if (!existingQuestionIds.has(qId)) {
          questionsAdded.push(qId);
          subject.questions.push(qId);
        }
      }

      // Identify questions to be removed
      subject.questions = subject.questions.filter((q) => {
        const qId = q.toString();
        if (!matchingQuestionIds.has(qId)) {
          questionsRemoved.push(qId);
          return false;
        }
        return true;
      });

      // Calculate and update details
      subject.details.total_mcq_questions = matchingQuestions.filter(
        (q) => q.questionType.toLowerCase() === "mcq"
      ).length;
      subject.details.total_blank_questions = matchingQuestions.filter(
        (q) => q.questionType.toLowerCase() === "blank"
      ).length;
      subject.details.total_tf_questions = matchingQuestions.filter(
        (q) => q.questionType.toLowerCase() === "true_false"
      ).length;
      subject.details.total_sa_questions = matchingQuestions.filter(
        (q) => q.questionType.toLowerCase() === "sa"
      ).length;
      subject.details.total_owa_questions = matchingQuestions.filter(
        (q) => q.questionType.toLowerCase() === "owa"
      ).length;
      subject.details.total_match_questions = matchingQuestions.filter(
        (q) => q.questionType.toLowerCase() === "match"
      ).length;
      subject.details.total_balance_questions = matchingQuestions.filter(
        (q) => q.questionType.toLowerCase() === "balance"
      ).length;
      subject.details.total_whoami_questions = matchingQuestions.filter(
        (q) => q.questionType.toLowerCase() === "whoami"
      ).length;
      subject.details.total_2m_questions = matchingQuestions.filter(
        (q) => q.questionType.toLowerCase() === "2m"
      ).length;
      subject.details.total_3m_questions = matchingQuestions.filter(
        (q) => q.questionType.toLowerCase() === "3m"
      ).length;
      subject.details.total_4m_questions = matchingQuestions.filter(
        (q) => q.questionType.toLowerCase() === "4m"
      ).length;

      subject.last_updated_at = new Date();
      await subject.save();
    }

    res.status(200).json({ success: true, logDetails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//! Sync Users' Bookmarked Questions
exports.syncUserBookmarkedQuestions = async (req, res) => {
  try {
    // Fetch all users and questions
    const users = await User.find();
    const questions = await Question.find();

    // Create a Set of existing question IDs for quick lookup
    const existingQuestionIds = new Set(questions.map((q) => q._id.toString()));

    let logDetails = [];

    // Iterate through each user
    for (let user of users) {
      let bookmarkedQuestionsRemoved = [];

      // Filter out non-existing bookmarked questions
      user.bookmarked_questions = user.bookmarked_questions.filter((bq) => {
        const bqId = bq.toString();
        if (!existingQuestionIds.has(bqId)) {
          bookmarkedQuestionsRemoved.push(bqId);
          return false; // Remove if the question no longer exists
        }
        return true;
      });

      // Save user only if there are changes (bookmarked questions removed)
      if (bookmarkedQuestionsRemoved.length > 0) {
        await user.save();

        logDetails.push({
          userId: user._id,
          bookmarkedQuestionsRemoved,
        });
      }
    }

    // Return log details
    res.status(200).json({
      success: true,
      message: "User bookmarked questions synchronized successfully",
      logDetails, // Detailed log of changes made
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// //! Sync Users' Purchased Courses
// exports.syncPaidCoursesWithUsers = async (req, res) => {
//     try {
//         // Fetch all users and populate purchased courses
//         const users = await User.find().populate("purchasedCourses.course");
//         const courses = await Course.find();

//         if (!users.length) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No users found.",
//             });
//         }

//         if (!courses.length) {
//             return res.status(404).json({
//                 success: false,
//                 message: "No courses found.",
//             });
//         }

//         let logDetails = [];
//         let totalSyncedCourses = 0;

//         // Iterate through each user
//         for (let user of users) {
//             const purchasedCourses = user.purchasedCourses.map(pc => pc.course);

//             if (!purchasedCourses.length) continue; // Skip users without purchases

//             // Extract unique medium, board, and standard from purchased courses
//             const courseCriteria = purchasedCourses.map(course => ({
//                 medium: course.medium,
//                 board: course.board,
//                 standard: course.standard
//             }));

//             // Remove duplicates
//             const uniqueCriteria = Array.from(new Set(courseCriteria.map(JSON.stringify))).map(JSON.parse);

//             // Find all matching courses not yet purchased
//             const matchingCourses = await Course.find({
//                 $or: uniqueCriteria,
//                 _id: { $nin: purchasedCourses.map(course => course._id) }
//             });

//             if (!matchingCourses.length) continue; // No new courses to sync

//             // Prepare new purchases
//             const newPurchases = matchingCourses.map(course => ({
//                 course: course._id,
//                 purchasedAt: Date.now(),
//                 validTill: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1-year validity
//             }));

//             // Add and save new courses
//             user.purchasedCourses.push(...newPurchases);
//             await user.save();

//             logDetails.push({
//                 userId: user._id,
//                 newlyAddedCourses: newPurchases.map(pc => pc.course)
//             });

//             totalSyncedCourses += newPurchases.length;
//         }

//         return res.status(200).json({
//             success: true,
//             message: `Sync complete: ${totalSyncedCourses} courses added across all users.`,
//             logDetails, // Logs of updates per user
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "An error occurred during syncing.",
//             error: error.message,
//         });
//     }
// };

//! Sync Users' Purchased Courses
exports.syncPaidCoursesWithUsers = async (req, res) => {
  try {
    // Pre-clean: Remove null course references from purchasedCourses
    await User.updateMany(
      { "purchasedCourses.course": null },
      { $pull: { purchasedCourses: { course: null } } }
    );

    // Fetch all users and populate purchased courses
    const users = await User.find().populate("purchasedCourses.course");
    const courses = await Course.find();

    if (!users.length || !courses.length) {
      return res.status(404).json({
        success: false,
        message: !users.length ? "No users found." : "No courses found.",
      });
    }

    let logDetails = [];
    let totalSyncedCourses = 0;

    // Iterate through each user
    for (let user of users) {
      // Extract and filter purchased courses
      const purchasedCourses = user.purchasedCourses
        .map((pc) => pc.course)
        .filter(
          (course) => course?.medium && course?.board && course?.standard
        );

      if (!purchasedCourses.length) continue;

      // Extract unique medium, board, and standard from purchased courses
      const uniqueCriteria = Array.from(
        new Set(
          purchasedCourses.map((course) =>
            JSON.stringify({
              medium: course.medium,
              board: course.board,
              standard: course.standard,
            })
          )
        )
      ).map(JSON.parse);

      if (!uniqueCriteria.length) continue;

      // Find all matching courses not yet purchased
      const matchingCourses = await Course.find({
        $or: uniqueCriteria,
        _id: { $nin: purchasedCourses.map((course) => course._id) },
      });

      if (!matchingCourses.length) continue;

      // Prepare new purchases
      const newPurchases = matchingCourses.map((course) => ({
        course: course._id,
        purchasedAt: new Date(),
        validTill: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1-year validity
      }));

      // Add and save new courses
      user.purchasedCourses.push(...newPurchases);
      await user.save();

      logDetails.push({
        userId: user._id,
        newlyAddedCourses: newPurchases.map((pc) => pc.course),
      });

      totalSyncedCourses += newPurchases.length;
    }

    return res.status(200).json({
      success: true,
      message: `Sync complete: ${totalSyncedCourses} courses added across all users.`,
      logDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred during syncing.",
      error: error.message,
    });
  }
};

//! Clear Uploads Directory
exports.clearUploadsDirectory = (req, res) => {
  const uploadsPath = path.join(__dirname, "../uploads"); // Path to uploads folder

  fs.readdir(uploadsPath, (err, files) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Error reading uploads directory",
        error: err.message,
      });
    }

    // Create an array of delete promises
    const deletePromises = files.map((file) => {
      const filePath = path.join(uploadsPath, file);
      return new Promise((resolve, reject) => {
        fs.stat(filePath, (err, stats) => {
          if (err) return reject(err);

          // Check if it's a file or a directory
          if (stats.isDirectory()) {
            fs.rmdir(filePath, { recursive: true }, (err) => {
              if (err) return reject(err);
              resolve();
            });
          } else {
            fs.unlink(filePath, (err) => {
              if (err) return reject(err);
              resolve();
            });
          }
        });
      });
    });

    // Wait for all delete promises to resolve
    Promise.all(deletePromises)
      .then(() => {
        res.status(200).json({
          success: true,
          message: "Uploads directory cleared successfully",
        });
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          message: "Error clearing uploads directory",
          error: error.message,
        });
      });
  });
};

//! Clear User Preferences for Non-existing Users
exports.clearNonExistingUserPreferences = async (req, res) => {
  try {
    // Fetch all active user IDs
    const activeUsers = await User.find().select("_id");
    const activeUserIds = new Set(
      activeUsers.map((user) => user._id.toString())
    );

    // Fetch all user preferences
    const allPreferences = await Preference.find();

    const preferencesToDelete = [];

    // Check each preference and see if the user exists
    for (let preference of allPreferences) {
      if (!activeUserIds.has(preference.user.toString())) {
        preferencesToDelete.push(preference._id); // Store preference IDs for deletion
      }
    }

    // Delete preferences that belong to non-existing users
    if (preferencesToDelete.length > 0) {
      await Preference.deleteMany({ _id: { $in: preferencesToDelete } });
    }

    res.status(200).json({
      success: true,
      message: "User preferences for non-existing users cleared successfully.",
      deletedCount: preferencesToDelete.length, // Return the count of deleted preferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error clearing user preferences",
      error: error.message,
    });
  }
};
