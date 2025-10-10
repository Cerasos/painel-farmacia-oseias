import uazapiService from "./uazapiService.js";
import messageStorage from "../storage/messageStorage.js";
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

  async sendMessageWithButtons(to, messageData, isAtendenteCommand = false) {
    try {
      console.log("📤 Enviando mensagem para:", to);
      
      if (messageData.text) {
        messageStorage.salvarMensagemEnviada(to, messageData.text);
      }
      
      if (!messageData.choices || messageData.choices.length === 0) {
        console.log("🔄 Enviando como mensagem de texto simples...");
        
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
        type: messageData.type,
        text: messageData.text,
        choices: messageData.choices
      };

      if (messageData.footerText) {
        payload.footerText = messageData.footerText;
      }

      if (messageData.type === "list" && messageData.listButton) {
        payload.listButton = messageData.listButton;
      }

      if (isAtendenteCommand) {
        payload.track_source = "atendente_command";
      }

      const result = await uazapiService.sendMessage(payload);
      return result && !result.error;
      
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error);
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
    let flowToSend = "menu";
    
    const mensagem = userMessage.toLowerCase().trim();
    
    if (mensagem.match(/^(oi|ola|olá|menu|voltar|inicio|início|start|oie|iai|iae)$/)) {
      flowToSend = "menu";
    }
    else {
      return null;
    }

    return flowToSend;
  }

  getMenuFlow(tipo) {
    return menuFlows[tipo] || menuFlows.menu;
  }
}

export default new MessageService();