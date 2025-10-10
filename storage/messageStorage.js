import uazapiService from "../services/uazapiService.js";

class MessageStorage {
  constructor() {
    this.mensagensStorage = new Map();
    this.conversasStorage = new Map();
    this.mapaContatos = new Map();
    this.carregarContatos();
  }

  async carregarContatos() {
    try {
      console.log("🔄 Carregando contatos da UAZAPI...");
      this.mapaContatos = await uazapiService.criarMapaContatos();
    } catch (error) {
      console.error("❌ Erro ao carregar contatos:", error);
    }
  }

  async atualizarContatos() {
    await this.carregarContatos();
  }

  obterNomeContato(phone) {
    const nomeSalvo = this.mapaContatos.get(phone);
    if (nomeSalvo) {
      return nomeSalvo;
    }
    return this.formatarNumero(phone);
  }

  formatarNumero(phone) {
    const numeroLimpo = phone.replace('@s.whatsapp.net', '');
    if (numeroLimpo.length === 13 && numeroLimpo.startsWith('55')) {
      const ddd = numeroLimpo.substring(2, 4);
      const parte1 = numeroLimpo.substring(4, 9);
      const parte2 = numeroLimpo.substring(9, 13);
      return `+55 (${ddd}) ${parte1}-${parte2}`;
    }
    return numeroLimpo;
  }

