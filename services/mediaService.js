import uazapiService from "./uazapiService.js";

class MediaService {
  async buscarMidia(messageId) {
    try {
      console.log(`📥 Baixando mídia via UAZAPI: ${messageId}`);
      
      const downloadData = await uazapiService.downloadMidia(messageId);
      
      if (downloadData && downloadData.fileURL) {
        console.log(`✅ Mídia baixada com sucesso: ${downloadData.fileURL}`);
        return {
          url: downloadData.fileURL,
          mimetype: downloadData.mimetype,
          filename: this.gerarNomeArquivo(downloadData.mimetype, messageId)
        };
      }
      
      console.log("❌ Não foi possível baixar a mídia");
      return null;
      
    } catch (error) {
      console.error("❌ Erro ao baixar mídia:", error);
      return null;
    }
  }

  async downloadESalvarMidia(messageId) {
    try {
      console.log(`💾 Download e salvamento: ${messageId}`);
      
      const downloadData = await uazapiService.downloadMidia(messageId, {
        return_link: true,
        return_base64: false
      });
      
      if (downloadData && downloadData.fileURL) {
        console.log(`✅ Mídia pronta: ${downloadData.fileURL}`);
        return {
          url: downloadData.fileURL,
          mimetype: downloadData.mimetype,
          publicUrl: downloadData.fileURL
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Erro no download:', error);
      return null;
    }
  }

  gerarNomeArquivo(mimetype, messageId) {
    const extensoes = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'application/pdf': 'pdf'
    };
    
    const ext = extensoes[mimetype] || 'bin';
    return `midia_${messageId}.${ext}`;
  }
}

export default new MediaService();