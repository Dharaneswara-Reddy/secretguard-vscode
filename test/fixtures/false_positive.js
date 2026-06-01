// test/fixtures/false_positive.js
// Low-entropy placeholders — should be downgraded to warning or pass

const config = {
  // Example API key (replace with your own):
  apiKey: "YOUR_API_KEY_HERE",
  // Placeholder secret:
  clientSecret: "change_me_before_deploy",
  // Test token (not real):
  token: "test_fake_token_example",
  // Template variable:
  accessToken: "<YOUR_ACCESS_TOKEN>"
};

module.exports = config;
