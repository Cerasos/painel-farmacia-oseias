import serverless from "serverless-http";
import app from "../index.js";
import app from "../../api.js";

export const handler = serverless(app);
