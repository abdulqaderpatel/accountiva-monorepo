import { createAuthClient } from "better-auth/vue";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { authBaseURL } from "./api-base";

export { authBaseURL } from "./api-base";

export const authClient = createAuthClient({
    baseURL: authBaseURL,
    basePath: "/api/auth",
    fetchOptions: {
        credentials: "include"
    },
    plugins: [
        inferAdditionalFields({
            user: {
                plan_id: { type: "string", required: false }
            }
        })
    ]
});
