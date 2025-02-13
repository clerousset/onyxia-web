
import type {
    AppThunk,
    Dependencies,
    OidcClientConfig,
    SecretsManagerClientConfig
} from "../setup";
import { assert } from "tsafe/assert";
import type { OidcClient, ParsedJwt } from "lib/ports/OidcClient";

import type { Translation } from "../ports/SecretsManagerClient";
import type { NonPostableEvt } from "evt";
import type { Public_Configuration } from "lib/ports/OnyxiaApiClient";

export type AppConstant = AppConstant.LoggedIn | AppConstant.NotLoggedIn;

export declare namespace AppConstant {

    export type _Common = {
        vaultClientConfig: Readonly<Omit<SecretsManagerClientConfig.Vault,
            "implementation" |
            "evtOidcAccessToken" |
            "renewOidcAccessTokenIfItExpiresSoonOrRedirectToLoginIfAlreadyExpired"
        >>;
        /** NOTE: Convoluted way of pointing to type { KeycloakConfig } from "Keycloak-js" */
        keycloakConfig: Readonly<OidcClientConfig.Keycloak["keycloakConfig"]>;
    };

    export type LoggedIn = _Common & {
        parsedJwt: ParsedJwt;
        regions: Public_Configuration["regions"];
        build: Public_Configuration["build"];
        getEvtSecretsManagerTranslation(): { evtSecretsManagerTranslation: NonPostableEvt<Translation> };
    } & Omit<OidcClient.LoggedIn, "evtOidcTokens">;

    export type NotLoggedIn = _Common & OidcClient.NotLoggedIn;


}

export const name = "appConstants";

const appConstantsByDependenciesRef = new WeakMap<Dependencies, AppConstant>();

export const thunks = {
    "getAppConstants":
        (): AppThunk<Readonly<AppConstant>> => (...args) => {

            const [, , dependencies] = args;

            const appConstants = appConstantsByDependenciesRef.get(dependencies);

            assert(appConstants !== undefined);

            return appConstants;


        },
};

export const privateThunks = {
    "initialize":
        (params: { appConstants: AppConstant; }): AppThunk => async (...args) => {

            const { appConstants } = params;

            const [, , dependencies] = args;

            appConstantsByDependenciesRef.set(dependencies, appConstants);

        }
};