const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { scheduleSyncJob } = require("./maintenance/scheduler");
const cors = require("cors");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
  require("dotenv").config({ path: "./config/.env" });
}
 const { initializeModel } = require("./controllers/aiSearch");
  initializeModel().catch((err) => console.error("Model init error", err));

//using middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(cors());

// Importing routes
const user = require("./routes/user");
const payment = require("./routes/payment");
const question = require("./routes/question");
const subject = require("./routes/subject");
const preference = require("./routes/preference");
const purchase = require("./routes/purchase");
const sync = require("./routes/sync");
const coupon = require("./routes/coupon");
const connect = require("./routes/connect");
const mindMap = require("./routes/mindMap");
const chapter = require("./routes/chapter");
const hotLine = require("./routes/hotLine");
const practicePaper = require("./routes/practicePaper");
const searchRoutes = require("./routes/search");
const practiceSubject = require("./routes/practiceSubject");


const message = require("./routes/message");
const video = require("./routes/video");
const note = require("./routes/note");

// using routes
//app.use("/api/v1", post);
app.use("/api/v1", user);
app.use("/api/v1", payment);
//app.use("/api/v1", wishList);
app.use("/api/v1", question);
app.use("/api/v1", subject);
app.use("/api/v1", preference);
app.use("/api/v1", purchase);
app.use("/api/v1", sync);
app.use("/api/v1", coupon);
app.use("/api/v1", connect);
app.use("/api/v1", mindMap);
app.use("/api/v1", chapter);
app.use("/api/v1", message);
app.use("/api/v1", video);
app.use("/api/v1", note);
app.use("/api/v1", hotLine);
app.use("/api/v1", practiceSubject);
app.use("/api/v1", practicePaper);
app.use("/api/v1", searchRoutes);



// Start the scheduled job
scheduleSyncJob();

module.exports = app;
