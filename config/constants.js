export const UAZAPI_TOKEN = "ced89ac6-49ed-4360-a3ed-b06615d05612";
export const UAZAPI_URL = "https://cerasos.uazapi.com";
export const userStates = new Map();

export const menuFlows = {
  "menu": {
    text: `📢 Olá! Seja muito bem-vindo à Farmácia Oséias! 💊

📍 *Endereço físico*: Avenida Nereu Ramos, 141 – Centro
🕒 *Horário de atendimento*: 08h00 às 22h00 (GMT-3)

💬 Como podemos te ajudar hoje?`,
    type: "button",
    footerText: "Farmácia Oséias - Cuidando da sua saúde!",
    choices: [
      "👩‍💼 Falar com atendente|atendente",
      "🛒 Consultar preços|produtos",
      "⏰ Horário Oséias|horarios",
      "🚚 Solicitar delivery|delivery",
      "❓ Dúvidas gerais|duvidasgerais"
    ]
  },

  "atendente": {
    text: ` 👩‍💼 *Falar com atendente* ✔️

⏳ Em breve um de nossos atendentes entrará em contato.
😊 Pedimos, por gentileza, que aguarde um instante.
💬 Fique à vontade para nos contar mais sobre sua situação!

🔄 Enquanto isso, posso ajudar com algo mais?`,
    type: "button",
    footerText: "",
    choices: [
      "🛒 Consultar preços|produtos",
      "🚚 Delivery|delivery",
      "⏳ Aguardar Atendente|aguardar atendente"
    ]
  },

  "aguardar atendente": {
    text: `⏳ Aguardar Atendente ✔️
    
✅ Sem problemas, em breve um de nossos atendentes entrará em contato.
💬 Fique à vontade para nos contar mais sobre sua situação!`
  },

  "produtos": {
    text: `🛒 *Consultar preço dos produtos* ✔️

📋 *Digite o nome do medicamento ou produto desejado*:

⏳ Em breve um de nossos atendentes entrará em contato.`,
  },

  "horarios": {
    text: `⏰ *Atendimento especializado* ✔️

🕒 *Oséias*: segunda à sexta das 16:00 às 19:00.

🕒 *Carol*, filha do Oséias: segunda à sabado das 08:00 às 14:00.

🏪 *Farmácia Oséias*
📍 Avenida Nereu Ramos, 141 – Centro
`,

    type: "button",
    footerText: "Oséias com 43 anos de expêriencia. Carol, filha do Oséias, com 15 anos de experiência!",
    choices: [
      "👩‍💼 Falar com atendente|atendente",
      "🔙 Voltar ao menu|menu"
    ]
  },

  "delivery": {
    text: `🚚 *Solicitar delivery* ✔️

📍 Área de cobertura: Centro e bairros próximos
💰 Taxa de entrega: Variável a depender da distância, consultar valor com atendente.

📍 *Insira seu endereço neste modelo:*
Rua/número/complemento
Bairro`,
    type: "delivery_step1"
  },

  "duvidasgerais": {
    text: `❓ *Dúvidas gerais* ✔️

📋 Fique à vontade para sanar qualquer dúvida em relação a medicamentos, bulas ou demais situações!

⏳ Em breve um de nossos atendentes entrará em contato.

📦 Por favor, *explique* sua dúvida:`,
  },

  "encerramento": {
    text: `📢 Obrigado por entrar em contato com a Farmácia Oséias! 💊

😊 Esperamos que volte sempre!

📋 Como foi sua experiência?
⭐ Nos avalie de 1 a 5 estrelas.`,

    type: "list",
    listButton: "Avaliar",
    footerText: "Sua avaliação nos ajuda a melhorar!",
    choices: [
      "[Avaliação]",
      "⭐ 1 Estrela|encerramento_1|Nada satisfeito",
      "⭐⭐ 2 Estrelas|encerramento_2|Pouco satisfeito",
      "⭐⭐⭐ 3 Estrelas|encerramento_3|Satisfeito",
      "⭐⭐⭐⭐ 4 Estrelas|encerramento_4|Bem satisfeito",
      "⭐⭐⭐⭐⭐ 5 Estrelas|encerramento_5|Muito satisfeito"
    ]
  },

  "encerramento_1_2": {
    text: `😔 Sentimos muito que tenha tido um nível de satisfação tão baixo.

💬 Por favor, adicione um comentário para que possamos te atender de uma melhor forma em um futuro breve.`,
    footerText: "Todos estamos em evolução constante, nos ajude a melhorar.",
    type: "text"
  },

  "encerramento_3_5": {
    text: `😊 Ficamos felizes que tenha tido esse nível de satisfação!

🌟 Esperamos você em breve!

💬 Fique à vontade para adicionar um comentário opcional para que possamos evoluir mais ainda!`,
    footerText: "Sua opinião é muito importante para nós!",
    type: "text"
  },

  "encerramento_feedback": {
    text: `✅ *Muito obrigado pelo seu feedback!*

🏥 Volte sempre à Farmácia Oséias!`,
    footerText: "Agradecemos sua confiança!",
    type: "text"
  },

  "encerramento_1": {
    type: "encerramento_flow",
    rating: 1
  },
  "encerramento_2": {
    type: "encerramento_flow",
    rating: 2
  },
  "encerramento_3": {
    type: "encerramento_flow",
    rating: 3
  },
  "encerramento_4": {
    type: "encerramento_flow",
    rating: 4
  },
  "encerramento_5": {
    type: "encerramento_flow",
    rating: 5
  },

  "encerramento_agradecimento": {
    text: `✅ *Agradecemos o comentário!*

Volte sempre à Farmácia Oséias! 💊`,
    footerText: "Sua opinião é muito valiosa para nós!",
    type: "text"
  },
  "session_ended": {
    text: `🏁 *Atendimento finalizado*
  
Obrigado por entrar em contato com a Farmácia Oséias! 💊

📞 Volte sempre que precisar!`,
    type: "text"
  },

  "inatividade": {
    text: `⏰ Inatividade detectada ⚠️
    
👩‍💼 Nossos atendentes estão te aguardando!

⏳ Caso nenhuma atividade seja detectada dentro de 60 minutos, seu atendimento será encerrado.`,

    footerText: "📋 Se necessário, fique à vontade para realizar outro atendimento!",
  },
};

