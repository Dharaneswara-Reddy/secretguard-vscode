// test/fixtures/clean.js
// This file should produce ZERO findings

const config = {
  appName: 'MyApp',
  version: '1.0.0',
  debug: false,
  apiBaseUrl: 'https://api.example.com'
};

function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { config, greet };
