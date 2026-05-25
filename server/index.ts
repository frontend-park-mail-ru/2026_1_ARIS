import express, { NextFunction, Request, Response } from "express";
import http from "http";
import https from "https";
import net from "net";
import fs from "fs";
import morgan from "morgan";
import path from "path";

const app = express();
const publicDir = path.resolve(__dirname, "..", "public");
const distDir = path.resolve(__dirname, "..", "dist");
const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3001);

app.disable("x-powered-by");
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  next();
});

function setCacheHeaders(res: Response, filePath: string): void {
  if (filePath.endsWith(".html")) {
    res.setHeader("Cache-Control", "no-cache");
  } else if (/\.[0-9a-f]{8,}\.(js|css)$/i.test(filePath)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
}

// Serve pre-compressed .gz files when the client accepts gzip encoding.
// Falls through to express.static for files without a .gz counterpart.
app.use((req: Request, res: Response, next: NextFunction) => {
  const acceptEncoding = req.headers["accept-encoding"] ?? "";
  if (!acceptEncoding.includes("gzip") || req.method !== "GET") {
    next();
    return;
  }

  const relativePath = req.path.replace(/^\//, "");
  const gzPath = path.resolve(distDir, `${relativePath}.gz`);

  if (!fs.existsSync(gzPath)) {
    next();
    return;
  }

  const originalPath = path.resolve(distDir, relativePath);
  setCacheHeaders(res, originalPath);
  res.type(path.extname(relativePath));
  res.setHeader("Content-Encoding", "gzip");
  res.setHeader("Vary", "Accept-Encoding");
  res.sendFile(gzPath);
});

app.use(
  express.static(distDir, {
    setHeaders: setCacheHeaders,
  }),
);
app.use(express.static(publicDir));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    commit: process.env.BUILD_COMMIT || "unknown",
    version: process.env.npm_package_version || "unknown",
    timestamp: new Date().toISOString(),
  });
});

function proxyHttpRequest(req: Request, res: Response, errorMessage = "Backend proxy error"): void {
  const targetUrl = new URL(req.originalUrl, backendUrl);
  const transport = targetUrl.protocol === "https:" ? https : http;

  const proxyReq = transport.request(
    targetUrl,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host,
        "x-forwarded-host": req.headers.host || "",
        "x-forwarded-proto": req.headers["x-forwarded-proto"]?.toString() || req.protocol,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.statusMessage, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", () => {
    if (!res.headersSent) {
      res.status(502).send(errorMessage);
    } else {
      res.end();
    }
  });

  req.pipe(proxyReq);
}

app.use(/^\/api(\/|$)/, (req: Request, res: Response) => {
  proxyHttpRequest(req, res);
});

app.use(/^\/media(\/|$)/, (req: Request, res: Response) => {
  proxyHttpRequest(req, res);
});

app.get("/image-proxy", async (req: Request, res: Response) => {
  const rawUrl = req.query.url;
  const url = typeof rawUrl === "string" ? rawUrl : "";

  if (!url) {
    res.status(400).send("url is required");
    return;
  }

  try {
    const resolvedUrl =
      /^https?:\/\//i.test(url) || url.startsWith("data:")
        ? url
        : new URL(url, backendUrl).toString();
    const response = await fetch(resolvedUrl);

    if (!response.ok) {
      res.status(response.status).send("Fetch failed");
      return;
    }

    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.set("Content-Type", contentType);
    }

    res.set("Cache-Control", "public, max-age=86400");

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).send("Proxy error");
  }
});

app.get(/.*/, (req: Request, res: Response, next: NextFunction) => {
  if (path.extname(req.path)) {
    next();
    return;
  }

  res.sendFile(path.resolve(distDir, "index.html"));
});

const server = app.listen(port, host);

server.on("upgrade", (req, socket, head) => {
  if (!req.url?.startsWith("/ws/")) {
    socket.destroy();
    return;
  }

  const targetUrl = new URL(req.url, backendUrl);
  const targetPort = Number(targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80));
  const targetSocket = net.connect(targetPort, targetUrl.hostname, () => {
    const headers = [
      `${req.method || "GET"} ${targetUrl.pathname}${targetUrl.search} HTTP/${req.httpVersion}`,
      `Host: ${targetUrl.host}`,
      `X-Forwarded-Host: ${req.headers.host || ""}`,
      `X-Forwarded-Proto: ${req.headers["x-forwarded-proto"]?.toString() || "http"}`,
      ...Object.entries(req.headers)
        .filter(([key]) => key.toLowerCase() !== "host")
        .map(([key, value]) =>
          Array.isArray(value) ? `${key}: ${value.join(", ")}` : `${key}: ${value ?? ""}`,
        ),
      "",
      "",
    ].join("\r\n");

    targetSocket.write(headers);
    if (head.length > 0) {
      targetSocket.write(head);
    }
    targetSocket.pipe(socket);
    socket.pipe(targetSocket);
  });

  targetSocket.on("error", () => socket.destroy());
  socket.on("error", () => targetSocket.destroy());
});

server.on("listening", () => {
  console.log(`Server listening on http://${host}:${port}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(`Failed to start server on ${host}:${port}`, error);
  process.exit(1);
});
