class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.contactedAttendees = new Set();
    
    this.TEN_SECONDS = 10 * 1000;
    this.FIVE_SECONDS = 5 * 1000;
    this.THREE_SECONDS = 3 * 1000;
    this.THIRTY_SECONDS = 30 * 1000;
    
    this.inactivityCallbacks = new Map();
    this.processedInactivities = new Set();
    
    this.startCleanupInterval();
    this.startInactivityCheckInterval();
  }

  startInactivityCheckInterval() {
    setInterval(() => {
      this.checkAllSessionsInactivity();
    }, 5 * 1000);
  }

  checkAllSessionsInactivity() {
    const now = Date.now();
    
    for (const [userId, session] of this.sessions) {
      const inactiveTime = now - session.lastActivity;
      
      if (session.encerramentoFlow) {
        continue;
      }
      
      const existingKey = this.findProcessedInactivityKey(userId);
      if (existingKey) {
        continue;
      }
      
      if (!session.hasContactedAttendee && inactiveTime >= this.TEN_SECONDS) {
        console.log(`⏰ ENCERRAMENTO 1 AUTOMÁTICO para ${userId} - ${Math.round(inactiveTime/1000)}seg inatividade`);
        this.processedInactivities.add(`${userId}_encerramento`);
        this.triggerInactivityCallback(userId, "encerramento");
        continue;
      }

      if (session.hasContactedAttendee) {
        if (!session.inactivityWarningSent && inactiveTime >= this.FIVE_SECONDS) {
          session.inactivityWarningSent = true;
          session.warningTime = now;
          console.log(`⚠️ AVISO INATIVIDADE AUTOMÁTICO para ${userId}`);
          this.processedInactivities.add(`${userId}_inatividade`);
          this.triggerInactivityCallback(userId, "inatividade");
          continue;
        }

        if (session.inactivityWarningSent && (now - session.warningTime) >= this.FIVE_SECONDS) {
          console.log(`⏰ ENCERRAMENTO 2 AUTOMÁTICO para ${userId}`);
          this.processedInactivities.add(`${userId}_encerramento`);
          this.triggerInactivityCallback(userId, "encerramento");
          continue;
        }
      }

      if (session.encerramentoFlow && inactiveTime >= this.THREE_SECONDS) {
        console.log(`⏰ ENCERRAMENTO AVALIAÇÃO AUTOMÁTICO para ${userId}`);
        this.endEncerramentoFlow(userId);
        this.processedInactivities.add(`${userId}_session_ended`);
        this.triggerInactivityCallback(userId, "session_ended");
        continue;
      }
    }
  }

  findProcessedInactivityKey(userId) {
    for (const key of this.processedInactivities) {
      if (key.startsWith(userId)) {
        return key;
      }
    }
    return null;
  }

  triggerInactivityCallback(userId, action) {
    if (this.inactivityCallbacks.has(userId)) {
      const callback = this.inactivityCallbacks.get(userId);
      try {
        callback(action);
        
        if (action === "encerramento" || action === "session_ended") {
          setTimeout(() => {
            this.endSession(userId);
          }, 2000);
        }
      } catch (error) {
        console.error(`❌ Erro no callback de inatividade para ${userId}:`, error);
      }
    }
  }

  registerInactivityCallback(userId, callback) {
    this.inactivityCallbacks.set(userId, callback);
  }

  unregisterInactivityCallback(userId) {
    this.inactivityCallbacks.delete(userId);
    for (const key of this.processedInactivities) {
      if (key.startsWith(userId)) {
        this.processedInactivities.delete(key);
      }
    }
  }

  startSession(userId) {
    this.sessions.set(userId, {
      startTime: Date.now(),
      lastActivity: Date.now(),
      hasContactedAttendee: false,
      inactivityWarningSent: false,
      encerramentoFlow: null
    });
  }

  updateActivity(userId) {
    let session = this.sessions.get(userId);
    if (!session) {
      this.startSession(userId);
      session = this.sessions.get(userId);
    }
    session.lastActivity = Date.now();
    
    for (const key of this.processedInactivities) {
      if (key.startsWith(userId)) {
        this.processedInactivities.delete(key);
      }
    }
  }

  markContactedAttendee(userId) {
    const session = this.sessions.get(userId);
    if (session) {
      session.hasContactedAttendee = true;
    }
    this.contactedAttendees.add(userId);
  }

  hasContactedAttendee(userId) {
    const session = this.sessions.get(userId);
    return session ? session.hasContactedAttendee : this.contactedAttendees.has(userId);
  }

  startEncerramentoFlow(userId, rating) {
    const session = this.sessions.get(userId);
    if (session) {
      session.encerramentoFlow = {
        rating: rating,
        startTime: Date.now(),
        commentReceived: false
      };
    }
  }

  endEncerramentoFlow(userId) {
    const session = this.sessions.get(userId);
    if (session) {
      session.encerramentoFlow = null;
    }
  }

  processEncerramentoComment(userId, comment) {
    const session = this.sessions.get(userId);
    if (session && session.encerramentoFlow) {
      session.encerramentoFlow.commentReceived = true;
      session.encerramentoFlow.comment = comment;
      
      this.endEncerramentoFlow(userId);
    }
  }

  isInEncerramentoFlow(userId) {
    const session = this.sessions.get(userId);
    return session && session.encerramentoFlow;
  }

  endSession(userId) {
    this.sessions.delete(userId);
    this.contactedAttendees.delete(userId);
    this.unregisterInactivityCallback(userId);
  }

  cleanupOldSessions() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [userId, session] of this.sessions) {
      if (now - session.lastActivity > this.THIRTY_SECONDS) {
        this.endSession(userId);
        cleanedCount++;
      }
    }
  }

  startCleanupInterval() {
    setInterval(() => {
      this.cleanupOldSessions();
    }, 30 * 1000);
  }

  getStats() {
    return {
      totalSessions: this.sessions.size,
      totalContactedAttendees: this.contactedAttendees.size,
      totalCallbacks: this.inactivityCallbacks.size,
      totalProcessed: this.processedInactivities.size,
      sessions: Array.from(this.sessions.entries()).map(([userId, session]) => ({
        userId,
        inactiveSeconds: Math.round((Date.now() - session.lastActivity) / 1000),
        hasContactedAttendee: session.hasContactedAttendee,
        inEncerramentoFlow: !!session.encerramentoFlow
      }))
    };
  }
}

export default new SessionManager();