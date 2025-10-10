import express from "express";
import uazapiController from "../controllers/uazapiController.js";

const router = express.Router();

router.get("/grupos", uazapiController.listarGrupos);
router.post("/enviar-grupo", uazapiController.enviarParaGrupo);
router.get("/conversas-com-nomes", uazapiController.buscarConversasComNomes);
router.get("/sincronizar-conversas", uazapiController.sincronizarConversas);

export default router;