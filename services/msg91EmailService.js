const https = require("https");
const http = require("http");
const { URL } = require("url");

const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Format integration ID appropriately (numeric or string)
 * @param {string|number} rawId
 * @returns {number|string}
 */
function parseIntegrationId(rawId) {
  if (rawId === undefined || rawId === null || rawId === "") {
    return 859;
  }
  const num = Number(rawId);
  return Number.isInteger(num) && num > 0 ? num : String(rawId).trim();
}

/**
 * Send an email via MSG91 Email Connections over HTTPS
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} [options.name="User"] - Recipient name
 * @param {Object} [options.variables={}] - Template variables (e.g., { otp: "123456" })
 * @param {string} [options.templateId] - MSG91 template ID (defaults to MSG91_EMAIL_TEMPLATE_ID)
 * @param {number|string} [options.integrationId] - MSG91 integration ID (defaults to MSG91_EMAIL_INTEGRATION_ID or 859)
 * @param {number} [options.timeoutMs=10000] - Request timeout in milliseconds
 * @returns {Promise<{ success: boolean, data: any, message: string }>}
 */
async function sendEmailViaMSG91Connection(options) {
  const {
    to,
    name = "User",
    variables = {},
    templateId = process.env.MSG91_EMAIL_TEMPLATE_ID,
    integrationId = process.env.MSG91_EMAIL_INTEGRATION_ID || 859,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  if (!to || typeof to !== "string") {
    throw new Error("Recipient email ('to') is required and must be a valid email address.");
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) {
    throw new Error(
      "MSG91_AUTH_KEY is not defined in environment variables. Cannot send email."
    );
  }

  if (!templateId) {
    throw new Error(
      "MSG91_EMAIL_TEMPLATE_ID is not configured. MSG91 Send Email API requires a registered template ID."
    );
  }

  const resolvedIntegrationId = parseIntegrationId(integrationId);

  // Per MSG91 Email Connections documentation:
  // - Replace "domain" with "integration_id"
  // - Omit "from" object as MSG91 automatically binds the connected Gmail account
  const payload = {
    recipients: [
      {
        to: [
          {
            name: name || "User",
            email: to.trim().toLowerCase(),
          },
        ],
        variables: {
          ...variables,
          name: name || "User",
        },
      },
    ],
    integration_id: resolvedIntegrationId,
    template_id: templateId,
  };

  const payloadString = JSON.stringify(payload);
  const endpointUrl =
    process.env.MSG91_SEND_EMAIL_URL || "https://control.msg91.com/api/v5/email/send";
  const targetUrl = new URL(endpointUrl);
  const client = targetUrl.protocol === "http:" ? http : https;

  return new Promise((resolve, reject) => {
    const reqOptions = {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === "http:" ? 80 : 443),
      path: targetUrl.pathname + targetUrl.search,
      method: "POST",
      headers: {
        "authkey": authKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(payloadString),
      },
      timeout: timeoutMs,
    };

    const req = client.request(reqOptions, (res) => {
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        let parsedData = null;
        try {
          parsedData = JSON.parse(responseBody);
        } catch (_) {
          parsedData = { raw: responseBody };
        }

        const statusCode = res.statusCode || 500;
        const isHttpSuccess = statusCode >= 200 && statusCode < 300;
        const hasMsg91Error =
          parsedData &&
          (parsedData.hasError === true ||
            parsedData.status === "fail" ||
            parsedData.status === "error" ||
            Boolean(parsedData.errors && Object.keys(parsedData.errors).length > 0));

        if (!isHttpSuccess || hasMsg91Error) {
          let errorDetails = "";
          if (
            parsedData &&
            parsedData.errors &&
            typeof parsedData.errors === "object" &&
            Object.keys(parsedData.errors).length > 0
          ) {
            errorDetails = `: ${JSON.stringify(parsedData.errors)}`;
          }

          const baseMsg = parsedData?.message || `HTTP status ${statusCode}`;
          const errorMsg = `${baseMsg}${errorDetails}`;

          console.error(
            `[MSG91 Email Connection Error] HTTP ${statusCode}: ${errorMsg}`
          );

          return reject(
            new Error(`Failed to deliver email via MSG91: ${errorMsg}`)
          );
        }

        console.log(
          `[MSG91 Email Connection] Successfully dispatched email to: ${to.replace(
            /(?<=^.{2}).+(?=@)/,
            "***"
          )}`
        );

        return resolve({
          success: true,
          data: parsedData,
          message: "Email sent successfully via MSG91 Connection",
        });
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(
        new Error(
          `Request to MSG91 Send Email API timed out after ${timeoutMs}ms.`
        )
      );
    });

    req.on("error", (err) => {
      reject(new Error(`Network error calling MSG91 Send Email API: ${err.message}`));
    });

    req.write(payloadString);
    req.end();
  });
}

/**
 * Send an OTP verification email using MSG91 Email Connections
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} [name="User"] - Recipient name
 * @param {number} [expiryMinutes=5] - OTP validity in minutes
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function sendOTPEmail(email, otp, name = "User", expiryMinutes = 5) {
  try {
    const result = await sendEmailViaMSG91Connection({
      to: email,
      name,
      variables: {
        otp: String(otp),
        VAR1: String(otp),
        OTP: String(otp),
        expiry: `${expiryMinutes} minutes`,
      },
    });

    return {
      success: true,
      message: "OTP sent successfully via MSG91 Gmail connection",
      data: result.data,
    };
  } catch (error) {
    console.error("[sendOTPEmail Error]:", error.message);
    return {
      success: false,
      message: error.message || "Failed to send OTP email",
    };
  }
}

module.exports = {
  sendEmailViaMSG91Connection,
  sendOTPEmail,
  parseIntegrationId,
};
