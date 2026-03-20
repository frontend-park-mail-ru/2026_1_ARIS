"use strict";

const express = require("express");
const morgan = require("morgan");
const path = require("path");

const app = express();

app.use(morgan("dev"));
app.use(express.static(path.resolve(__dirname, "..", "public")));

app.get("/image-proxy", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("url is required");

  try {
    const response = await fetch(url);
    if (!response.ok) return res.status(response.status).send("Fetch failed");

    res.set("Content-Type", response.headers.get("content-type"));
    res.set("Cache-Control", "public, max-age=86400");
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).send("Proxy error");
  }
});

app.get(/.*/, (req, res, next) => {
  if (path.extname(req.path)) return next();
  res.sendFile(path.resolve(__dirname, "..", "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
