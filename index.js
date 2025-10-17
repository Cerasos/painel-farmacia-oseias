import express from "express";
import webhookRoutes from "./routes/webhook.js";
import apiRoutes from "./routes/api.js";
import uazapiRoutes from "./routes/uazapi.js";
import painelRoutes from "./routes/painel.js";
import paymentRoutes from "./payments/routes/paymentRoutes.js";

const app = express();
app.use(express.json());

app.use("/webhook", webhookRoutes);
app.use("/api", apiRoutes);
app.use("/uazapi", uazapiRoutes);
app.use("/payments", paymentRoutes);
app.use("/", painelRoutes);

export default app;
