export const UAZAPI_TOKEN = "ced89ac6-49ed-4360-a3ed-b06615d05612";
export const UAZAPI_URL = "https://cerasos.uazapi.com";

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

📋 *Digite o nome do medicamento ou produto desejado*:`,
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
      "[⭐]",
      "Nada satisfeito",
      "[⭐⭐]",
      "Pouco satisfeito",
      "[⭐⭐⭐]",
      "Satisfeito",
      "[⭐⭐⭐⭐]",
      "Bem satisfeito",
      "[⭐⭐⭐⭐⭐]",
      "Muito satisfeito"
    ]

  },

  "inatividade": {
    text: `⏰ Inatividade detectada ⚠️
    
👩‍💼 Nossos atendentes estão te aguardando!

⏳ Caso nenhuma atividade seja detectada dentro de 60 minutos, seu atendimento será encerrado.`,

    footerText: "📋 Se necessário, fique à vontade para realizar outro atendimento!",
  },

};

export const ATENDENTES = [
  "5547933858953@s.whatsapp.net"
];