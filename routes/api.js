import express from "express";
import messageController from "../controllers/messageController.js";
import messageStorage from "../storage/messageStorage.js";
import mediaService from "../services/mediaService.js";
import sessionManager from "../manager/sessionManager.js";
import { UAZAPI_URL, UAZAPI_TOKEN } from "../config/constants.js";
import fetch from "node-fetch";

const router = express.Router();
router.post("/enviar-mensagem", messageController.enviarMensagem);
router.post("/enviar-rapido", messageController.enviarMensagemRapida);
router.post("/enviar-teste", messageController.enviarMensagemTeste);
router.post("/processar-midia", messageController.processarMidia);
router.get("/conversas", messageController.listarConversas);
router.get("/mensagens/:phone", messageController.obterMensagens);
router.get("/contatos", messageController.obterContatos);
router.post("/sincronizar-contatos", messageController.sincronizarContatos);
router.post("/testar-alerta", messageController.testarAlertaAtendente);

router.post("/enviar-mensagem", async (req, res) => {
  try {
    const { to, message } = req.body;

    console.log(`📤 ENVIANDO MENSAGEM DO PAINEL: para ${to}, mensagem: ${message}`);
    const response = await fetch(`${UAZAPI_URL}/message/sendText/${UAZAPI_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: to,
        text: message
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ MENSAGEM ENVIADA COM SUCESSO para ${to}`);
      const messageSaved = messageStorage.salvarMensagem(to, message, 'sent', 'text');

      if (messageSaved) {
        console.log(`💾 MENSAGEM SALVA NO STORAGE: ${to} - "${message}"`);
      }
      console.log(`🔔 ANTES DE CHAMAR markAttendeeMessage PARA: ${to}`);
      sessionManager.markAttendeeMessage(to);
      console.log(`🔔 DEPOIS DE CHAMAR markAttendeeMessage PARA: ${to}`);

      res.json({ success: true, message: 'Mensagem enviada com sucesso' });
    } else {
      console.log('❌ Erro ao enviar mensagem:', data);
      res.json({ success: false, error: 'Erro ao enviar mensagem' });
    }
  } catch (error) {
    console.error('❌ Erro no envio:', error);
    res.json({ success: false, error: error.message });
  }
});

router.post("/enviar-rapido", async (req, res) => {
  try {
    const { to, tipo } = req.body;

    console.log(`📤 ENVIANDO MENSAGEM RÁPIDA: para ${to}, tipo: ${tipo}`);

    let messageText = '';
    switch (tipo) {
      case 'delivery':
        messageText = `🚚 *Solicitar delivery* ✔️

📍 Área de cobertura: Centro e bairros próximos
💰 Taxa de entrega: Variável a depender da distância, consultar valor com atendente.

📍 *Insira seu endereço neste modelo:*
Rua/número/complemento
Bairro`;
        break;
      case 'menu':
        messageText = `📢 Olá! Seja muito bem-vindo à Farmácia Oséias! 💊

📍 *Endereço físico*: Avenida Nereu Ramos, 141 – Centro
🕒 *Horário de atendimento*: 08h00 às 22h00 (GMT-3)

💬 Como podemos te ajudar hoje?`;
        break;
      case 'horarios':
        messageText = `⏰ *Atendimento especializado* ✔️

🕒 *Oséias*: segunda à sexta das 16:00 às 19:00.

🕒 *Carol*, filha do Oséias: segunda à sabado das 08:00 às 14:00.

🏪 *Farmácia Oséias*
📍 Avenida Nereu Ramos, 141 – Centro`;
        break;
      default:
        messageText = '💬 Em que posso ajudar?';
    }
    const response = await fetch(`${UAZAPI_URL}/message/sendText/${UAZAPI_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: to,
        text: messageText
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ MENSAGEM RÁPIDA ENVIADA COM SUCESSO para ${to}`);

      const messageSaved = messageStorage.salvarMensagem(to, messageText, 'sent', 'text');

      if (messageSaved) {
        console.log(`💾 MENSAGEM RÁPIDA SALVA NO STORAGE: ${to} - tipo: ${tipo}`);
      }
      sessionManager.markAttendeeMessage(to);

      console.log(`👨‍💼✅ ATENDENTE ENVIOU MENSAGEM RÁPIDA VIA PAINEL - AGUARDANDO RESPOSTA DO CLIENTE ${to}`);

      res.json({ success: true, message: 'Mensagem enviada com sucesso' });
    } else {
      console.log('❌ Erro ao enviar mensagem rápida:', data);
      res.json({ success: false, error: 'Erro ao enviar mensagem' });
    }
  } catch (error) {
    console.error('❌ Erro no envio rápido:', error);
    res.json({ success: false, error: error.message });
  }
});

