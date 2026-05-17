import { Router } from "express";
import { imagesController } from "@/controllers";
import { authenticate, upload } from "@/middleware";

const imagesRouter = Router();

imagesRouter.use(authenticate);

// POST /api/imagenes/upload
imagesRouter.post(
  "/upload",
  upload.single("imagen"),
  imagesController.uploadAndAnalyze
);

// GET /api/imagenes
imagesRouter.get("/", imagesController.getAll);

// GET /api/imagenes/:id
imagesRouter.get("/:id", imagesController.getOne);

// GET /api/imagenes/:id/file  – sirve el archivo binario
imagesRouter.get("/:id/file", imagesController.serveFile);

// DELETE /api/imagenes/:id
imagesRouter.delete("/:id", imagesController.deleteImage);

export default imagesRouter;
