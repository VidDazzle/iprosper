import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

const ROBOTS_TXT = "User-agent: *\nDisallow: /private\n";

const PAGES: Record<string, string> = {
  "/": `<html><head><title>Sunrise Roofing | Home</title>
    <style>.hero { color: #ff6600; font-family: 'Roboto Slab', serif; }</style>
    </head><body>
    <img src="/img/logo.png" alt="logo" class="logo">
    <h1>Roof Repair</h1>
    <a href="/services">Services</a>
    <a href="/private">Private</a>
    </body></html>`,
  "/services": `<html><head><title>Services</title></head><body>
    <h2>Solar Installation</h2>
    <a href="/">Home</a>
    </body></html>`,
  "/private": `<html><body><h1>Should never be fetched</h1></body></html>`,
};

export async function startFixtureServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    if (req.url === "/robots.txt") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(ROBOTS_TXT);
      return;
    }
    const body = req.url && PAGES[req.url];
    if (body) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(body);
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}
