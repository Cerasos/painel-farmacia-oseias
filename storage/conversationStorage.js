class ConversationStorage {
  constructor() {
    this.conversas = new Map();
  }

  adicionarConversa(phone, data) {
    const conversaData = {
      phone: phone,
      name: data.name || phone.replace('@s.whatsapp.net', ''),
      lastMessage: data.lastMessage || 'Nova conversa',
      lastActivity: data.lastActivity || new Date().toISOString(),
      messageCount: data.messageCount || 0,
      unreadCount: data.unreadCount || 0,
      status: data.status || 'active'
    };

    this.conversas.set(phone, conversaData);
    return conversaData;
  }

  atualizarConversa(phone, updates) {
    if (this.conversas.has(phone)) {
      const conversa = this.conversas.get(phone);
      this.conversas.set(phone, { ...conversa, ...updates });
      return this.conversas.get(phone);
    }
    return null;
  }

  obterConversa(phone) {
    return this.conversas.get(phone);
  }

  obterTodasConversas() {
    const conversasArray = Array.from(this.conversas.values());
    conversasArray.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    return conversasArray;
  }

  obterConversasPorStatus(status) {
    const conversasArray = this.obterTodasConversas();
    return conversasArray.filter(conversa => conversa.status === status);
  }

  removerConversa(phone) {
    return this.conversas.delete(phone);
  }

  sincronizarComUazapi(conversasUazapi) {
    for (const conversa of conversasUazapi) {
      const phone = conversa.id;
      
      if (!this.conversas.has(phone)) {
        this.adicionarConversa(phone, {
          name: conversa.name || conversa.contact?.name || phone.replace('@s.whatsapp.net', ''),
          lastMessage: conversa.lastMessage?.content || 'Nova conversa',
          lastActivity: new Date(conversa.lastMessage?.timestamp * 1000 || Date.now()).toISOString(),
          messageCount: 0,
          unreadCount: conversa.unreadCount || 0
        });
        
        console.log(`✅ Conversa sincronizada: ${phone}`);
      } else {
        this.atualizarConversa(phone, {
          lastMessage: conversa.lastMessage?.content || this.conversas.get(phone).lastMessage,
          lastActivity: new Date(conversa.lastMessage?.timestamp * 1000 || Date.now()).toISOString(),
          unreadCount: conversa.unreadCount || this.conversas.get(phone).unreadCount
        });
      }
    }
  }

  obterEstatisticas() {
    const todasConversas = this.obterTodasConversas();
    return {
      total: todasConversas.length,
      ativas: todasConversas.filter(c => c.status === 'active').length,
      emEspera: todasConversas.filter(c => c.status === 'waiting').length,
      finalizadas: todasConversas.filter(c => c.status === 'ended').length,
      totalMensagens: todasConversas.reduce((sum, conv) => sum + conv.messageCount, 0)
    };
  }
}

export default new ConversationStorage();