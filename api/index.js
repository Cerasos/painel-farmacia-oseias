import express from "express";
import serverless from "serverless-http";

import webhookRoutes from "../routes/webhook.js";
import apiRoutes from "../routes/api.js";
import uazapiRoutes from "../routes/uazapi.js";
import painelRoutes from "../routes/painel.js";
import * as paymentRoutes from "../payments/routes/paymentRoutes.js";

import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

app.use("/webhook", webhookRoutes);
app.use("/api", apiRoutes);
app.use("/uazapi", uazapiRoutes);
app.use("/payments", paymentRoutes.default);
app.use("/", painelRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, "..", "public");

app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "painel.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

export default serverless(app);