  salvarMensagem(phone, mensagem, tipo = 'received', messageType = 'text') {
    try {
      if (!this.mensagensStorage.has(phone)) {
        this.mensagensStorage.set(phone, []);
      }
      
      const mensagemData = {
        text: messageType === 'text' ? (mensagem.text || mensagem) : (mensagem.caption || ''),
        type: tipo,
        messageType: messageType,
        timestamp: new Date().toISOString(),
        id: Date.now() + Math.random()
      };

      console.log(`💾 Preparando para salvar:`, {
        phone,
        messageType,
        temContent: !!mensagem.content,
        tipoContent: typeof mensagem.content,
        content: mensagem.content
      });

      if (messageType === 'image' && mensagem.content) {
        const url = this.extrairUrlContent(mensagem.content);
        mensagemData.image = {
          url: url,
          caption: mensagem.caption || '',
          convertOptions: mensagem.convertOptions || {}
        };
        console.log(`📷 Imagem salva: ${url}`);
      } 
      else if (messageType === 'video' && mensagem.content) {
        const url = this.extrairUrlContent(mensagem.content);
        mensagemData.video = {
          url: url,
          caption: mensagem.caption || '',
          convertOptions: mensagem.convertOptions || {}
        };
        console.log(`🎥 Vídeo salvo: ${url}`);
      }
else if (messageType === 'audio' && mensagem.content) {
  const url = this.extrairUrlContent(mensagem.content);
  mensagemData.audio = {
    url: url,
    mimetype: mensagem.mimetype || 'audio/mpeg'
  };
  console.log(`🎵 Áudio salvo: ${url}`);
}
else if (messageType === 'ptt' && mensagem.content) {
  const url = this.extrairUrlContent(mensagem.content);
  mensagemData.audio = {
    url: url,
    mimetype: 'audio/mpeg',
    isPTT: true
  };
  console.log(`🎤 PTT salvo: ${url}`);
}
      else if (messageType === 'document' && mensagem.content) {
        const url = this.extrairUrlContent(mensagem.content);
        mensagemData.document = {
          url: url,
          caption: mensagem.caption || '',
          convertOptions: mensagem.convertOptions || {}
        };
        console.log(`📄 Documento salvo: ${url}`);
      }
      
      this.mensagensStorage.get(phone).push(mensagemData);
      
      const nomeContato = this.obterNomeContato(phone);
      
      let lastMessagePreview = this.criarPreviewMensagem(messageType, mensagem);
      
      this.conversasStorage.set(phone, {
        name: nomeContato,
        lastMessage: lastMessagePreview,
        lastActivity: new Date().toISOString(),
        phone: phone,
        messageCount: this.mensagensStorage.get(phone).length,
        originalPhone: phone,
        lastMessageType: messageType
      });
      
      console.log(`💾 Mensagem ${messageType} salva para ${nomeContato} | Preview: ${lastMessagePreview}`);
      
    } catch (error) {
      console.error("❌ Erro ao salvar mensagem:", error);
      this.salvarMensagemFallback(phone, mensagem, tipo, error.message);
    }
  }

extrairUrlContent(content) {
  try {
    console.log("🔍 [EXTRAIR URL] Iniciando extração...");
    console.log("   Tipo do input:", typeof content);
    console.log("   Conteúdo bruto:", content);

    if (content === "undefined") {
      console.log("   🚨 Content é a string 'undefined', retornando null");
      return null;
    }
    
    if (typeof content === 'string' && content.startsWith('http')) {
      console.log("   ✅ URL string direta encontrada");
      return content;
    }
    
    if (typeof content === 'object' && content !== null) {
      console.log("   🗂️ Content é objeto, buscando URL...");
      const url = content.URL || content.url || content.link || content.src;
      if (url && typeof url === 'string' && url.startsWith('http')) {
        console.log("   ✅ URL encontrada no objeto:", url);
        return url;
      }
    }
    
    console.log("   ❌ Não foi possível extrair URL");
    return null;
    
  } catch (error) {
    console.error("❌ Erro ao extrair URL:", error);
    return null;
  }
}

salvarMensagemComUrlManual(phone, mediaType, url, caption = '') {
  try {
    console.log(`🆘 SALVAMENTO MANUAL: ${mediaType} - ${url}`);
    
    const mensagemData = {
      content: url,
      caption: caption,
      convertOptions: {}
    };

    this.salvarMensagem(phone, mensagemData, 'received', mediaType);
    return true;
    
  } catch (error) {
    console.error('❌ Erro no salvamento manual:', error);
    return false;
  }
}

buscarUrlRecursivamente(obj, profundidade = 0) {
  if (profundidade > 5) return null;
  if (typeof obj === 'string' && obj.startsWith('http')) {
    return obj;
  }
  
  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const valor = obj[key];
        
        if (typeof key === 'string' && 
            (key.toLowerCase().includes('url') || 
             key.toLowerCase().includes('link') || 
             key.toLowerCase().includes('src'))) {
          if (typeof valor === 'string' && valor.startsWith('http')) {
            return valor;
          }
        }
        
        const resultado = this.buscarUrlRecursivamente(valor, profundidade + 1);
        if (resultado) return resultado;
      }
    }
  }
  
  return null;
}

  criarPreviewMensagem(messageType, mensagem) {
    switch (messageType) {
      case 'text':
        const texto = typeof mensagem === 'string' ? mensagem : mensagem.text;
        return texto.substring(0, 50) + (texto.length > 50 ? '...' : '');
      case 'image':
        return '📷 Foto' + (mensagem.caption ? `: ${mensagem.caption.substring(0, 30)}...` : '');
      case 'video':
        return '🎥 Vídeo' + (mensagem.caption ? `: ${mensagem.caption.substring(0, 30)}...` : '');
      case 'audio':
        return '🎵 Áudio';
      case 'document':
        return '📄 Documento' + (mensagem.caption ? `: ${mensagem.caption.substring(0, 30)}...` : '');
      default:
        return '📦 Mídia';
    }
  }

  salvarMensagemFallback(phone, mensagem, tipo, errorMsg) {
    try {
      if (!this.mensagensStorage.has(phone)) {
        this.mensagensStorage.set(phone, []);
      }
      
      const mensagemData = {
        text: `[Erro: ${errorMsg}] - ${typeof mensagem === 'string' ? mensagem : JSON.stringify(mensagem).substring(0, 100)}`,
        type: tipo,
        messageType: 'text',
        timestamp: new Date().toISOString(),
        id: Date.now() + Math.random()
      };
      
      this.mensagensStorage.get(phone).push(mensagemData);
      
      const nomeContato = this.obterNomeContato(phone);
      
      this.conversasStorage.set(phone, {
        name: nomeContato,
        lastMessage: mensagemData.text.substring(0, 50),
        lastActivity: new Date().toISOString(),
        phone: phone,
        messageCount: this.mensagensStorage.get(phone).length,
        originalPhone: phone,
        lastMessageType: 'text'
      });
      
      console.log(`💾 Mensagem de fallback salva para ${nomeContato}`);
      
    } catch (fallbackError) {
      console.error("❌ ERRO CRÍTICO no fallback:", fallbackError);
    }
  }

  salvarMensagemEnviada(phone, mensagem, messageType = 'text') {
    this.salvarMensagem(phone, mensagem, 'sent', messageType);
  }

salvarMensagemMidia(phone, mediaPayload, direction = 'received') {
  try {
    console.log(`💾 [MIDIA] Salvando mídia: ${phone}`, {
      type: mediaPayload.messageType,
      content: mediaPayload.content ? 'HAS_CONTENT' : 'NO_CONTENT'
    });

    const url = this.extrairUrlContent(mediaPayload.content);
    
    console.log(`🔗 URL extraída: ${url}`);

    const mensagemData = {
      content: url,
      caption: mediaPayload.caption || '',
      convertOptions: mediaPayload.convertOptions || {}
    };

    this.salvarMensagem(phone, mensagemData, direction, mediaPayload.messageType);
    
    console.log(`✅ Mídia salva com sucesso: ${mediaPayload.messageType}`);
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao salvar mídia:', error);
    return false;
  }
}

generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}

