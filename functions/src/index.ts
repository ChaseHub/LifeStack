import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

export const apiHealth = onRequest((request, response) => {
  logger.info("apiHealth called", { structuredData: true });
  response.json({
    status: "healthy",
    service: "LifeStack Serverless Cloud Functions",
    runtime: "Node.js 22",
    timestamp: new Date().toISOString()
  });
});
