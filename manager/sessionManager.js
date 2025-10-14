class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.INACTIVITY_TIME = 10 * 1000;
    this.WARNING_TIME = 5 * 1000;
    this.ENCRRAMENTO_TIMEOUT = 5 * 60 * 1000;
    this.inactivityCallbacks = new Map();
    this.lastMessageFrom = new Map();
    console.log("🕒 SESSION MANAGER INICIADO - Verificando inatividade a cada 5s");
    this.startInactivityCheckInterval();
  }

  startInactivityCheckInterval() {
    setInterval(() => {
      this.checkAllSessionsInactivity();
    }, 5 * 1000);
  }

  markDeliveryRegistered(userId) {
    let session = this.sessions.get(userId);
    if (!session) {
      session = this.startSession(userId);
    }

    session.deliveryRegistered = true;
    session.waitingAttendeeResponse = true;
    session.inactivityWarningSent = false;
    session.avaliacaoSent = false;
    session.inatividadeSentTime = null;

    console.log(`🚚✅ DELIVERY REGISTRADO para ${userId} - AGUARDANDO RESPOSTA DO ATENDENTE`);
  }

  checkAllSessionsInactivity() {
    const now = Date.now();
    console.log(`\n🔍 VERIFICANDO INATIVIDADE - ${this.sessions.size} sessões`);

    for (const [userId, session] of this.sessions) {
      const isAtendente = this.isAtendente(userId);
      if (isAtendente) continue;

      const inactiveTime = now - session.lastActivity;
      const lastFrom = this.getLastMessageFrom(userId);

      console.log(`⏰ CLIENTE ${userId}: ${Math.round(inactiveTime / 1000)}s inativo | lastFrom: ${lastFrom}`);
      const shouldCheckInactivity =
        (lastFrom === 'bot' || lastFrom === 'attendee') &&
        !session.isInEncerramentoFlow;

      if (shouldCheckInactivity) {
        const shouldSendInatividade = inactiveTime >= this.WARNING_TIME &&
          !session.inactivityWarningSent;

        if (shouldSendInatividade) {
          console.log(`⚠️⚠️⚠️ CLIENTE NÃO RESPONDEU - ENVIANDO AVISO DE INATIVIDADE (${Math.round(inactiveTime / 1000)}s)`);
          session.inactivityWarningSent = true;
          session.inatividadeSentTime = now;
          this.triggerInactivityCallback(userId, "inatividade");
        }

        const shouldSendAvaliacao = session.inatividadeSentTime &&
          (now - session.inatividadeSentTime >= this.WARNING_TIME) &&
          !session.avaliacaoSent;

        if (shouldSendAvaliacao) {
          console.log(`⭐⭐⭐ CLIENTE NÃO RESPONDEU AO AVISO - ENVIANDO AVALIAÇÃO (${Math.round((now - session.inatividadeSentTime) / 1000)}s após inatividade)`);
          session.avaliacaoSent = true;
          this.triggerInactivityCallback(userId, "encerramento");
        }
      }
    }
  }

  markManualAttendeeReply(clientPhone) {
    let session = this.sessions.get(clientPhone);
    if (!session) {
      session = this.startSession(clientPhone);
    }

    session.lastActivity = Date.now();
    session.waitingClientResponse = true;
    session.inactivityWarningSent = false;
    session.avaliacaoSent = false;
    session.inatividadeSentTime = null;
    session.isInEncerramentoFlow = false;
    this.setLastMessageFrom(clientPhone, 'attendee');

    console.log(`👨‍💼✅ ATENDENTE RESPONDEU MANUALMENTE para ${clientPhone} - RESETANDO TUDO`);
  }

  markBotMessage(userId) {
    let session = this.sessions.get(userId);
    if (!session) {
      session = this.startSession(userId);
    }

    session.lastActivity = Date.now();
    session.inactivityWarningSent = false;
    session.avaliacaoSent = false;
    session.inatividadeSentTime = null;
    this.setLastMessageFrom(userId, 'bot');

    console.log(`🤖✅ BOT ENVIOU MENSAGEM para ${userId} - RESETANDO INATIVIDADE`);
  }

  markAttendeeReplyToClient(clientPhone) {
    let session = this.sessions.get(clientPhone);
    if (!session) {
      session = this.startSession(clientPhone);
    }

    session.lastActivity = Date.now();
    session.inactivityWarningSent = false;
    session.avaliacaoSent = false;
    session.inatividadeSentTime = null;
    session.isInEncerramentoFlow = false;
    this.setLastMessageFrom(clientPhone, 'attendee');

    console.log(`👨‍💼✅ ATENDENTE RESPONDEU para ${clientPhone} - RESETANDO INATIVIDADE`);
  }

  markAttendeeDirectMessage(clientPhone) {
    let session = this.sessions.get(clientPhone);
    if (!session) {
      session = this.startSession(clientPhone);
    }

    session.lastActivity = Date.now();
    session.waitingClientResponse = true;
    session.waitingAttendeeResponse = false;
    session.inactivityWarningSent = false;
    session.avaliacaoSent = false;
    session.inatividadeSentTime = null;
    session.isInEncerramentoFlow = false;
    this.setLastMessageFrom(clientPhone, 'attendee');

    console.log(`👨‍💼✅ ATENDENTE MANDOU MENSAGEM DIRETA para ${clientPhone} - AGORA CLIENTE PRECISA RESPONDER (INATIVIDADE LIGADA)`);
  }
  markAttendeeMessage(userId) {
    let session = this.sessions.get(userId);
    if (!session) {
      session = this.startSession(userId);
    }

    session.lastActivity = Date.now();
    this.setLastMessageFrom(userId, 'attendee');
    console.log(`👨‍💼 ATENDENTE ${userId} enviou mensagem`);
  }

  markClientActivity(userId) {
    let session = this.sessions.get(userId);
    if (!session) {
      session = this.startSession(userId);
    }

    session.lastActivity = Date.now();
    session.inactivityWarningSent = false;
    session.avaliacaoSent = false;
    session.inatividadeSentTime = null;
    this.setLastMessageFrom(userId, 'client');

    console.log(`💬✅ CLIENTE ${userId} RESPONDEU - CANCELANDO INATIVIDADE`);
  }

  markServiceUsed(userId) {
    let session = this.sessions.get(userId);
    if (!session) {
      session = this.startSession(userId);
    }
    session.hasUsedService = true;
    console.log(`🛎️ SERVIÇO MARCADO para ${userId}`);
  }

  markContactedAttendee(userId) {
    let session = this.sessions.get(userId);
    if (!session) {
      session = this.startSession(userId);
    }
    session.hasContactedAttendee = true;
    console.log(`📞 CLIENTE ${userId} SOLICITOU ATENDENTE`);
  }

  hasContactedAttendee(userId) {
    let session = this.sessions.get(userId);
    return session && session.hasContactedAttendee;
  }

  startEncerramentoFlow(userId, rating) {
    let session = this.sessions.get(userId);
    if (!session) {
      session = this.startSession(userId);
    }

    session.encerramentoFlow = {
      rating,
      startTime: Date.now(),
      timeout: setTimeout(() => {
        console.log(`⏰ TIMEOUT AVALIAÇÃO - Fechando atendimento ${userId}`);
        this.endEncerramentoFlow(userId);
      }, this.ENCRRAMENTO_TIMEOUT)
    };

    session.isInEncerramentoFlow = true;
    session.waitingClientResponse = true;
    session.inactivityWarningSent = false;

    console.log(`⭐ INICIANDO FLUXO DE AVALIAÇÃO para ${userId}`);
  }

  endEncerramentoFlow(userId) {
    let session = this.sessions.get(userId);
    if (session && session.encerramentoFlow) {
      if (session.encerramentoFlow.timeout) {
        clearTimeout(session.encerramentoFlow.timeout);
      }
      session.encerramentoFlow = null;
      session.isInEncerramentoFlow = false;
      session.waitingClientResponse = false;
    }
    this.unregisterInactivityCallback(userId);
  }

  processEncerramentoComment(userId, comment) {
    let session = this.sessions.get(userId);
    if (session && session.encerramentoFlow) {
      session.encerramentoFlow.commentReceived = true;
      this.endEncerramentoFlow(userId);
      console.log(`💬 COMENTÁRIO DE AVALIAÇÃO RECEBIDO de ${userId}`);
    }
  }

  isInEncerramentoFlow(userId) {
    let session = this.sessions.get(userId);
    return session && session.encerramentoFlow;
  }

  startSession(userId) {
    const isAtendente = this.isAtendente(userId);

    const session = {
      startTime: Date.now(),
      lastActivity: Date.now(),
      waitingClientResponse: !isAtendente,
      inactivityWarningSent: false,
      avaliacaoSent: false,
      inatividadeSentTime: null,
      isInEncerramentoFlow: false,
      hasContactedAttendee: false,
      hasUsedService: false,
      encerramentoFlow: null
    };

    this.sessions.set(userId, session);
    console.log(`🚀 ${isAtendente ? 'SESSÃO ATENDENTE' : 'SESSÃO CLIENTE'} para ${userId}`);
    return session;
  }

  setLastMessageFrom(userId, senderType) {
    this.lastMessageFrom.set(userId, senderType);
    console.log(`📝 Última mensagem de ${userId}: ${senderType}`);
  }

  getLastMessageFrom(userId) {
    return this.lastMessageFrom.get(userId) || 'none';
  }

  isAtendente(userId) {
    const atendentes = ["5547933858953@s.whatsapp.net"];
    return atendentes.includes(userId);
  }

  triggerInactivityCallback(userId, action) {
    if (this.inactivityCallbacks.has(userId)) {
      const callback = this.inactivityCallbacks.get(userId);
      try {
        console.log(`🚀 EXECUTANDO CALLBACK: ${action} para ${userId}`);
        callback(action);
      } catch (error) {
        console.error(`❌ Erro no callback:`, error);
      }
    }
  }

  registerInactivityCallback(userId, callback) {
    if (!this.isAtendente(userId)) {
      this.inactivityCallbacks.set(userId, callback);
      console.log(`📞✅ CALLBACK REGISTRADO para CLIENTE ${userId}`);
    }
  }

  unregisterInactivityCallback(userId) {
    this.inactivityCallbacks.delete(userId);
    console.log(`📞❌ CALLBACK REMOVIDO para ${userId}`);
  }

  updateActivity(userId) {
    let session = this.sessions.get(userId);
    if (!session) {
      session = this.startSession(userId);
    } else {
      session.lastActivity = Date.now();
    }
  }
}

export default new SessionManager();