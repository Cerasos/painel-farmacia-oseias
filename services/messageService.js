import uazapiService from "./uazapiService.js";
import messageStorage from "../storage/messageStorage.js";
import sessionManager from "../manager/sessionManager.js";
import { menuFlows, ATENDENTES } from "../config/constants.js";

class MessageService {
  isAtendente(phone) {
    const isAtendente = ATENDENTES.includes(phone);
    console.log(`🔍 Verificando se ${phone} é atendente: ${isAtendente}`);
    return isAtendente;
  }

  async processarMidiaRecebida(messageData) {
    try {
      console.log("📸 Processando mídia recebida:", messageData);

      const { from, type, data } = messageData;

      const url = this.extrairUrlMidia(data.content);

      let midiaData = {
        phone: from,
        timestamp: new Date().toISOString(),
        type: 'received',
        messageType: type
      };

      if (type === 'image') {
        midiaData.image = {
          url: url,
          caption: data.caption || '',
          mimetype: 'image/jpeg'
        };
      } else if (type === 'video') {
        midiaData.video = {
          url: url,
          caption: data.caption || '',
          mimetype: 'video/mp4'
        };
      } else if (type === 'audio' || type === 'ptt') {
        midiaData.audio = {
          url: url,
          mimetype: 'audio/mpeg'
        };
      } else if (type === 'document') {
        midiaData.document = {
          url: url,
          caption: data.caption || '',
          mimetype: 'application/pdf'
        };
      } else {
        console.log("❌ Tipo de mídia não suportado:", type);
        return null;
      }

      const success = messageStorage.salvarMensagemMidia(from, {
        messageType: type,
        content: data.content,
        caption: data.caption || '',
        convertOptions: data.convertOptions || {}
      }, 'received');

      if (success) {
        console.log(`✅ Mídia ${type} salva com sucesso`);
        return midiaData;
      } else {
        console.log(`❌ Falha ao salvar mídia ${type}`);
        return null;
      }

    } catch (error) {
      console.error("❌ Erro ao processar mídia:", error);
      return null;
    }
  }

  extrairUrlMidia(content) {
    try {
      if (typeof content === 'string' && content.startsWith('http')) {
        return content;
      }
      if (typeof content === 'object') {
        return content.URL || content.url || JSON.stringify(content);
      }
      return String(content);
    } catch (error) {
      console.error("❌ Erro ao extrair URL da mídia:", error);
      return 'URL não disponível';
    }
  }

  async enviarAlertaMidiaAtendente(clientePhone, midiaData) {
    console.log(`🚨 Alerta mídia atendente - Cliente: ${clientePhone}`);

    let tipoMidia = 'arquivo';
    let preview = '';

    if (midiaData.image) {
      tipoMidia = 'foto';
      preview = midiaData.image.caption || '(sem legenda)';
    } else if (midiaData.video) {
      tipoMidia = 'vídeo';
      preview = midiaData.video.caption || '(sem legenda)';
    } else if (midiaData.audio) {
      tipoMidia = 'áudio';
      preview = '(áudio)';
    } else if (midiaData.document) {
      tipoMidia = 'documento';
      preview = midiaData.document.filename || '(arquivo)';
    }

    for (const atendente of ATENDENTES) {
      try {
        const alertaMessage = {
          text: `🚨 *CLIENTE ENVIOU ${tipoMidia.toUpperCase()}*\n\n📞 *Cliente:* ${clientePhone}\n📸 *Tipo:* ${tipoMidia}\n💬 *Conteúdo:* ${preview}\n\n⚡ *Clique abaixo para responder:*`,
          type: "button",
          choices: [
            `💬 Responder Cliente|responder_${clientePhone}`,
            `❌ Ignorar|ignorar`
          ]
        };

        await this.sendMessageWithButtons(atendente, alertaMessage, true);
      } catch (error) {
        console.error(`❌ Erro ao enviar alerta de mídia para ${atendente}:`, error);
      }
    }

    return true;
  }

  async testarListaDiretamente(to) {
    try {
      console.log("🧪 TESTE DIRETO DE LISTA");

      const payload = {
        number: to,
        type: "list",
        text: "🧪 TESTE DIRETO - Isso é um teste de lista",
        listButton: "⭐ Clique para Testar",
        footerText: "Teste de funcionalidade",
        choices: [
          "[Seção de Teste]",
          "Opção 1|teste_1|Descrição 1",
          "Opção 2|teste_2|Descrição 2",
          "Opção 3|teste_3|Descrição 3"
        ]
      };

      console.log("📦 PAYLOAD DO TESTE:");
      console.log(JSON.stringify(payload, null, 2));

      const result = await uazapiService.sendMessage(payload);
      console.log("✅ RESULTADO DO TESTE:");
      console.log(JSON.stringify(result, null, 2));

      return result;
    } catch (error) {
      console.error("❌ ERRO NO TESTE:", error);
      return null;
    }
  }

