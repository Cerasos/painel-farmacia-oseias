import express from "express";
import paymentController from "../controllers/paymentController.js";
import { validatePayment, paymentLogger } from "../middleware/paymentMiddleware.js";
import paymentService from "../services/paymentService.js";

const router = express.Router();

router.use(paymentLogger);

router.post("/create", validatePayment, paymentController.createPayment);
router.get("/status/:paymentId", paymentController.getPaymentStatus);
router.post("/confirm", paymentController.confirmPayment);
router.get("/customer/:customerId", paymentController.getCustomerPayments);

router.get("/pix/qrcode/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;
    const pixData = await paymentService.generatePixQRCode(paymentId);

    res.json({
      success: true,
      data: pixData,
    });
  } catch (error) {
    console.error("Erro ao gerar QR Code PIX:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;