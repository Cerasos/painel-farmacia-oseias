import express from "express";
import serverless from "serverless-http";
import path from "path";
import { fileURLToPath } from "url";
import webhookRoutes from "./routes/webhook.js";
import apiRoutes from "./routes/api.js";
import uazapiRoutes from "./routes/uazapi.js";
import * as paymentRoutes from "./payments/routes/paymentRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

console.log("🔧 UAZAPI Service Iniciado: https://cerasos.uazapi.com");
console.log("🔄 Carregando contatos da UAZAPI...");
console.log("📇 Buscando contatos da UAZAPI...");
console.log("🕒 SESSION MANAGER INICIADO - Verificando inatividade a cada 5s");

app.use("/webhook", webhookRoutes);
app.use("/api", apiRoutes);
app.use("/uazapi", uazapiRoutes);
app.use("/payments", paymentRoutes.default);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((req, res) => {
  res.status(404).send("Página não encontrada");
});

export const handler = serverless(app);