salvarMensagemRecebida(phone, messageData) {
  try {
    console.log(`💾 Salvando mensagem recebida: ${phone}`, {
      messageType: messageData.messageType,
      hasImage: !!messageData.image,
      hasVideo: !!messageData.video,
      hasAudio: !!messageData.audio,
      hasDocument: !!messageData.document
    });

    if (messageData.messageType === 'text') {
      this.salvarMensagem(phone, messageData.text, 'received', 'text');
    } 
    else if (messageData.messageType === 'image' && messageData.image) {
      this.salvarMensagem(phone, {
        content: messageData.image.url,
        caption: messageData.image.caption || '',
        convertOptions: {}
      }, 'received', 'image');
    }
    else if (messageData.messageType === 'video' && messageData.video) {
      this.salvarMensagem(phone, {
        content: messageData.video.url,
        caption: messageData.video.caption || '',
        convertOptions: {}
      }, 'received', 'video');
    }
    else if (messageData.messageType === 'audio' && messageData.audio) {
      this.salvarMensagem(phone, {
        content: messageData.audio.url,
        caption: '',
        convertOptions: {}
      }, 'received', 'audio');
    }
    else if (messageData.messageType === 'document' && messageData.document) {
      this.salvarMensagem(phone, {
        content: messageData.document.url,
        caption: messageData.document.caption || '',
        convertOptions: {}
      }, 'received', 'document');
    }
    else {
      console.log(`❌ Tipo de mensagem não suportado: ${messageData.messageType}`);
      this.salvarMensagem(phone, JSON.stringify(messageData), 'received', 'text');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar mensagem recebida:', error);
    return false;
  }
}
getMimeType(mediaType) {
  const mimeTypes = {
    'image': 'image/jpeg',
    'video': 'video/mp4', 
    'audio': 'audio/mpeg',
    'document': 'application/pdf'
  };
  
  return mimeTypes[mediaType] || 'application/octet-stream';
}

  getMensagens(phone) {
    const mensagens = this.mensagensStorage.get(phone) || [];
    console.log(`📨 Recuperando ${mensagens.length} mensagens para ${phone}`);
    
    mensagens.forEach((msg, index) => {
      console.log(`   ${index + 1}. Tipo: ${msg.messageType} | Texto: ${msg.text?.substring(0, 50)}`);
      if (msg.image) console.log(`      📷 Imagem: ${msg.image.url}`);
      if (msg.video) console.log(`      🎥 Vídeo: ${msg.video.url}`);
      if (msg.audio) console.log(`      🎵 Áudio: ${msg.audio.url}`);
      if (msg.document) console.log(`      📄 Documento: ${msg.document.url}`);
    });
    
    return mensagens;
  }

  getConversas() {
    const conversasArray = Array.from(this.conversasStorage.values());
    conversasArray.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    
    console.log(`📊 Retornando ${conversasArray.length} conversas do storage`);
    conversasArray.forEach((conv, index) => {
      console.log(`   ${index + 1}. ${conv.name}: ${conv.lastMessage} (${conv.lastMessageType})`);
    });
    
    return conversasArray;
  }

  async sincronizarContatos() {
    await this.carregarContatos();
    
    for (const [phone, conversa] of this.conversasStorage) {
      const novoNome = this.obterNomeContato(phone);
      if (novoNome !== conversa.name) {
        conversa.name = novoNome;
        this.conversasStorage.set(phone, conversa);
        console.log(`🔄 Nome atualizado: ${phone} -> ${novoNome}`);
      }
    }
    
    return this.mapaContatos.size;
  }

  limparMensagens(phone) {
    if (this.mensagensStorage.has(phone)) {
      this.mensagensStorage.delete(phone);
      console.log(`🧹 Mensagens de ${phone} limpas`);
    }
    if (this.conversasStorage.has(phone)) {
      this.conversasStorage.delete(phone);
      console.log(`🧹 Conversa de ${phone} removida`);
    }
  }

  getEstatisticas() {
    const totalConversas = this.conversasStorage.size;
    const totalMensagens = Array.from(this.mensagensStorage.values())
      .reduce((total, msgs) => total + msgs.length, 0);
    
    const mensagensPorTipo = {
      text: 0,
      image: 0,
      video: 0,
      audio: 0,
      document: 0
    };
    
    for (const mensagens of this.mensagensStorage.values()) {
      mensagens.forEach(msg => {
        if (mensagensPorTipo[msg.messageType] !== undefined) {
          mensagensPorTipo[msg.messageType]++;
        }
      });
    }
    
    return {
      totalConversas,
      totalMensagens,
      mensagensPorTipo
    };
  }

  adicionarDadosExemplo() {
    const phoneExemplo = "5511994951240@s.whatsapp.net";
    
    if (!this.mensagensStorage.has(phoneExemplo)) {
      this.salvarMensagem(phoneExemplo, "Oi, quero comprar um remédio para dor de cabeça", 'received');
      this.salvarMensagem(phoneExemplo, "Olá! Em que posso ajudar? Temos Dipirona, Dorflex e Tylenol", 'sent');
      this.salvarMensagem(phoneExemplo, "Quero o Dorflex, qual o preço?", 'received');
      this.salvarMensagem(phoneExemplo, "Dorflex está R$ 12,50. Posso enviar o menu de delivery?", 'sent');
      
      console.log("📝 Dados de exemplo adicionados para teste");
    }
  }
}

export default new MessageStorage();