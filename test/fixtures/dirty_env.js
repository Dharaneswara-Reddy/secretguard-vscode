// test/fixtures/dirty_env.js
// The FILENAME .env should trigger file rules (tested in scanner.test.ts by path)
// Content simulates leaked .env secrets — values are synthetic test data

DATABASE_URL="postgresql://admin:SuperSecretP@ss123@db.prod.myapp.com:5432/maindb"
SECRET_KEY="sUp3r$ecret!Key#2024xYzAbC"
// Stripe key intentionally split so this test fixture doesn't trigger push protection scanners
STRIPE_SECRET_KEY="sk_live" + "_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456"
