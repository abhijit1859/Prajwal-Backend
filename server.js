require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/database");
connectDatabase();
app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
