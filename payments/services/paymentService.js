class PaymentService {
    constructor() {
        this.payments = new Map();
    }

    async processPayment(paymentData) {
        try {
            const { customerId, amount, description, paymentMethod } = paymentData;
            
            if (!customerId || !amount || amount <= 0) {
                throw new Error('Dados de pagamento inválidos');
            }

            const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const payment = {
                id: paymentId,
                customerId,
                amount,
                description: description || 'Pagamento de serviço',
                paymentMethod: paymentMethod || 'pix',
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            this.payments.set(paymentId, payment);

            console.log(`Pagamento criado: ${paymentId} para cliente: ${customerId}`);
            
            return payment;
        } catch (error) {
            console.error('Erro no service de pagamento:', error);
            throw new Error(`Falha ao processar pagamento: ${error.message}`);
        }
    }

    async getPaymentStatus(paymentId) {
        const payment = this.payments.get(paymentId);
        if (!payment) {
            throw new Error('Pagamento não encontrado');
        }
        return payment;
    }

    async confirmPayment(paymentId) {
        const payment = this.payments.get(paymentId);
        if (!payment) {
            throw new Error('Pagamento não encontrado');
        }

        payment.status = 'confirmed';
        payment.updatedAt = new Date();
        payment.confirmedAt = new Date();

        this.payments.set(paymentId, payment);

        console.log(`Pagamento confirmado: ${paymentId}`);
        return payment;
    }

    async cancelPayment(paymentId) {
        const payment = this.payments.get(paymentId);
        if (!payment) {
            throw new Error('Pagamento não encontrado');
        }

        payment.status = 'cancelled';
        payment.updatedAt = new Date();

        this.payments.set(paymentId, payment);
        return payment;
    }

    async getCustomerPayments(customerId) {
        const customerPayments = [];
        
        for (let [paymentId, payment] of this.payments) {
            if (payment.customerId === customerId) {
                customerPayments.push(payment);
            }
        }

        return customerPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    async generatePixQRCode(paymentId) {
        const payment = this.payments.get(paymentId);
        if (!payment) {
            throw new Error('Pagamento não encontrado');
        }

        const pixData = {
            paymentId: payment.id,
            amount: payment.amount,
            description: payment.description,
            qrCode: `00020126580014br.gov.bcb.pix0136${paymentId}520400005303986540${payment.amount.toFixed(2)}5802BR5913FARMACIA OSEIAS6008SAO PAULO62290525${paymentId}6304E2CA`,
            qrCodeImage: `data:image/png;base64,simulated_qr_code_base64_${paymentId}`,
            expiresIn: 3600
        };

        return pixData;
    }
}

module.exports = new PaymentService();