import { Router } from "express";
import authRouter from "./auth";
import imagesRouter from "./imagenes";
import analisisRouter from "./analisis";
import reportsRouter from "./reports";
import bitacorasRouter from "./bitacoras";
import dashboardRouter from "./dashboard";
import userRouter from "./usuarios";

const routes = Router();

routes.use("/auth", authRouter);
routes.use("/usuarios", userRouter);
routes.use("/imagenes", imagesRouter);
routes.use("/analisis", analisisRouter);
routes.use("/reportes", reportsRouter);
routes.use("/bitacoras", bitacorasRouter);
routes.use("/dashboard", dashboardRouter);

export default routes;
