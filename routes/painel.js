import express from "express";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

router.get("/painel", (req, res) => {
  res.sendFile(join(__dirname, '../public/painel.html'));
});

router.get("/", (req, res) => {
  const html = `<!DOCTYPE html>...`;
  res.send(html);
});

export default router;