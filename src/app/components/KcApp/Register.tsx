import { useCallback, useState, useMemo, memo } from "react";
import { Template } from "./Template";
import type { KcProps } from "keycloakify/lib/components/KcProps";
import type { KcContext } from "keycloakify/lib/KcContext";
import { useKcMessage } from "keycloakify/lib/i18n/useKcMessage";
import { cx } from "tss-react";
import { TextField } from "onyxia-ui";
import type { TextFieldProps } from "onyxia-ui";
import { useTranslation } from "app/i18n/useTranslations";
import { useCallbackFactory } from "powerhooks";
import { emailRegExp } from "app/tools/emailRegExp";
import type { Param0 } from "tsafe";
import { Button } from "app/theme";
import { createUseClassNames } from "app/theme";
import { useConstCallback } from "powerhooks";
import { capitalize } from "app/tools/capitalize";
import { Tooltip } from "onyxia-ui";

//NOTE: Client side validation only the actual policy is set on the Keycloak server.
const passwordMinLength = 12

function toAlphaNumerical(value: string) {
    return value.replace(/[^a-zA-Z0-9]/g, "x");
}

const targets = ["firstName", "lastName", "email", "username", "password", "password-confirm"] as const;

const { useClassNames } = createUseClassNames()(
    theme => ({
        "root": {
            "& .MuiTextField-root": {
                "width": "100%",
                "marginTop": theme.spacing(5)
            }
        },
        "buttonsWrapper": {
            "marginTop": theme.spacing(7),
            "display": "flex",
            "justifyContent": "flex-end"
        },
        "buttonSubmit": {
            "marginLeft": theme.spacing(1)
        }
    })
);


