import { createServer } from './app.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const { server, close } = createServer();

server.listen(PORT, HOST, () => {
  console.log(`Citadels is open for business at http://localhost:${PORT}`);
});

let closing = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    if (closing) return;
    closing = true;
    console.log(`\n${signal} received, closing the city gates…`);
    const force = setTimeout(() => process.exit(0), 5000);
    force.unref();
    await close();
    process.exit(0);
  });
}
