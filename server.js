const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.send("ok"));

app.listen(port, () => {
  console.log(`Agent City running on http://localhost:${port}`);
});
