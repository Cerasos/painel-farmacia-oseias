const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validatePayment, paymentLogger } = require('../middleware/paymentMiddleware');

router.use(paymentLogger);

router.post('/create', validatePayment, paymentController.createPayment);
router.get('/status/:paymentId', paymentController.getPaymentStatus);
router.post('/confirm', paymentController.confirmPayment);
router.get('/customer/:customerId', paymentController.getCustomerPayments);

router.get('/pix/qrcode/:paymentId', async (req, res) => {
    try {
        const paymentService = require('../services/paymentService');
        const { paymentId } = req.params;
        
        const pixData = await paymentService.generatePixQRCode(paymentId);
        
        res.json({
            success: true,
            data: pixData
        });
    } catch (error) {
        console.error('Erro ao gerar QR Code PIX:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;