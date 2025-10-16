import messageService from "../services/messageService.js";
import messageStorage from "../storage/messageStorage.js";
import mediaService from "../services/mediaService.js";
import { userStates, processFlowResponse, startFlow, menuFlows, ATENDENTES, flowSteps } from "../config/constants.js";
import sessionManager from "../manager/sessionManager.js";

export async function handleWebhook(req, res) {
  try {
    console.log("🎉 WEBHOOK RECEBEU MENSAGEM!");
    console.log("=".repeat(60));

    const webhookData = req.body;
    const userPhone = webhookData.message?.sender;
    const userMessage = webhookData.message?.text?.toLowerCase().trim();
    const buttonClicked = webhookData.message?.buttonOrListid;
    const messageId = webhookData.message?.id;

    console.log(`📞 Remetente: ${userPhone}`);
    console.log(`💬 Mensagem: "${userMessage}"`);
    console.log(`🖱️ Botão clicado: ${buttonClicked}`);
    console.log(`🆔 Message ID: ${messageId}`);

    if (buttonClicked) {
      console.log("🔍 ESTRUTURA DO WEBHOOK COM BOTÃO:");
      console.log(JSON.stringify(webhookData, null, 2));
    }

    await messageStorage.sincronizarContatos();

    let currentState = userStates.get(userPhone) || {
      currentMenu: "menu",
      firstMessage: true,
      flow: null,
      flowData: null
    };

    if (userPhone && !messageService.isAtendente(userPhone)) {
      const session = sessionManager.sessions.get(userPhone);

      if (session?.encerramentoFantasmaSent && !session.isInEncerramentoFlow) {
        console.log(`👻🔄 CLIENTE ${userPhone} RESPONDEU APÓS ENCERRAMENTO FANTASMA - RESET COMPLETO`);
        sessionManager.resetSessionCompleta(userPhone);
        currentState = {
          currentMenu: "menu",
          firstMessage: true,
          flow: null,
          flowData: null
        };
        userStates.set(userPhone, currentState);
        console.log(`👻✅ ESTADO COMPLETAMENTE RESETADO para ${userPhone}`);
      }


      if (!sessionManager.isInEncerramentoFlow(userPhone)) {
        sessionManager.markClientActivity(userPhone);
        console.log(`💬 Cliente ${userPhone} respondeu`);
      }
    }

    if (userPhone && !messageService.isAtendente(userPhone) && !sessionManager.isInEncerramentoFlow(userPhone)) {
      sessionManager.registerInactivityCallback(userPhone, async (action) => {
        console.log(`🚀 CALLBACK DE INATIVIDADE: ${action} para ${userPhone}`);

        const currentState = userStates.get(userPhone);
        const currentMenu = currentState?.currentMenu;

        if (currentMenu === "delivery_complete") {
          console.log(`🚫 INATIVIDADE/ENCERRAMENTO BLOQUEADO - AGUARDANDO PRIMEIRA MENSAGEM DO ATENDENTE: ${userPhone}`);
          return;
        }

        const menusSemInatividade = ["menu", "horarios"];
        const isMenuSemInatividade = menusSemInatividade.includes(currentMenu);

        if (isMenuSemInatividade) {
          console.log(`🚫 INATIVIDADE BLOQUEADA para: ${currentMenu}`);
          return;
        }

        if (action === "encerramento") {
          await messageService.sendMessageWithButtons(userPhone, {
            text: `📢 Obrigado por entrar em contato com a Farmácia Oséias! 💊\n\n😊 Esperamos que volte sempre!\n\n📋 Como foi sua experiência?`,
            type: "list",
            listButton: "⭐ Avaliar Atendimento",
            footerText: "Sua avaliação nos ajuda a melhorar!",
            choices: [
              "[Avaliação do Atendimento]",
              "⭐ 1 Estrela|encerramento_1|Nada satisfeito",
              "⭐⭐ 2 Estrelas|encerramento_2|Pouco satisfeito",
              "⭐⭐⭐ 3 Estrelas|encerramento_3|Satisfeito",
              "⭐⭐⭐⭐ 4 Estrelas|encerramento_4|Bem satisfeito",
              "⭐⭐⭐⭐⭐ 5 Estrelas|encerramento_5|Muito satisfeito"
            ]
          });
        } else if (action === "inatividade") {
          await messageService.sendMessageWithButtons(userPhone, menuFlows.inatividade);
        }
      });
    }

    const message = webhookData.message;
    let isMediaMessage = false;
    let mediaType = 'text';

    if (message?.type === 'media' && message?.mediaType) {
      isMediaMessage = true;
      mediaType = message.mediaType;
      console.log(`📦 MÍDIA DETECTADA: ${mediaType} | ID: ${messageId}`);
    }

    if (userPhone && messageService.isAtendente(userPhone) && userMessage && !buttonClicked) {
      console.log(`👨‍💼 ATENDENTE ${userPhone} enviou mensagem direta: "${userMessage}"`);

      const clientPhone = sessionManager.detectClientForAttendeeReply(userPhone);

      if (clientPhone) {
        console.log(`👨‍💼✅ ATENDENTE ${userPhone} RESPONDEU para ${clientPhone} - MENSAGEM: "${userMessage}"`);
        sessionManager.markAttendeeDirectMessage(clientPhone);

        const clientState = userStates.get(clientPhone);
        if (clientState && clientState.currentMenu === "delivery_complete") {
          console.log(`🔄 MUDANDO ESTADO: ${clientPhone} de delivery_complete para atendimento_ativo`);
          clientState.currentMenu = "atendimento_ativo";
        }

      } else {
        console.log(`👨‍💼 ATENDENTE ${userPhone} enviou mensagem geral`);
        sessionManager.markAttendeeMessage(userPhone);
      }
    }

    if (buttonClicked && userPhone && !messageService.isAtendente(userPhone)) {
      const session = sessionManager.sessions.get(userPhone);

      if (session?.isInEncerramentoFlow && !buttonClicked.startsWith("encerramento_")) {
        console.log(`👻🚫 CLIENTE ${userPhone} CLICOU EM BOTÃO ANTIGO APÓS ENCERRAMENTO FANTASMA: ${buttonClicked}`);
        console.log(`👻🔄 IGNORANDO BOTÃO E REENVIANDO MENU INICIAL`);

        sessionManager.resetSessionCompleta(userPhone);

        currentState = {
          currentMenu: "menu",
          firstMessage: true,
          flow: null,
          flowData: null
        };
        userStates.set(userPhone, currentState);

        await messageService.sendMessageWithButtons(userPhone, messageService.getMenuFlow("menu"));
        sessionManager.markBotMessage(userPhone);

        return res.status(200).json({ success: true });
      }
    }

    if (buttonClicked) {
      console.log(`🎯 BOTÃO CLICADO DETECTADO: ${buttonClicked}`);

      currentState.currentMenu = buttonClicked;

      messageStorage.salvarMensagem(userPhone, `[BOTÃO: ${buttonClicked}]`, 'received', 'text');

      if (buttonClicked.startsWith("encerramento_")) {
        const rating = parseInt(buttonClicked.replace("encerramento_", ""));

        sessionManager.startEncerramentoFlow(userPhone, rating);

        sessionManager.unregisterInactivityCallback(userPhone);
        if (rating <= 2) {
          await messageService.sendMessageWithButtons(userPhone, {
            text: menuFlows.encerramento_1_2.text,
            footerText: menuFlows.encerramento_1_2.footerText,
            type: "text"
          });
        } else {
          await messageService.sendMessageWithButtons(userPhone, {
            text: menuFlows.encerramento_3_5.text,
            footerText: menuFlows.encerramento_3_5.footerText,
            type: "text"
          });
        }

        sessionManager.markBotMessage(userPhone);

        return res.status(200).json({ success: true });
      }

      if (buttonClicked === "atendente" || buttonClicked === "aguardar atendente") {
        sessionManager.markContactedAttendee(userPhone);
        console.log(`📞 USUÁRIO ${userPhone} SOLICITOU ATENDENTE - ATIVANDO FLUXO COMPLETO`);
      }

      if (buttonClicked === "delivery" || buttonClicked === "produtos" || buttonClicked === "duvidasgerais") {
        sessionManager.markServiceUsed(userPhone);
        console.log(`🛎️ USUÁRIO ${userPhone} USOU SERVIÇO - PODE AVALIAR`);
      }

      if (buttonClicked === "delivery") {
        console.log("🚚 INICIANDO FLUXO DE DELIVERY");
        currentState.flow = startFlow("delivery");
        currentState.firstMessage = false;
        userStates.set(userPhone, currentState);
        await messageService.sendMessageWithButtons(userPhone, {
          text: flowSteps.delivery_step1.prompt
        });
        sessionManager.markBotMessage(userPhone);
        userStates.set(userPhone, currentState);
        return res.status(200).json({ success: true });
      }

      if (buttonClicked.startsWith("delivery_")) {
        if (buttonClicked === "delivery_confirmar") {

          sessionManager.markDeliveryRegistered(userPhone);
          console.log("✅ PEDIDO DE DELIVERY CONFIRMADO");

          const mensagemAtendente = `🚚 *NOVO PEDIDO DE DELIVERY* 🚚

📍 *Endereço:* ${currentState.flowData.endereco}
📦 *Produto:* ${currentState.flowData.produto}
👤 *Cliente:* ${userPhone}

💬 *Pedido confirmado pelo cliente!*`;

          await messageService.sendMessageWithButtons(userPhone, {
            text: `✅ *Pedido de delivery confirmado!* 🚚

🏠 *Endereço:* ${currentState.flowData.endereco}
📦 *Produto solicitado:* ${currentState.flowData.produto}

⏳ *Em breve um de nossos atendentes informará o valor do frete e disponibilidade do produto!*`
          });

          for (const atendente of ATENDENTES) {
            await messageService.sendMessageWithButtons(atendente, {
              text: mensagemAtendente
            }, true);
          }

          currentState.flow = null;
          currentState.flowData = null;
          currentState.currentMenu = "delivery_complete";

        } else if (buttonClicked === "delivery_editar_endereco") {
          console.log("🔄 EDITANDO ENDEREÇO DO DELIVERY");

          currentState.flow.currentStep = "delivery_step1";
          currentState.flow.editing = true;
          await messageService.sendMessageWithButtons(userPhone, {
            text: `🏠 *Editando Endereço*

📝 *Endereço atual:* ${currentState.flowData.endereco}

💬 *Por favor, digite o novo endereço para entrega:*`
          });

        } else if (buttonClicked === "delivery_editar_produto") {
          console.log("🔄 EDITANDO PRODUTO DO DELIVERY");

          currentState.flow.currentStep = "delivery_step2";
          currentState.flow.editing = true;
          await messageService.sendMessageWithButtons(userPhone, {
            text: `📦 *Editando Produto*

📝 *Produto atual:* ${currentState.flowData.produto}

💬 *Por favor, digite o novo produto ou medicamento desejado:*`
          });
        }

        sessionManager.markBotMessage(userPhone);

        userStates.set(userPhone, currentState);
        return res.status(200).json({ success: true });
      }

      const menuFlow = messageService.getMenuFlow(buttonClicked);
      if (menuFlow) {
        await messageService.sendMessageWithButtons(userPhone, menuFlow);
        currentState.firstMessage = false;
        console.log(`✅ Flow executado: ${buttonClicked}`);
        sessionManager.markBotMessage(userPhone);
      } else {
        console.log(`❌ Flow não encontrado: ${buttonClicked}`);
        await messageService.sendMessageWithButtons(userPhone, messageService.getMenuFlow('menu'));
        sessionManager.markBotMessage(userPhone);
      }

      userStates.set(userPhone, currentState);
      return res.status(200).json({ success: true });
    }

    if (userPhone) {
      if (isMediaMessage && messageId) {
        console.log(`🔄 BAIXANDO MÍDIA DA UAZAPI...`);

        const mediaData = await mediaService.downloadESalvarMidia(messageId);

        if (mediaData && mediaData.url) {
          console.log(`✅ MÍDIA BAIXADA: ${mediaData.url}`);

          let mediaPayload = {
            messageType: mediaType,
            content: mediaData.url,
            caption: message.text || '',
            mimetype: mediaData.mimetype
          };

          if (mediaType === 'audio' || mediaType === 'ptt') {
            mediaPayload.audio = {
              url: mediaData.url,
              mimetype: mediaData.mimetype
            };
          }

          const success = messageStorage.salvarMensagemMidia(userPhone, mediaPayload, 'received');

          if (success) {
            console.log(`✅ Mídia salva com URL pública: ${mediaType}`);

            await messageService.enviarAlertaMidiaAtendente(userPhone, {
              type: mediaType,
              data: {
                url: mediaData.url,
                caption: message.text || '',
                mimetype: mediaData.mimetype
              }
            });
          }
        } else {
          console.log("⚠️ Não foi possível baixar a mídia, salvando referência");
          messageStorage.salvarMensagemMidia(userPhone, {
            messageType: mediaType,
            content: `midia:${messageId}`,
            caption: message.text || '',
            mimetype: getMimeType(mediaType)
          }, 'received');

          await messageService.enviarAlertaMidiaAtendente(userPhone, {
            type: mediaType,
            data: {
              caption: message.text || 'Mídia recebida',
              messageId: messageId
            }
          });
        }

      }
      else if (userMessage && !isMediaMessage) {
        messageStorage.salvarMensagem(userPhone, userMessage, 'received', 'text');
        console.log("💾 Mensagem de texto salva");


        if (!messageService.isAtendente(userPhone) && !sessionManager.isInEncerramentoFlow(userPhone)) {
          await messageService.enviarAlertaAtendente(userPhone, userMessage);
        }


        if (sessionManager.isInEncerramentoFlow(userPhone)) {
          console.log("💬 PROCESSANDO COMENTÁRIO DE AVALIAÇÃO");
          sessionManager.processEncerramentoComment(userPhone, userMessage);

          await messageService.sendMessageWithButtons(userPhone, menuFlows.encerramento_agradecimento);
          sessionManager.markBotMessage(userPhone);

          console.log(`🏁 ATENDIMENTO FINALIZADO para ${userPhone} - RESETANDO ESTADO COMPLETO`);
          sessionManager.endEncerramentoFlow(userPhone);
          sessionManager.unregisterInactivityCallback(userPhone);

          currentState = {
            currentMenu: "menu",
            firstMessage: true,
            flow: null,
            flowData: null
          };

          userStates.set(userPhone, currentState);

          return res.status(200).json({ success: true });
        }
        if (currentState.flow) {
          console.log(`🔄 Usuário ${userPhone} está no fluxo:`, currentState.flow.currentStep);

          const flowResult = processFlowResponse(userPhone, userMessage, currentState);

          if (flowResult) {
            if (flowResult.buttons) {
              await messageService.sendMessageWithButtons(userPhone, {
                text: flowResult.userResponse,
                choices: flowResult.buttons
              });
            } else {
              await messageService.sendMessageWithButtons(userPhone, {
                text: flowResult.userResponse
              });
            }

            sessionManager.markBotMessage(userPhone);

            if (flowResult.notifyAttendants && flowResult.complete) {
              for (const atendente of ATENDENTES) {
                await messageService.sendMessageWithButtons(atendente, {
                  text: flowResult.notifyAttendants
                }, true);
              }
            }

            if (flowResult.resetFlow && flowResult.complete) {
              currentState.flow = null;
              currentState.flowData = null;
              currentState.currentMenu = "menu";
              currentState.firstMessage = true;
            }

            userStates.set(userPhone, currentState);
            return res.status(200).json({ success: true });
          }
        }

        const session = sessionManager.sessions.get(userPhone);
        const isAfterEncerramentoFantasma = session && !session.isInEncerramentoFlow &&
          session.hasContactedAttendee === false &&
          session.hasUsedService === false;

        if (currentState.firstMessage || isAfterEncerramentoFantasma) {
          console.log("🎯 PRIMEIRA MENSAGEM REAL - Mostrando menu");
          await messageService.sendMessageWithButtons(userPhone, messageService.getMenuFlow("menu"));
          currentState.firstMessage = false;
          sessionManager.markBotMessage(userPhone);
        } else {
          console.log("🎯 MENSAGEM SEGUINTE - Mantendo fluxo atual (não mostra menu)");
        }

        userStates.set(userPhone, currentState);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

function getMimeType(mediaType) {
  const mimeTypes = {
    'image': 'image/jpeg',
    'video': 'video/mp4',
    'audio': 'audio/mpeg',
    'document': 'application/pdf',
    'ptt': 'audio/mpeg'
  };
  return mimeTypes[mediaType] || 'application/octet-stream';
}

export default { handleWebhook };