import { Router } from "express";

export const exportsRouter = Router();

exportsRouter.post("/png", (_req, res) => {
  res.status(202).json({ ok: true, message: "PNG export is handled client-side for the current page." });
});

exportsRouter.post("/pdf", (_req, res) => {
  res.status(501).json({ ok: false, message: "PDF export endpoint is reserved for the next backend export pass." });
});
