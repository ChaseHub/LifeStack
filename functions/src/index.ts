import { configureGlobalFunctionOptions } from "./config/firebase.js";

configureGlobalFunctionOptions();

export { apiHealth } from "./http/api-health.js";
export { authUserCreated, authUserDeleted } from "./triggers/auth.triggers.js";
export { getMyProfile } from "./callables/get-my-profile.js";
