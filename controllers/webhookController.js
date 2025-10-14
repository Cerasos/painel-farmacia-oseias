import messageService from "../services/messageService.js";
import messageStorage from "../storage/messageStorage.js";
import mediaService from "../services/mediaService.js";
import { userStates, processFlowResponse, startFlow, menuFlows, ATENDENTES } from "../config/constants.js";
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

    if (userPhone) {
      if (messageService.isAtendente(userPhone)) {
        const messageContext = webhookData.message?.content?.contextInfo;

        if (messageContext?.participant) {
          const clientPhone = messageContext.participant;
          sessionManager.markAttendeeReplyToClient(clientPhone);
          console.log(`👨‍💼✅ ATENDENTE ${userPhone} RESPONDEU AO CLIENTE ${clientPhone} VIA CONTEXTO`);
        } else {
          console.log(`👨‍💼 ATENDENTE ${userPhone} enviou mensagem direta`);

          for (const [clientId, session] of sessionManager.sessions) {
            if (!sessionManager.isAtendente(clientId) && session.hasContactedAttendee) {
              sessionManager.markAttendeeDirectMessage(clientId);
              console.log(`👨‍💼✅ ATENDENTE RESPONDEU DIRETAMENTE para ${clientId}`);
              break;
            }
          }
          sessionManager.markAttendeeMessage(userPhone);
        }
      } else {
        sessionManager.markClientActivity(userPhone);
        console.log(`💬 Cliente ${userPhone} respondeu`);
      }

      if (!sessionManager.isInEncerramentoFlow(userPhone)) {
        sessionManager.registerInactivityCallback(userPhone, async (action) => {
          console.log(`🚀 CALLBACK DE INATIVIDADE: ${action} para ${userPhone}`);

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
    }
    const message = webhookData.message;
    let isMediaMessage = false;
    let mediaType = 'text';

    if (message?.type === 'media' && message?.mediaType) {
      isMediaMessage = true;
      mediaType = message.mediaType;
      console.log(`📦 MÍDIA DETECTADA: ${mediaType} | ID: ${messageId}`);
    }

    if (buttonClicked) {
      console.log(`🎯 BOTÃO CLICADO DETECTADO: ${buttonClicked}`);

      messageStorage.salvarMensagem(userPhone, `[BOTÃO: ${buttonClicked}]`, 'received', 'text');

      if (buttonClicked === "atendente" || buttonClicked === "aguardar atendente") {
        sessionManager.markContactedAttendee(userPhone);
        console.log(`📞 USUÁRIO ${userPhone} SOLICITOU ATENDENTE - ATIVANDO FLUXO COMPLETO`);
      }

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

        return res.status(200).json({ success: true });
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
          text: menuFlows.delivery.text
        });
        sessionManager.markBotMessage(userPhone);
      } else {
        console.log(`🎯 Executando flow: ${buttonClicked}`);
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


        if (!messageService.isAtendente(userPhone)) {
          await messageService.enviarAlertaAtendente(userPhone, userMessage);

          if (sessionManager.isInEncerramentoFlow(userPhone)) {
            console.log("💬 PROCESSANDO COMENTÁRIO DE AVALIAÇÃO");
            sessionManager.processEncerramentoComment(userPhone, userMessage);

            await messageService.sendMessageWithButtons(userPhone, menuFlows.encerramento_agradecimento);
            sessionManager.markBotMessage(userPhone);

            console.log(`🏁 ATENDIMENTO FINALIZADO para ${userPhone} - RESETANDO ESTADO`);
            sessionManager.endEncerramentoFlow(userPhone);
            sessionManager.unregisterInactivityCallback(userPhone);
            userStates.set(userPhone, {
              currentMenu: "menu",
              firstMessage: true,
              flow: null,
              flowData: null
            });

            return res.status(200).json({ success: true });
          }

          if (currentState.flow) {
            console.log(`🔄 Usuário ${userPhone} está no fluxo:`, currentState.flow.currentStep);

            const flowResult = processFlowResponse(userPhone, userMessage, currentState);

            if (flowResult) {
              await messageService.sendMessageWithButtons(userPhone, {
                text: flowResult.userResponse
              });
              sessionManager.markBotMessage(userPhone);

              //if (flowResult.cancelInactivity && flowResult.complete) {
              //sessionManager.unregisterInactivityCallback(userPhone);
              //console.log(`FLUXO DE INATIVIDADE CANCELADO para ${userPhone} - PEDIDO DELIVERY REGISTRADO`);
              //}

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

          if (currentState.firstMessage) {
            console.log("🎯 PRIMEIRA MENSAGEM - Mostrando menu");
            await messageService.sendMessageWithButtons(userPhone, messageService.getMenuFlow("menu"));
            currentState.firstMessage = false;

            sessionManager.markBotMessage(userPhone);
          } else {
            console.log("🎯 MENSAGEM SEGUINTE - Mantendo fluxo atual");
          }

          userStates.set(userPhone, currentState);
        }
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