import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import path from "path";

const app = express();
const publicDir = path.resolve(__dirname, "..", "public");
const distDir = path.resolve(__dirname, "..", "dist");

app.use(morgan("dev"));
app.use(express.static(distDir));
app.use(express.static(publicDir));

app.get("/image-proxy", async (req: Request, res: Response) => {
  const rawUrl = req.query.url;
  const url = typeof rawUrl === "string" ? rawUrl : "";

  if (!url) {
    res.status(400).send("url is required");
    return;
  }

  try {
    const response = await fetch(url);

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

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
