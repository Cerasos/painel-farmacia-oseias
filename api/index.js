import express from "express";

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