router.get("/debug/mensagens/:phone", async (req, res) => {
  try {
    const phone = req.params.phone;
    const mensagens = messageStorage.getMensagens(phone);

    console.log(`🔍 DEBUG: ${mensagens.length} mensagens para ${phone}:`);
    mensagens.forEach((msg, index) => {
      console.log(`   ${index + 1}. Tipo: ${msg.messageType} | Texto: ${msg.text?.substring(0, 50)}`);
      if (msg.image) console.log(`      Imagem:`, msg.image);
      if (msg.video) console.log(`      Vídeo:`, msg.video);
    });

    res.json({
      success: true,
      total: mensagens.length,
      messages: mensagens
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/test-download/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;

    console.log(`🧪 Testando download: ${messageId}`);

    const mediaData = await mediaService.downloadESalvarMidia(messageId);

    if (mediaData) {
      res.json({
        success: true,
        message: "Mídia baixada com sucesso!",
        mediaData: mediaData
      });
    } else {
      res.json({
        success: false,
        message: "Falha ao baixar mídia"
      });
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    res.json({ success: false, error: error.message });
  }
});

router.get("/descobrir-webhook", async (req, res) => {
  try {
    console.log("🔍 Procurando webhook configurado...");

    const response = await fetch("https://cerasos.uazapi.com/webhook", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "token": "ced89ac6-49ed-4360-a3ed-b06615d05612"
      }
    });

    if (response.ok) {
      const webhookInfo = await response.json();
      console.log("🎯 WEBHOOK ENCONTRADO:", webhookInfo);

      res.json({
        success: true,
        message: "✅ Webhook encontrado!",
        webhook: webhookInfo
      });
    } else {
      res.json({
        success: false,
        message: "❌ Nenhum webhook configurado ou erro"
      });
    }

  } catch (error) {
    console.error("❌ Erro:", error);
    res.json({ success: false, error: error.message });
  }
});

router.post("/trocar-para-amigo", async (req, res) => {
  try {
    const webhookAmigo = "https://untransfigured-latricia-precollapsable.ngrok-free.dev/webhook";

    console.log(`🔄 Trocando webhook para: ${webhookAmigo}`);

    const payload = {
      url: webhookAmigo,
      events: ["messages"],
      excludeMessages: ["wasSentByApi"],
      enabled: true
    };

    const response = await fetch("https://cerasos.uazapi.com/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": "ced89ac6-49ed-4360-a3ed-b06615d05612"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      res.json({
        success: true,
        message: "✅ Webhook TROCADO com sucesso!",
        novoWebhook: webhookAmigo,
        resposta: result
      });
    } else {
      res.json({
        success: false,
        message: "❌ Erro ao trocar webhook",
        erro: result
      });
    }

  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/debug-botoes", async (req, res) => {
  try {
    console.log("🔍 DEBUG BOTÕES - ESTRUTURA:");
    console.log(JSON.stringify(req.body, null, 2));

    const message = req.body.message;
    if (message) {
      console.log("📋 CAMPOS DE BOTÃO:");
      console.log("buttonOrListid:", message.buttonOrListid);
      console.log("type:", message.type);
      console.log("text:", message.text);
      console.log("selectedRowId:", message.selectedRowId);
    }

    res.json({
      success: true,
      message: "Debug de botões no console",
      structure: req.body
    });

  } catch (error) {
    console.error("❌ Erro no debug de botões:", error);
    res.json({ success: false, error: error.message });
  }
});

router.get("/media/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;

    console.log(`🖼️ Servindo mídia: ${messageId}`);

    const media = await mediaService.servirMidia(messageId);

    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Disposition', `inline; filename="${media.filename}"`);

    res.send(media.buffer);

    console.log(`✅ Mídia servida: ${media.contentType}, ${media.buffer.length} bytes`);

  } catch (error) {
    console.error('❌ Erro ao servir mídia:', error);
    const fallbackSvg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="#6b7280">
          Mídia não disponível
        </text>
      </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(fallbackSvg);
  }
});

router.get("/whatsapp-image", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ success: false, error: "URL não fornecida" });
    }

    console.log(`📥 Baixando imagem do WhatsApp: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.8',
        'Referer': 'https://web.whatsapp.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao baixar imagem: ${response.status}`);
    }

    const imageBuffer = await response.buffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.send(imageBuffer);

    console.log(`✅ Imagem servida via proxy: ${contentType}, ${imageBuffer.length} bytes`);

  } catch (error) {
    console.error('❌ Erro no proxy de imagem:', error);
    res.status(500).json({
      success: false,
      error: 'Não foi possível carregar a imagem',
      details: error.message
    });
  }
});

export default router;