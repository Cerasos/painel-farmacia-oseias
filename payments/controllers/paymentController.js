import paymentService from "../services/paymentService.js";

const createPayment = async (req, res) => {
  try {
    const payment = await paymentService.processPayment(req.body);
    res.json({ success: true, data: payment });
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const payment = await paymentService.getPaymentStatus(req.params.paymentId);
    res.json({ success: true, data: payment });
  } catch (error) {
    console.error("Erro ao buscar status:", error);
    res.status(404).json({ success: false, message: error.message });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const payment = await paymentService.confirmPayment(req.body.paymentId);
    res.json({ success: true, data: payment });
  } catch (error) {
    console.error("Erro ao confirmar pagamento:", error);
    res.status(404).json({ success: false, message: error.message });
  }
};

const getCustomerPayments = async (req, res) => {
  try {
    const payments = await paymentService.getCustomerPayments(req.params.customerId);
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error("Erro ao buscar pagamentos do cliente:", error);
    res.status(404).json({ success: false, message: error.message });
  }
};

export default {
  createPayment,
  getPaymentStatus,
  confirmPayment,
  getCustomerPayments,
};