  async sendMessageWithButtons(to, messageData, isAtendenteCommand = false) {
    try {
      console.log("📤 Enviando mensagem para:", to);
      console.log("🎯 TIPO DE MENSAGEM:", messageData.type);

      if (messageData.type === "list") {
        console.log("🔍 DEBUG DA LISTA - ESTRUTURA COMPLETA:");
        console.log("Texto:", messageData.text);
        console.log("ListButton:", messageData.listButton);
        console.log("FooterText:", messageData.footerText);
        console.log("Choices:", JSON.stringify(messageData.choices, null, 2));

        const payload = {
          number: to,
          type: "list",
          text: messageData.text,
          listButton: messageData.listButton || "Ver Opções",
          choices: messageData.choices || []
        };

        if (messageData.footerText) {
          payload.footerText = messageData.footerText;
        }

        console.log("📦 PAYLOAD FINAL PARA UAZAPI:");
        console.log(JSON.stringify(payload, null, 2));

        const result = await uazapiService.sendMessage(payload);
        console.log("✅ RESPOSTA COMPLETA DA UAZAPI:");
        console.log(JSON.stringify(result, null, 2));

        if (result && result.error) {
          console.log("❌ ERRO NA LISTA:", result.error);
          console.log("🔄 TENTANDO FALLBACK COM BOTÕES...");
          return await this.sendMessageWithButtons(to, {
            text: messageData.text + "\n\n⭐ Avalie de 1 a 5 estrelas:",
            type: "button",
            footerText: messageData.footerText,
            choices: [
              "⭐ 1 Estrela|encerramento_1",
              "⭐⭐ 2 Estrelas|encerramento_2",
              "⭐⭐⭐ 3 Estrelas|encerramento_3",
              "⭐⭐⭐⭐ 4 Estrelas|encerramento_4",
              "⭐⭐⭐⭐⭐ 5 Estrelas|encerramento_5"
            ]
          }, isAtendenteCommand);
        }

        return result && !result.error;
      }

      if (!messageData.choices || messageData.choices.length === 0) {
        let text = messageData.text;
        if (messageData.footerText) {
          text += `\n\n_${messageData.footerText}_`;
        }

        const payload = {
          number: to,
          text: text
        };

        if (isAtendenteCommand) {
          payload.track_source = "atendente_command";
        }

        const result = await uazapiService.sendTextMessage(payload);
        return result && !result.error;
      }

      const payload = {
        number: to,
        type: messageData.type || "button",
        text: messageData.text,
        choices: messageData.choices
      };

      if (messageData.footerText) {
        payload.footerText = messageData.footerText;
      }

      if (isAtendenteCommand) {
        payload.track_source = "atendente_command";
      }

      console.log("📦 Payload de botões:", JSON.stringify(payload, null, 2));
      const result = await uazapiService.sendMessage(payload);
      return result && !result.error;

    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error);
      return false;
    }
  }

  async sendMessageWithList(to, messageData, isAtendenteCommand = false) {
    try {
      console.log("📋 Enviando mensagem com lista para:", to);

      if (isAtendenteCommand && !this.isAtendente(to)) {
        sessionManager.markAttendeeMessage(to);
        console.log(`👨‍💼 Atendente enviou mensagem para ${to} - marcando como última mensagem do atendente`);
      }

      if (messageData.text) {
        messageStorage.salvarMensagemEnviada(to, messageData.text);
      }

      const formattedChoices = [
        "[Avaliação]",
        "⭐ 1 Estrela|encerramento_1|Nada satisfeito",
        "⭐⭐ 2 Estrelas|encerramento_2|Pouco satisfeito",
        "⭐⭐⭐ 3 Estrelas|encerramento_3|Satisfeito",
        "⭐⭐⭐⭐ 4 Estrelas|encerramento_4|Bem satisfeito",
        "⭐⭐⭐⭐⭐ 5 Estrelas|encerramento_5|Muito satisfeito"
      ];

      const payload = {
        number: to,
        type: "list",
        text: messageData.text,
        listButton: messageData.listButton || "Avaliar",
        choices: formattedChoices,
        footerText: messageData.footerText || ""
      };

      if (isAtendenteCommand) {
        payload.track_source = "atendente_command";
      }

      console.log("📦 Payload da lista CORRIGIDO:", JSON.stringify(payload, null, 2));
      const result = await uazapiService.sendMessage(payload);

      console.log("✅ Resposta da lista:", result);
      return result && !result.error;

    } catch (error) {
      console.error("❌ Erro ao enviar lista:", error);
      return false;
    }
  }

  async enviarAlertaAtendente(clientePhone, mensagemCliente) {
    console.log(`🚨 Alerta atendente - Cliente: ${clientePhone}, Mensagem: ${mensagemCliente}`);

    for (const atendente of ATENDENTES) {
      try {
        const alertaMessage = {
          text: `🚨 *NOVO CLIENTE SOLICITANDO ATENDIMENTO*\n\n📞 *Cliente:* ${clientePhone}\n💬 *Mensagem:* ${mensagemCliente}\n\n⚡ *Clique abaixo para responder:*`,
          type: "button",
          choices: [
            `💬 Responder Cliente|responder_${clientePhone}`,
            `❌ Ignorar|ignorar`
          ]
        };

        await this.sendMessageWithButtons(atendente, alertaMessage, true);
      } catch (error) {
        console.error(`❌ Erro ao enviar alerta para ${atendente}:`, error);
      }
    }

    return true;
  }

  processarMensagemCliente(userMessage) {
    const mensagem = userMessage.toLowerCase().trim();

    if (mensagem === "menu") {
      return "menu";
    }

    return null;
  }

  async markAtendenteResponse(clientePhone, atendentePhone) {
    console.log(`👨‍💼 ATENDENTE ${atendentePhone} RESPONDEU para cliente ${clientePhone}`);
    sessionManager.markAttendeeMessage(clientePhone);
  }

  getMenuFlow(tipo) {
    return menuFlows[tipo] || menuFlows.menu;
  }
}

export default new MessageService();