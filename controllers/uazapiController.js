import uazapiService from "../services/uazapiService.js";
import messageService from "../services/messageService.js";

class UazapiController {
  async listarGrupos(req, res) {
    try {
      const grupos = await uazapiService.listarGrupos();
      res.json({
        success: true,
        total: grupos.length,
        grupos: grupos
      });
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  }

  async enviarParaGrupo(req, res) {
    const { groupId, tipo, mensagemPersonalizada } = req.body;
    
    try {
      let messageData;
      
      if (mensagemPersonalizada) {
        messageData = {
          text: mensagemPersonalizada,
          type: "text"
        };
      } else {
        messageData = messageService.getMenuFlow(tipo) || messageService.getMenuFlow("menu");
      }
      
      const payload = {
        number: groupId,
        type: messageData.type,
        text: messageData.text,
        choices: messageData.choices || []
      };

      if (messageData.footerText) {
        payload.footerText = messageData.footerText;
      }

      const result = await uazapiService.sendMessage(payload);
      const success = result && !result.error;
      
      res.json({ success: success });
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  }

  async buscarConversasComNomes(req, res) {
    try {
      const conversas = await uazapiService.buscarConversas();
      const contatos = await uazapiService.buscarContatos();

      const mapaContatos = new Map(
        contatos.map(c => [c.jid, c.contact_name || c.contact_FirstName || "Contato sem nome"])
      );

      const conversasComNomes = conversas.map(c => ({
        ...c,
        nomeContato: mapaContatos.get(c.id) || "Contato sem nome"
      }));

      res.json({ success: true, conversas: conversasComNomes });
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  }

  async sincronizarConversas(req, res) {
    try {
      const conversasUazapi = await uazapiService.buscarConversas();
      const conversasSincronizadas = conversasUazapi.map(conversa => ({
        id: conversa.id,
        name: conversa.name || conversa.contact?.name || conversa.id.replace('@s.whatsapp.net', ''),
        lastMessage: conversa.lastMessage?.content || 'Nova conversa',
        lastActivity: new Date(conversa.lastMessage?.timestamp * 1000 || Date.now()).toISOString(),
        unreadCount: conversa.unreadCount || 0
      }));

      res.json({ 
        success: true, 
        total: conversasSincronizadas.length,
        conversas: conversasSincronizadas 
      });
      
    } catch (error) {
      console.error("❌ Erro ao sincronizar conversas:", error);
      res.json({ success: false, error: error.message });
    }
  }
}

export default new UazapiController();