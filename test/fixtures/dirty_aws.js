// test/fixtures/dirty_aws.js
// Should trigger AWS key rule (high-entropy key)

const AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7REALKEY";
const AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYREALKEYXXXX";

const config = {
  region: 'us-east-1',
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY
};

module.exports = config;
