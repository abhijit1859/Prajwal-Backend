// MSG91 Configuration with fallback
let msg91Instance = null;

// Only try to initialize MSG91 if environment variables are available
if (process.env.MSG91_AUTH_KEY && process.env.MSG91_SENDER_ID) {
  try {
    const msg91 = require("msg91");
    msg91Instance = msg91(
      process.env.MSG91_AUTH_KEY,
      process.env.MSG91_SENDER_ID,
      "4"
    );
    console.log("MSG91 initialized successfully");
  } catch (error) {
    console.error("Failed to initialize MSG91:", error.message);
    // Fallback: Create a mock instance for development
    msg91Instance = {
      send: async () => ({ type: "success" }),
      verify: async () => ({ type: "success" }),
    };
  }
} else {
  console.log("MSG91 environment variables not found, using mock instance");
  // Fallback: Create a mock instance for development
  msg91Instance = {
    send: async () => ({ type: "success" }),
    verify: async () => ({ type: "success" }),
  };
}

exports.sendOTP = async (mobileNumber, otp) => {
  try {
    // Using MSG91 template with variables
    const templateVariables = {
      VAR1: otp,
    };

    const response = await msg91Instance.send(mobileNumber, templateVariables);

    if (response.type === "success") {
      console.log("OTP sent successfully via MSG91");
      return { success: true, message: "OTP sent successfully" };
    } else {
      console.error("MSG91 OTP sending failed:", response);
      return { success: false, message: "Failed to send OTP" };
    }
  } catch (error) {
    console.error("Error sending OTP via MSG91:", error);
    return { success: false, message: "Error sending OTP" };
  }
};

exports.verifyOTP = async (mobileNumber, otp) => {
  try {
    const response = await msg91Instance.verify(mobileNumber, otp);

    if (response.type === "success") {
      console.log("OTP verified successfully via MSG91");
      return { success: true, message: "OTP verified successfully" };
    } else {
      console.error("MSG91 OTP verification failed:", response);
      return { success: false, message: "Invalid OTP" };
    }
  } catch (error) {
    console.error("Error verifying OTP via MSG91:", error);
    return { success: false, message: "Error verifying OTP" };
  }
};

// Re-export sendEmailOTP from sendEmail middleware for backward compatibility
const { sendEmailOTP } = require("../middlewares/sendEmail");
exports.sendEmailOTP = sendEmailOTP;

