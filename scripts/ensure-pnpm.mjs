// Blocks npm/yarn from installing this project (its lockfile is pnpm's).
// npm_config_user_agent looks like "pnpm/11.25.0 npm/? node/v24.14.1 linux x64".
const agent = process.env.npm_config_user_agent ?? "";

if (!agent.startsWith("pnpm/")) {
  console.error(
    `This project uses pnpm (via corepack). Got: ${agent || "unknown package manager"}.\n` +
      "Run: corepack enable && pnpm install",
  );
  process.exit(1);
}
