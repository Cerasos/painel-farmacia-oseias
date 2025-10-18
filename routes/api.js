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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, text: message }),
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ MENSAGEM ENVIADA COM SUCESSO para ${to}`);
      messageStorage.salvarMensagem(to, message, "sent", "text");
      sessionManager.markAttendeeMessage(to);
      res.json({ success: true, message: "Mensagem enviada com sucesso" });
    } else {
      console.log("❌ Erro ao enviar mensagem:", data);
      res.json({ success: false, error: "Erro ao enviar mensagem" });
    }
  } catch (error) {
    console.error("❌ Erro no envio:", error);
    res.json({ success: false, error: error.message });
  }
});

router.post("/enviar-rapido", async (req, res) => {
  try {
    const { to, tipo } = req.body;
    console.log(`📤 ENVIANDO MENSAGEM RÁPIDA: para ${to}, tipo: ${tipo}`);

    let messagePayload;

    switch (tipo) {
      case "delivery":
        messagePayload = {
          text: `🚚 *Solicitar delivery* ✔️\n\n📍 Área de cobertura: Centro e bairros próximos\n💰 Taxa de entrega: Variável a depender da distância.\n\n📍 *Insira seu endereço neste modelo:*\nRua/número/complemento\nBairro`,
        };
        break;
      case "menu":
        messagePayload = {
          text: `📢 Olá! Seja muito bem-vindo à Farmácia Oséias! 💊\n\n📍 *Endereço físico*: Avenida Nereu Ramos, 141 – Centro\n🕒 *Horário de atendimento*: 08h00 às 22h00 (GMT-3)\n\n💬 Como podemos te ajudar hoje?`,
        };
        break;
      case "horarios":
        messagePayload = {
          text: `⏰ *Atendimento especializado* ✔️\n\n🕒 *Oséias*: segunda à sexta das 16:00 às 19:00.\n🕒 *Carol*: segunda à sábado das 08:00 às 14:00.\n\n🏪 *Farmácia Oséias*\n📍 Avenida Nereu Ramos, 141 – Centro`,
        };
        break;
      case "encerramento":
        messagePayload = {
          text: `📢 Obrigado por entrar em contato com a Farmácia Oséias! 💊\n\n😊 Esperamos que volte sempre!\n\n📋 Como foi sua experiência?`,
          type: "list",
          listButton: "⭐ Avaliar Atendimento",
          footerText: "Sua avaliação nos ajuda a melhorar!",
          choices: [
            "[Avaliação do Atendimento]",
            "⭐ 1 Estrela|encerramento_1|Nada satisfeito",
            "⭐⭐ 2 Estrelas|encerramento_2|Pouco satisfeito",
            "⭐⭐⭐ 3 Estrelas|encerramento_3|Satisfeito",
            "⭐⭐⭐⭐ 4 Estrelas|encerramento_4|Bem satisfeito",
            "⭐⭐⭐⭐⭐ 5 Estrelas|encerramento_5|Muito satisfeito",
          ],
        };
        break;
      default:
        messagePayload = { text: "💬 Em que posso ajudar?" };
    }

    let response;

    if (messagePayload.type === "list") {
      response = await fetch(`${UAZAPI_URL}/message/sendList/${UAZAPI_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          text: messagePayload.text,
          listButton: messagePayload.listButton,
          title: messagePayload.text.split("\n")[0],
          sections: [
            {
              title: "Avaliação do Atendimento",
              rows: messagePayload.choices.slice(1).map((choice) => {
                const [title, rowId, description] = choice.split("|");
                return { title, rowId, description };
              }),
            },
          ],
          footerText: messagePayload.footerText,
        }),
      });
    } else {
      response = await fetch(`${UAZAPI_URL}/message/sendText/${UAZAPI_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, text: messagePayload.text }),
      });
    }

    const data = await response.json();

    if (data.success) {
      const messageText = tipo === "encerramento" ? "[LISTA DE AVALIAÇÃO ENVIADA]" : messagePayload.text;
      messageStorage.salvarMensagem(to, messageText, "sent", "text");
      sessionManager.markAttendeeMessage(to);
      res.json({ success: true, message: "Mensagem enviada com sucesso" });
    } else {
      res.json({ success: false, error: "Erro ao enviar mensagem" });
    }
  } catch (error) {
    console.error("❌ Erro no envio rápido:", error);
    res.json({ success: false, error: error.message });
  }
});

router.get("/debug/mensagens/:phone", async (req, res) => {
  try {
    const mensagens = messageStorage.getMensagens(req.params.phone);
    res.json({ success: true, total: mensagens.length, messages: mensagens });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/test-download/:messageId", async (req, res) => {
  try {
    const mediaData = await mediaService.downloadESalvarMidia(req.params.messageId);
    res.json(mediaData ? { success: true, mediaData } : { success: false, message: "Falha ao baixar mídia" });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/descobrir-webhook", async (req, res) => {
  try {
    const response = await fetch("https://cerasos.uazapi.com/webhook", {
      method: "GET",
      headers: { "Content-Type": "application/json", token: "ced89ac6-49ed-4360-a3ed-b06615d05612" },
    });
    const webhookInfo = await response.json();
    res.json({ success: response.ok, webhook: webhookInfo });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/trocar-para-amigo", async (req, res) => {
  try {
    const webhookAmigo = "https://untransfigured-latricia-precollapsable.ngrok-free.dev/webhook";
    const payload = { url: webhookAmigo, events: ["messages"], excludeMessages: ["wasSentByApi"], enabled: true };
    const response = await fetch("https://cerasos.uazapi.com/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", token: "ced89ac6-49ed-4360-a3ed-b06615d05612" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    res.json({ success: response.ok, novoWebhook: webhookAmigo, resposta: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/debug-botoes", async (req, res) => {
  try {
    console.log(JSON.stringify(req.body, null, 2));
    res.json({ success: true, message: "Debug de botões no console", structure: req.body });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/media/:messageId", async (req, res) => {
  try {
    const media = await mediaService.servirMidia(req.params.messageId);
    res.setHeader("Content-Type", media.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Disposition", `inline; filename="${media.filename}"`);
    res.send(media.buffer);
  } catch (error) {
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(`<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="#6b7280">Mídia não disponível</text></svg>`);
  }
});

router.get("/whatsapp-image", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, error: "URL não fornecida" });

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "image/*,*/*;q=0.8",
        Referer: "https://web.whatsapp.com/",
      },
    });

    if (!response.ok) throw new Error(`Erro ao baixar imagem: ${response.status}`);

    const buffer = await response.buffer();
    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: "Não foi possível carregar a imagem", details: error.message });
  }
});

export default router;