// test/fixtures/dirty_github.js
// Should trigger GitHub Personal Access Token rule

const GITHUB_TOKEN = "ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890";

async function getRepos() {
  const response = await fetch('https://api.github.com/user/repos', {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
  });
  return response.json();
}

module.exports = { getRepos };
