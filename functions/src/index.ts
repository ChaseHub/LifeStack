import { configureGlobalFunctionOptions, getAdminApp } from "./config/firebase.js";

configureGlobalFunctionOptions();
getAdminApp();

export { apiHealth } from "./http/api-health.js";
export { authUserCreated, authUserDeleted } from "./triggers/auth.triggers.js";
export { getMyProfile } from "./callables/get-my-profile.js";
