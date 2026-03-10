"use strict";

const express = require("express");
const morgan = require("morgan");
const path = require("path");

const app = express();

app.use(morgan("dev"));
app.use(express.static(path.resolve(__dirname, "..", "public")));

app.get(/.*/, (req, res, next) => {
  if (path.extname(req.path)) return next();
  res.sendFile(path.resolve(__dirname, "..", "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
