export const validatePayment = (req, res, next) => {
    const { amount, customerId } = req.body;

    if (!customerId) {
        return res.status(400).json({
            success: false,
            message: 'ID do cliente é obrigatório'
        });
    }

    if (!amount || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Valor do pagamento deve ser maior que zero'
        });
    }

    if (amount > 10000) {
        return res.status(400).json({
            success: false,
            message: 'Valor do pagamento excede o limite permitido'
        });
    }

    next();
};

export const paymentLogger = (req, res, next) => {
    console.log(`[PAYMENT] ${new Date().toISOString()} - ${req.method} ${req.path} - Cliente: ${req.body.customerId || 'N/A'}`);
    next();
};
