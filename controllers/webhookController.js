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
    if (userPhone) {
      sessionManager.updateActivity(userPhone);

      if (!sessionManager.isInEncerramentoFlow(userPhone)) {
        sessionManager.registerInactivityCallback(userPhone, async (action) => {
          console.log(`🚀 CALLBACK DE INATIVIDADE: ${action} para ${userPhone}`);

          if (action === "encerramento") {
            await messageService.sendMessageWithList(userPhone, menuFlows.encerramento);
          } else if (action === "inatividade") {
            await messageService.sendMessageWithButtons(userPhone, menuFlows.inatividade);
          } else if (action === "session_ended") {
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
      }

      if (buttonClicked.startsWith("encerramento_")) {
        const rating = parseInt(buttonClicked.replace("encerramento_", ""));
        sessionManager.startEncerramentoFlow(userPhone, rating);

        sessionManager.unregisterInactivityCallback(userPhone);

        if (rating <= 2) {
          await messageService.sendMessageWithButtons(userPhone, menuFlows.encerramento_1_2);
        } else {
          await messageService.sendMessageWithButtons(userPhone, menuFlows.encerramento_3_5);
        }

        return res.status(200).json({ success: true });
      }

      if (buttonClicked === "delivery") {
        console.log("🚚 INICIANDO FLUXO DE DELIVERY");
        const currentState = userStates.get(userPhone) || { currentMenu: "menu" };
        currentState.flow = startFlow("delivery");
        userStates.set(userPhone, currentState);
        await messageService.sendMessageWithButtons(userPhone, {
          text: menuFlows.delivery.text
        });
      } else {
        console.log(`🎯 Executando flow: ${buttonClicked}`);
        const menuFlow = messageService.getMenuFlow(buttonClicked);

        if (menuFlow) {
          await messageService.sendMessageWithButtons(userPhone, menuFlow);
          console.log(`✅ Flow executado: ${buttonClicked}`);
        } else {
          console.log(`❌ Flow não encontrado: ${buttonClicked}`);
          await messageService.sendMessageWithButtons(userPhone, messageService.getMenuFlow('menu'));
        }
      }

      return res.status(200).json({ success: true });
    }

    if (userPhone) {
      let currentState = userStates.get(userPhone) || { currentMenu: "menu" };

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
        if (userMessage === "teste inatividade") {
          const session = sessionManager.sessions.get(userPhone);
          if (session) {
            session.lastActivity = Date.now() - 15000;
            console.log("🧪 FORÇANDO 15 SEGUNDOS DE INATIVIDADE PARA TESTE");
          }
        }

        if (!messageService.isAtendente(userPhone)) {
          await messageService.enviarAlertaAtendente(userPhone, userMessage);
          if (sessionManager.isInEncerramentoFlow(userPhone)) {
            console.log("💬 PROCESSANDO COMENTÁRIO DE AVALIAÇÃO");
            sessionManager.processEncerramentoComment(userPhone, userMessage);
            await messageService.sendMessageWithButtons(userPhone, menuFlows.encerramento_agradecimento);
            return res.status(200).json({ success: true });
          }

          if (currentState.flow) {
            console.log(`🔄 Usuário ${userPhone} está no fluxo:`, currentState.flow.currentStep);

            const flowResult = processFlowResponse(userPhone, userMessage, currentState);

            if (flowResult) {
              await messageService.sendMessageWithButtons(userPhone, {
                text: flowResult.userResponse
              });
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
              }

              userStates.set(userPhone, currentState);
              return res.status(200).json({ success: true });
            }
          }

          if (userMessage) {
            const flowToSend = messageService.processarMensagemCliente(userMessage);
            console.log(`🎯 Flow selecionado: ${flowToSend}`);

            if (flowToSend) {
              await messageService.sendMessageWithButtons(userPhone, messageService.getMenuFlow(flowToSend));
            }
          }
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