export const flowSteps = {
  "delivery_step1": {
    prompt: `📍 *Insira seu endereço neste modelo:*
Rua/número/complemento
Bairro`,
    nextStep: "delivery_step2",
    field: "endereco"
  },

  "delivery_step2": {
    prompt: "📋 *Por favor, mencione o produto ou medicamento desejado:*",
    nextStep: "delivery_complete",
    field: "produto"
  },

  "delivery_complete": {
    prompt: `✅ *Pedido de delivery registrado!* 🚚

📍 *Endereço:* {endereco}
📦 *Produto solicitado:* {produto}

⏳ *Em breve um de nossos atendentes informará o valor do frete e disponibilidade do produto!*`,
    final: true
  },

  "encerramento_flow": {
    field: "rating",
    final: false
  },

  "encerramento_comment": {
    prompt: "💬 *Comentário recebido!*",
    final: true
  }
};

export const ATENDENTES = [
  "5547933858953@s.whatsapp.net"
];

export function processFlowResponse(userId, userMessage, currentState) {
  if (!currentState || !currentState.flow) return null;

  const flow = currentState.flow;
  const step = flowSteps[flow.currentStep];

  if (!step) {
    console.log(`❌ Passo não encontrado: ${flow.currentStep}`);
    return null;
  }

  console.log(`🔄 Processando passo: ${flow.currentStep}, campo: ${step.field}`);

  currentState.flowData = currentState.flowData || {};
  currentState.flowData[step.field] = userMessage;

  console.log(`💾 Dados salvos:`, currentState.flowData);

  if (step.nextStep && step.nextStep === "delivery_complete") {
    console.log(`✅ ÚLTIMO PASSO - Preparando mensagem final...`);

    const mensagemAtendente = `🚚 *NOVO PEDIDO DE DELIVERY* 🚚

📍 *Endereço:* ${currentState.flowData.endereco}
📦 *Produto:* ${currentState.flowData.produto}
👤 *Cliente:* ${userId}

💬 *Por favor, verifique o valor do frete e disponibilidade do produto!*`;

    currentState.flow.currentStep = "delivery_complete";

    return {
      userResponse: `✅ *Pedido de delivery registrado!* 🚚

📍 *Endereço:* ${currentState.flowData.endereco}
📦 *Produto solicitado:* ${currentState.flowData.produto}

⏳ *Em breve um de nossos atendentes informará o valor do frete e disponibilidade do produto!*`,
      notifyAttendants: mensagemAtendente,
      complete: true,
      resetFlow: true,
      cancelInactivity: true
    };
  }

  if (step.nextStep) {
    console.log(`➡️ Avançando para: ${step.nextStep}`);
    currentState.flow.currentStep = step.nextStep;
    const nextStep = flowSteps[step.nextStep];

    if (nextStep) {
      return {
        userResponse: nextStep.prompt,
        notifyAttendants: null,
        complete: false,
        resetFlow: false
      };
    }
  }

  console.log(`❌ Nenhum próximo passo definido`);
  return null;
}

export function startFlow(flowType) {
  if (flowType === "delivery") {
    return {
      currentStep: "delivery_step1",
      type: "delivery"
    };
  }
  return null;
}
export function getEncerramentoMessage(rating) {
  if (rating <= 2) {
    return menuFlows.encerramento_1_2;
  } else {
    return menuFlows.encerramento_3_5;
  }
}

export function getFeedbackMessage() {
  return menuFlows.encerramento_feedback;
}