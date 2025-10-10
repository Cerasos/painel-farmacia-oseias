import fetch from "node-fetch";
import { UAZAPI_URL, UAZAPI_TOKEN } from "../config/constants.js";

class UazapiService {
  constructor() {
    this.baseUrl = UAZAPI_URL;
    this.token = UAZAPI_TOKEN;
    this.headers = {
      "Content-Type": "application/json",
      "token": UAZAPI_TOKEN
    };
    
    console.log(`🔧 UAZAPI Service Iniciado: ${this.baseUrl}`);
  }

  async sendMessage(payload) {
    try {
      const response = await fetch(`${this.baseUrl}/send/menu`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      return await response.json();
    } catch (error) {
      console.error("❌ Erro UAZAPI:", error);
      throw error;
    }
  }

  async sendTextMessage(payload) {
    try {
      const response = await fetch(`${this.baseUrl}/send/text`, {
        method: "POST",
        headers: this.headers, // ✅
        body: JSON.stringify(payload)
      });

      return await response.json();
    } catch (error) {
      console.error("❌ Erro UAZAPI texto:", error);
      throw error;
    }
  }

  async listarGrupos() {
    try {
      const response = await fetch(`${this.baseUrl}/group/list`, {
        method: "GET",
        headers: this.headers
      });

      const result = await response.json();
      
      if (response.ok && result.groups) {
        return result.groups.map(grupo => ({
          id: grupo.JID,
          name: grupo.Name,
          subject: grupo.Name,
          participants: grupo.Participants || [],
          owner: grupo.OwnerPN,
          created: grupo.GroupCreated
        }));
      }
      return [];
    } catch (error) {
      console.error("❌ Erro ao listar grupos:", error);
      return [];
    }
  }

  async buscarConversas() {
    try {
      const response = await fetch(`${UAZAPI_URL}/chat/list`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_TOKEN
        }
      });

      const result = await response.json();
      return response.ok && result.chats ? result.chats : [];
    } catch (error) {
      console.error("❌ Erro ao buscar conversas:", error);
      return [];
    }
  }

  async buscarContatos() {
    try {
      const response = await fetch(`${UAZAPI_URL}/contacts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_TOKEN
        }
      });

      const result = await response.json();
      return response.ok && result.contacts ? result.contacts : [];
    } catch (error) {
      console.error("❌ Erro ao buscar contatos:", error);
      return [];
    }
  }

  async verificarNumero(numero) {
    try {
      const response = await fetch(`${UAZAPI_URL}/contact/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_TOKEN
        },
        body: JSON.stringify({
          numbers: [numero]
        })
      });

      const result = await response.json();
      return response.ok && result.contacts ? result.contacts[0] : null;
    } catch (error) {
      console.error("❌ Erro ao verificar número:", error);
      return null;
    }
  }

  async setupWebhook(webhookUrl) {
    try {
      const payload = {
        url: webhookUrl,
        events: ["messages"],
        excludeMessages: ["wasSentByApi"],
        enabled: true
      };

      const response = await fetch(`${UAZAPI_URL}/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_TOKEN
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      return { success: response.ok, result };
    } catch (error) {
      console.error("❌ Erro ao configurar webhook:", error);
      return { success: false, error: error.message };
    }
  }

    async buscarContatos() {
    try {
      console.log("📇 Buscando contatos da UAZAPI...");
      
      const response = await fetch(`${UAZAPI_URL}/contacts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "token": UAZAPI_TOKEN
        }
      });

      const result = await response.json();
      console.log("✅ Contatos recebidos:", result);

      if (response.ok && Array.isArray(result)) {
        console.log(`📞 Encontrados ${result.length} contatos na UAZAPI`);
        return result;
      } else {
        console.log("❌ Erro ao buscar contatos:", result);
        return [];
      }
    } catch (error) {
      console.error("❌ Erro ao buscar contatos UAZAPI:", error);
      return [];
    }
  }

    async buscarContatoPorJid(jid) {
    try {
      const contatos = await this.buscarContatos();
      const contato = contatos.find(c => c.jid === jid);
      return contato || null;
    } catch (error) {
      console.error("❌ Erro ao buscar contato por JID:", error);
      return null;
    }
  }
    async criarMapaContatos() {
    try {
      const contatos = await this.buscarContatos();
      const mapaContatos = new Map();
      
      contatos.forEach(contato => {
        if (contato.jid) {
          const nome = contato.contact_name || 
                       contato.contact_FirstName || 
                       contato.jid.replace('@s.whatsapp.net', '');
          mapaContatos.set(contato.jid, nome);
        }
      });
      
      console.log(`🗺️ Mapa de contatos criado com ${mapaContatos.size} contatos`);
      return mapaContatos;
    } catch (error) {
      console.error("❌ Erro ao criar mapa de contatos:", error);
      return new Map();
    }
  }

  async buscarMensagem(messageId) {
    try {
      console.log(`🔍 Buscando mensagem: ${messageId}`);
      
      const response = await fetch(`${this.baseUrl}/message/find`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          messageId: messageId
        })
      });

      if (!response.ok) {
        console.log(`⚠️ Endpoint /message/find falhou, tentando alternativo`);
        return await this.buscarMensagemAlternativo(messageId);
      }

      const data = await response.json();
      console.log("📦 Mensagem encontrada:", data);
      
      return data;
      
    } catch (error) {
      console.error("❌ Erro ao buscar mensagem:", error);
      return null;
    }
  }

  async downloadMidia(messageId, options = {}) {
    try {
      console.log(`📥 Download de mídia: ${messageId}`);
      
      const payload = {
        id: messageId,
        return_link: true,
        return_base64: false,
        generate_mp3: true
      };

      Object.assign(payload, options);

      const response = await fetch(`${this.baseUrl}/message/download`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("📦 Resposta do download:", {
        fileURL: data.fileURL ? 'PRESENTE' : 'AUSENTE',
        mimetype: data.mimetype,
        hasBase64: !!data.base64Data
      });
      
      return data;
      
    } catch (error) {
      console.error("❌ Erro ao baixar mídia:", error);
      return null;
    }
  }

  async buscarMensagemAlternativo(messageId) {
    try {
      console.log(`🔍 Tentando endpoint alternativo para: ${messageId}`);
      
      const response = await fetch(`${this.baseUrl}/message`, {
        method: 'GET',
        headers: this.headers
      });

      const response2 = await fetch(`${this.baseUrl}/message?id=${messageId}`, {
        method: 'GET',
        headers: this.headers
      });

      if (response2.ok) {
        const data = await response2.json();
        return data;
      }

      throw new Error('Nenhum endpoint funcionou');
      
    } catch (error) {
      console.error("❌ Erro no endpoint alternativo:", error);
      return null;
    }
  }
}

export default new UazapiService();