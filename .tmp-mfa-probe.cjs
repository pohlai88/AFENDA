const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Pool } = require("pg");
const { generate, NobleCryptoPlugin, ScureBase32Plugin } = require("otplib");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv(path.resolve(process.cwd(), ".env"));
loadEnv(path.resolve(process.cwd(), ".env.local"));

const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_MIGRATIONS;
const challengeSecret = process.env.AUTH_CHALLENGE_SECRET;
if (!databaseUrl) throw new Error("DATABASE_URL missing");
if (!challengeSecret) throw new Error("AUTH_CHALLENGE_SECRET missing");

(async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const userRes = await pool.query(
      "select p.id, p.email, m.totp_secret from iam_principal p join iam_principal_mfa m on m.principal_id = p.id where p.email = $1 limit 1",
      ["admin@demo.afenda"],
    );
    if (userRes.rows.length === 0) throw new Error("demo principal with MFA not found");
    const user = userRes.rows[0];

    const mfaToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHmac("sha256", challengeSecret).update(mfaToken).digest("hex");

    await pool.query(
      `insert into auth_challenges (type, token_hash, email, portal, user_id, max_attempts, expires_at)
       values ('mfa', $1, $2, 'app', $3, 5, now() + interval '10 minutes')`,
      [tokenHash, user.email, user.id],
    );

    const code = await generate({
      secret: user.totp_secret,
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
      algorithm: "sha1",
      digits: 6,
      period: 30,
      epoch: Date.now(),
      epochTolerance: 1,
    });

    const res = await fetch("http://localhost:3001/v1/auth/verify-mfa-challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mfaToken, code }),
    });
    const json = await res.json();

    console.log("Generated code:", code);
    console.log("verify status:", res.status);
    console.log("verify body:", JSON.stringify(json, null, 2));
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error("MFA probe failed:", e?.message || e);
  process.exit(1);
});
