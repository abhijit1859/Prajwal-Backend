const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const {
  parseIntegrationId,
  sendEmailViaMSG91Connection,
} = require("../services/msg91EmailService");

test("parseIntegrationId handles numbers, strings, and fallback", () => {
  assert.equal(parseIntegrationId(859), 859);
  assert.equal(parseIntegrationId("859"), 859);
  assert.equal(parseIntegrationId(""), 859);
  assert.equal(parseIntegrationId(null), 859);
  assert.equal(parseIntegrationId(undefined), 859);
  assert.equal(parseIntegrationId("custom-integration-id"), "custom-integration-id");
});

test("sendEmailViaMSG91Connection validates required inputs", async () => {
  // Missing recipient
  await assert.rejects(
    () => sendEmailViaMSG91Connection({ to: "" }),
    /Recipient email \('to'\) is required/
  );

  // Missing AUTH_KEY
  const origAuth = process.env.MSG91_AUTH_KEY;
  delete process.env.MSG91_AUTH_KEY;
  try {
    await assert.rejects(
      () => sendEmailViaMSG91Connection({ to: "test@example.com", templateId: "otp_test" }),
      /MSG91_AUTH_KEY is not defined/
    );
  } finally {
    process.env.MSG91_AUTH_KEY = origAuth;
  }

  // Missing templateId
  const origTemplate = process.env.MSG91_EMAIL_TEMPLATE_ID;
  delete process.env.MSG91_EMAIL_TEMPLATE_ID;
  try {
    await assert.rejects(
      () =>
        sendEmailViaMSG91Connection({
          to: "test@example.com",
          templateId: undefined,
        }),
      /MSG91_EMAIL_TEMPLATE_ID is not configured/
    );
  } finally {
    process.env.MSG91_EMAIL_TEMPLATE_ID = origTemplate;
  }
});

test("sendEmailViaMSG91Connection formats payload with integration_id, omits from, and parses success response", async () => {
  let capturedRequest = null;

  // Spin up a local mock HTTP server
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      capturedRequest = {
        method: req.method,
        path: req.url,
        headers: req.headers,
        body: JSON.parse(body),
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "success",
          message: "Email queued successfully",
          data: { request_id: "req_123456" },
        })
      );
    });
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const originalUrl = process.env.MSG91_SEND_EMAIL_URL;
  const originalAuth = process.env.MSG91_AUTH_KEY;
  process.env.MSG91_SEND_EMAIL_URL = `http://127.0.0.1:${port}/api/v5/email/send`;
  process.env.MSG91_AUTH_KEY = "test_auth_key_123";

  try {
    const result = await sendEmailViaMSG91Connection({
      to: "recipient@example.com",
      name: "John Doe",
      variables: { otp: "492015", expiry: "5 minutes" },
      templateId: "otp_template_v1",
      integrationId: "859",
      timeoutMs: 3000,
    });

    assert.equal(result.success, true);
    assert.equal(result.data.status, "success");

    // Verify exact MSG91 Email Connections contract
    assert.ok(capturedRequest);
    assert.equal(capturedRequest.method, "POST");
    assert.equal(capturedRequest.path, "/api/v5/email/send");
    assert.equal(capturedRequest.headers["authkey"], "test_auth_key_123");
    assert.equal(capturedRequest.headers["content-type"], "application/json");

    // Must use integration_id and MUST NOT include "from" or "domain"
    assert.equal(capturedRequest.body.integration_id, 859);
    assert.equal(capturedRequest.body.template_id, "otp_template_v1");
    assert.equal(capturedRequest.body.from, undefined);
    assert.equal(capturedRequest.body.domain, undefined);

    // Verify recipient & variables
    assert.equal(capturedRequest.body.recipients.length, 1);
    assert.equal(capturedRequest.body.recipients[0].to[0].email, "recipient@example.com");
    assert.equal(capturedRequest.body.recipients[0].variables.otp, "492015");
  } finally {
    server.close();
    process.env.MSG91_SEND_EMAIL_URL = originalUrl;
    process.env.MSG91_AUTH_KEY = originalAuth;
  }
});

test("sendEmailViaMSG91Connection properly catches MSG91 422 integration error and does not falsely claim success", async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(422, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "fail",
        hasError: true,
        message: "The given data is invalid",
        errors: {
          integration_id: ["The integration id does not belong to any of your integrations."],
        },
      })
    );
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const originalUrl = process.env.MSG91_SEND_EMAIL_URL;
  const originalAuth = process.env.MSG91_AUTH_KEY;
  process.env.MSG91_SEND_EMAIL_URL = `http://127.0.0.1:${port}/api/v5/email/send`;
  process.env.MSG91_AUTH_KEY = "test_auth_key_123";

  try {
    await assert.rejects(
      () =>
        sendEmailViaMSG91Connection({
          to: "user@example.com",
          templateId: "global_otp",
          integrationId: 859,
        }),
      (err) => {
        assert.match(err.message, /Failed to deliver email via MSG91/);
        assert.match(err.message, /integration_id/);
        return true;
      }
    );
  } finally {
    server.close();
    process.env.MSG91_SEND_EMAIL_URL = originalUrl;
    process.env.MSG91_AUTH_KEY = originalAuth;
  }
});

test("sendEmailViaMSG91Connection respects request timeout", async () => {
  const server = http.createServer((req, res) => {
    // Deliberately delay response beyond timeout
    setTimeout(() => {
      res.writeHead(200);
      res.end("{}");
    }, 500);
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const originalUrl = process.env.MSG91_SEND_EMAIL_URL;
  const originalAuth = process.env.MSG91_AUTH_KEY;
  process.env.MSG91_SEND_EMAIL_URL = `http://127.0.0.1:${port}/api/v5/email/send`;
  process.env.MSG91_AUTH_KEY = "test_auth_key_123";

  try {
    await assert.rejects(
      () =>
        sendEmailViaMSG91Connection({
          to: "user@example.com",
          templateId: "otp_test",
          timeoutMs: 100, // Very low timeout
        }),
      /timed out/
    );
  } finally {
    server.close();
    process.env.MSG91_SEND_EMAIL_URL = originalUrl;
    process.env.MSG91_AUTH_KEY = originalAuth;
  }
});
