import express from "express";
import serverless from "serverless-http";

import webhookRoutes from "../routes/webhook.js";
import apiRoutes from "../routes/api.js";
import uazapiRoutes from "../routes/uazapi.js";
import painelRoutes from "../routes/painel.js";
import * as paymentRoutes from "../payments/routes/paymentRoutes.js";

const app = express();
app.use(express.json());

app.use("/webhook", webhookRoutes);
app.use("/api", apiRoutes);
app.use("/uazapi", uazapiRoutes);
app.use("/payments", paymentRoutes.default);
app.use("/", painelRoutes);

export default serverless(app);
