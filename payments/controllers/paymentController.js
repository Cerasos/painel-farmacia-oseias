import paymentService from "../services/paymentService.js";

class PaymentController {
  async createPayment(req, res) {
    try {
      const { customerId, amount, description, paymentMethod } = req.body;
      const payment = await paymentService.processPayment({
        customerId,
        amount,
        description,
        paymentMethod,
      });

      res.json({
        success: true,
        data: payment,
        message: "Pagamento processado com sucesso",
      });
    } catch (error) {
      console.error("Erro no controller de pagamento:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await paymentService.getPaymentStatus(paymentId);

      res.json({ success: true, data: payment });
    } catch (error) {
      console.error("Erro ao buscar status:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async confirmPayment(req, res) {
    try {
      const { paymentId } = req.body;
      const payment = await paymentService.confirmPayment(paymentId);

      res.json({
        success: true,
        data: payment,
        message: "Pagamento confirmado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getCustomerPayments(req, res) {
    try {
      const { customerId } = req.params;
      const payments = await paymentService.getCustomerPayments(customerId);

      res.json({ success: true, data: payments });
    } catch (error) {
      console.error("Erro ao buscar pagamentos:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async generatePixQRCode(req, res) {
    try {
      const { paymentId } = req.params;
      const pixData = await paymentService.generatePixQRCode(paymentId);

      res.json({ success: true, data: pixData });
    } catch (error) {
      console.error("Erro ao gerar QR Code PIX:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new PaymentController();