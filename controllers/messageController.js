import messageService from "../services/messageService.js";
import messageStorage from "../storage/messageStorage.js";
import uazapiService from "../services/uazapiService.js";

class MessageController {
  async enviarMensagem(req, res) {
    try {
      const { to, message } = req.body;
      
      messageStorage.salvarMensagemEnviada(to, message);
      const success = await messageService.sendMessageWithButtons(to, { text: message });
      
      res.json({ success: success });
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  }

  async enviarMensagemRapida(req, res) {
    try {
      const { to, tipo } = req.body;
      const success = await messageService.sendMessageWithButtons(to, messageService.getMenuFlow(tipo));
      res.json({ success: success });
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  }

  async enviarMensagemTeste(req, res) {
    try {
      const { to, tipo } = req.body;
      const success = await messageService.sendMessageWithButtons(to, messageService.getMenuFlow(tipo));
      res.json({ success: success });
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  }

  async listarConversas(req, res) {
    try {
      await messageStorage.sincronizarContatos();
      
      const conversasArray = messageStorage.getConversas();
      
      console.log(`📊 Retornando ${conversasArray.length} conversas com nomes atualizados`);
      
      res.json({ 
        success: true, 
        conversations: conversasArray 
      });
    } catch (error) {
      console.error("❌ Erro ao buscar conversas:", error);
      res.json({ success: false, error: error.message });
    }
  }

  async obterMensagens(req, res) {
    try {
      const phone = req.params.phone;
      const mensagens = messageStorage.getMensagens(phone);
      
      mensagens.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      console.log(`📨 Retornando ${mensagens.length} mensagens para: ${phone}`);
      const mensagensComMidia = mensagens.filter(msg => 
        msg.messageType && ['image', 'video', 'audio', 'document'].includes(msg.messageType)
      );
      
      if (mensagensComMidia.length > 0) {
        console.log(`📸 Encontradas ${mensagensComMidia.length} mensagens de mídia:`);
        mensagensComMidia.forEach((msg, index) => {
          console.log(`   ${index + 1}. Tipo: ${msg.messageType}`);
          if (msg.image) console.log(`      Imagem URL: ${msg.image.url}`);
          if (msg.video) console.log(`      Vídeo URL: ${msg.video.url}`);
        });
      }
      
      res.json({ 
        success: true, 
        messages: mensagens 
      });
    } catch (error) {
      console.error("❌ Erro ao buscar mensagens:", error);
      res.json({ success: false, error: error.message });
    }
  }

  async processarMidia(req, res) {
    try {
      const { from, type, data } = req.body;
      
      console.log(`📥 Processando mídia recebida de ${from}:`, { type, data });
      const midiaData = await messageService.processarMidiaRecebida({
        from: from,
        type: type,
        data: data
      });
      
      if (midiaData) {
        await messageService.enviarAlertaMidiaAtendente(from, midiaData);
        
        res.json({ 
          success: true, 
          message: 'Mídia processada com sucesso',
          midia: midiaData 
        });
      } else {
        res.json({ 
          success: false, 
          error: 'Falha ao processar mídia' 
        });
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar mídia:', error);
      res.json({ success: false, error: error.message });
    }
  }

  async testarAlertaAtendente(req, res) {
    const { numeroCliente, mensagem } = req.body;
    
    try {
      const success = await messageService.enviarAlertaAtendente(numeroCliente, mensagem);
      res.json({ success: success });
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  }

  async sincronizarContatos(req, res) {
    try {
      const totalContatos = await messageStorage.sincronizarContatos();
      
      res.json({ 
        success: true, 
        message: `✅ ${totalContatos} contatos sincronizados`,
        totalContatos: totalContatos
      });
    } catch (error) {
      console.error("❌ Erro ao sincronizar contatos:", error);
      res.json({ success: false, error: error.message });
    }
  }

  async obterContatos(req, res) {
    try {
      const contatos = await uazapiService.buscarContatos();
      
      res.json({ 
        success: true, 
        total: contatos.length,
        contatos: contatos 
      });
    } catch (error) {
      console.error("❌ Erro ao buscar contatos:", error);
      res.json({ success: false, error: error.message });
    }
  }
}

export default new MessageController();