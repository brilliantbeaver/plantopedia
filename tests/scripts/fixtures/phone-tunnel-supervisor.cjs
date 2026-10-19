const { spawn } = require("node:child_process");
const { superviseTunnel } = require("../../../scripts/dev-phone-tunnel.cjs");
superviseTunnel("http://127.0.0.1:3001", (_command, _args, options) =>
  spawn(
    process.execPath,
    [
      "-e",
      `
    require('node:fs').writeFileSync(process.env.TUNNEL_TEST_PID_FILE, String(process.pid));
    process.on('SIGTERM', () => {});
    process.stdout.write('https://fixture-tunnel.trycloudflare.com');
    setInterval(() => {}, 1000);
  `,
    ],
    options,
  ),
);