export const Register = memo(({ kcContext, ...props }: { kcContext: KcContext.Register; } & KcProps) => {

    const { msg, msgStr } = useKcMessage();

    const {
        url,
        register,
        realm,
        passwordRequired,
        recaptchaRequired,
        recaptchaSiteKey,
        authorizedMailDomains
    } = kcContext;

    const [firstName, setFirstName] = useState(register.formData.firstName ?? "");
    const [lastName, setLastName] = useState(register.formData.lastName ?? "");

    const usernameDefaultValue = useMemo(
        () => toAlphaNumerical(`${firstName[0] ?? ""}${lastName}`).toLowerCase(),
        [firstName, lastName]
    );

    const [username, setUsername] = useState(usernameDefaultValue);
    const [password, setPassword] = useState("");

    const { t } = useTranslation("Register");

    const getIsValidValueFactory = useCallbackFactory(
        (
            [target]: ["firstName" | "lastName" | "email" | "username" | "password"],
            [value]: [string]
        ) => {

            if (value === "") {
                return {
                    "isValidValue": false,
                    "message": t("required field")
                };
            }

            switch (target) {
                case "firstName":
                case "lastName":
                    if (!/^[\p{L} ,.'-]+$/u.test(value)) {
                        return {
                            "isValidValue": false,
                            "message": t("not a valid", { "what": msgStr(target) })
                        };
                    }
                    break;
                case "email":
                    if (!emailRegExp.test(value)) {
                        return {
                            "isValidValue": false,
                            "message": t("not a valid", { "what": msgStr(target) })
                        };
                    }
                    if (authorizedMailDomains !== undefined) {
                        if (
                            !authorizedMailDomains
                                .map(domainWithWildcard=> domainWithWildcard.replace(/\^*.\?/, ""))
                                .find(domain => new RegExp(`[@.]${domain}$`, "i").test(value))
                        ) {
                            return {
                                "isValidValue": false,
                                "message": ""
                            };
                        }
                    }
                    break;
                case "username":
                    if (!/^[a-zA-Z0-9]+$/.test(value)) {
                        return {
                            "isValidValue": false,
                            "message": ""
                        };
                    }
                    break;
                case "password":
                    if (value.length < passwordMinLength) {
                        return {
                            "isValidValue": false,
                            "message": ""
                        };
                    }
                    if (value === username) {
                        return {
                            "isValidValue": false,
                            "message": t("must be different from username")
                        };
                    }
                    break;
            }

            return { "isValidValue": true } as const;

        }
    );

    //NOTE: We set it apparat because the reference of the function
    //has to change when the password changes.
    const getIsPasswordConfirmValidValue =
        useCallback(
            (value: string) => {

                if (value !== "" && password !== value) {
                    return {
                        "isValidValue": false,
                        "message": t("password mismatch")
                    };
                }

                return { "isValidValue": true } as const;

            },
            [password, t]
        );

    const { areAllTargetsValid, setIsTargetValid } = (function useClosure() {

        const [validTargets, setValidTargets] = useState(new Set<typeof targets[number]>());

        function setIsTargetValid(
            params: {
                target: typeof targets[number];
                isValidValue: boolean;
            }
        ) {
            const { target, isValidValue } = params;
            validTargets[isValidValue ? "add" : "delete"](target);
            setValidTargets(new Set(validTargets));
        }

        const areAllTargetsValid = validTargets.size === targets.length;

        return { setIsTargetValid, areAllTargetsValid };


    })();

    const onValueBeingTypedChangeFactory = useCallbackFactory(
        (
            [target]: [typeof targets[number]],
            [params]: [Param0<TextFieldProps["onValueBeingTypedChange"]>]
        ) => {


            const { value, isValidValue } = params;

            setIsTargetValid({ target, isValidValue })

            switch (target) {
                case "firstName": setFirstName(value); break;
                case "lastName": setLastName(value); break;
                case "username": setUsername(value); break;
                case "password": setPassword(value); break;
            }
        }
    );



    const redirectToLogin = useConstCallback(() => window.location.href = url.loginUrl);

    const { classNames } = useClassNames({});

    return (
        <Template
            {...{ kcContext, ...props }}
            headerNode={msg("registerTitle")}
            formNode={
                <form className={classNames.root} action={url.registrationAction} method="post">

                    <>
                        {
                            targets.map(
                                (target, i) =>
                                    (
                                        target === "firstName" ||
                                        target === "lastName" ||
                                        target === "email" ||
                                        (target === "username" && !realm.registrationEmailAsUsername) ||
                                        ((target === "password" || target === "password-confirm") && passwordRequired)
                                    ) &&
                                    <div key={i}>
                                        <TextField
                                            name={target}
                                            type={(() => {
                                                switch (target) {
                                                    case "email": return "email";
                                                    case "password":
                                                    case "password-confirm":
                                                        return "password";
                                                    default: return "text";
                                                }
                                            })()}
                                            inputProps_aria-label={target}
                                            inputProps_tabIndex={target === "username" ? -1 : i + 1}
                                            inputProps_autoFocus={i === 0}
                                            inputProps_spellCheck={false}
                                            autoComplete={
                                                (() => {
                                                    switch (target) {
                                                        case "password-confirm": return undefined;
                                                        default: return "on"
                                                    }
                                                })()
                                            }
                                            doOnlyValidateInputAfterFistFocusLost={
                                                (() => {
                                                    switch (target) {
                                                        case "email": return true;
                                                        default: return false;
                                                    }
                                                })()

                                            }
                                            transformValueBeingTyped={
                                                (() => {
                                                    switch (target) {
                                                        case "firstName":
                                                        case "lastName":
                                                            return capitalize;
                                                        default: return undefined;
                                                    }
                                                })()
                                            }
                                            label={msg(target === "password-confirm" ? "passwordConfirm" : target)}
                                            onValueBeingTypedChange={onValueBeingTypedChangeFactory(target)}
                                            helperText={
                                                (() => {
                                                    switch (target) {
                                                        case "email": return t("allowed email domains");
                                                        case "username": return t("alphanumerical chars only");
                                                        case "password": return t("minimum length", { "n": `${passwordMinLength}` });
                                                        default: return undefined;
                                                    }
                                                })()
                                            }
                                            questionMarkHelperText={
                                                (() => {
                                                    switch (target) {
                                                        case "email": return authorizedMailDomains?.join(", ");
                                                        case "username": return t("username question mark helper text");
                                                        default: return undefined;
                                                    }
                                                })()
                                            }
                                            defaultValue={target !== "username" ? "" : usernameDefaultValue}
                                            getIsValidValue={
                                                (() => {
                                                    switch (target) {
                                                        case "password-confirm": return getIsPasswordConfirmValidValue;
                                                        default: return getIsValidValueFactory(target)
                                                    }
                                                })()
                                            }
                                        />
                                    </div>
                            )
                        }
                    </>
                    {
                        recaptchaRequired &&
                        <div className="form-group">
                            <div className={cx(props.kcInputWrapperClass)}>
                                <div className="g-recaptcha" data-size="compact" data-sitekey={recaptchaSiteKey}></div>
                            </div>
                        </div>
                    }
                    <div className={classNames.buttonsWrapper}>
                        <Button
                            color="secondary"
                            onClick={redirectToLogin}
                            tabIndex={-1}
                        >
                            {t("go back")}
                        </Button>
                        <Tooltip title={areAllTargetsValid ? "" : t("form not filled properly yet")}>
                            <span>
                                <Button
                                    className={cx(classNames.buttonSubmit)}
                                    disabled={!areAllTargetsValid}
                                    type="submit"
                                    tabIndex={6}
                                >
                                    {msgStr("doRegister")}
                                </Button>
                            </span>
                        </Tooltip>
                    </div>
                </form>
            }
        />
    );
});

export declare namespace Register {

    export type I18nScheme = {
        'required field': undefined;
        'not a valid': { what: string; };
        'allowed email domains': undefined;
        'alphanumerical chars only': undefined;
        'username question mark helper text': undefined;
        'minimum length': { n: string; };
        'must be different from username': undefined;
        'password mismatch': undefined;
        'go back': undefined;
        'form not filled properly yet': undefined;
    };

}
