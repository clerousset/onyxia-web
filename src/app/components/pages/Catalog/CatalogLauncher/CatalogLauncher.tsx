/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, memo } from "react";
import { createUseClassNames } from "app/theme";
import { routes } from "app/routes/router";
import type { Route } from "type-route";
import { CatalogLauncherMainCard } from "./CatalogLauncherMainCard";
import {
    CatalogLauncherConfigurationCard,
    Props as CatalogLauncherConfigurationCardProps
} from "./CatalogLauncherConfigurationCard";
import { useDispatch, useSelector } from "app/interfaceWithLib/hooks";
import { thunks, selectors } from "lib/useCases/launcher";
import { thunks as restorablePackageConfigsThunks, pure as restorablePackageConfigsPure } from "lib/useCases/restorablePackageConfigs";
import { useConstCallback } from "powerhooks";
import { copyToClipboard } from "app/tools/copyToClipboard";
import { assert } from "tsafe/assert";
import { showSplashScreen, hideSplashScreen } from "onyxia-ui";

export type Props = {
    className?: string;
    route: Route<typeof routes.catalogLauncher>;
};

const { useClassNames } = createUseClassNames()(
    theme => ({
        "wrapperForScroll": {
            "height": "100%",
            "overflow": "auto",
        },
        "wrapperForMawWidth": {
            "maxWidth": 1200,
            "& > *": {
                "marginBottom": theme.spacing(2)
            }
        }
    })
);

export const CatalogLauncher = memo((props: Props) => {

    const { className, route } = props;

    const dispatch = useDispatch();

    useEffect(
        () => {

            const {
                catalogId,
                packageName,
                formFieldsValueDifferentFromDefault
            } = route.params;

            dispatch(thunks.initialize({
                catalogId,
                packageName,
                formFieldsValueDifferentFromDefault
            }));

            return () => dispatch(thunks.reset());

        },
        []
    );


    const restorablePackageConfig = useSelector(selectors.restorablePackageConfigSelector);


    useEffect(
        () => {

            if (restorablePackageConfig === undefined) {
                return;
            }

            const { catalogId, packageName, formFieldsValueDifferentFromDefault } = restorablePackageConfig;

            routes.catalogLauncher({
                catalogId,
                packageName,
                formFieldsValueDifferentFromDefault
            }).replace();

        },
        [restorablePackageConfig ?? Object]
    );

    const restorablePackageConfigs = useSelector(state => state.restorablePackageConfig.restorablePackageConfigs);

    const [isBookmarked, setIsBookmarked] = useState(false);

    useEffect(
        () => {

            if (restorablePackageConfig === undefined) {
                return;
            }

            setIsBookmarked(
                restorablePackageConfigsPure.isRestorablePackageConfigInStore({
                    restorablePackageConfigs,
                    restorablePackageConfig
                })
            );

        },
        [restorablePackageConfigs, restorablePackageConfig]
    );

    const { classNames } = useClassNames({});

    const onRequestLaunch = useConstCallback(() =>
        dispatch(thunks.launch())
    );

    const onRequestCancel = useConstCallback(() =>
        routes.catalogExplorer({ "catalogId": route.params.catalogId }).push()
    );

    const onFormValueChange = useConstCallback<CatalogLauncherConfigurationCardProps["onFormValueChange"]>(
        ({ path, value }) => dispatch(thunks.changeFormFieldValue({ path, value }))
    );

    const onRequestCopyLaunchUrl = useConstCallback(
        () => copyToClipboard(window.location.href)
    );

    const onFriendlyNameChange = useConstCallback(
        (friendlyName: string) =>
            dispatch(thunks.changeFriendlyName(friendlyName))
    );

    const onIsBookmarkedValueChange = useConstCallback(
        (isBookmarked: boolean) => {
            assert(restorablePackageConfig !== undefined);
            dispatch(
                restorablePackageConfigsThunks[
                    isBookmarked ?
                        "saveRestorablePackageConfig" :
                        "deleteRestorablePackageConfig"
                ](
                    { restorablePackageConfig }
                )
            );
        }
    );

    const friendlyName = useSelector(selectors.friendlyNameSelector);

    const state = useSelector(state => state.launcher);

    useEffect(
        () => {
            switch (state.stateDescription) {
                case "not initialized":
                    showSplashScreen({ "enableTransparency": true });
                    break;
                case "ready":
                    switch (state.launchState) {
                        case "not launching":
                            hideSplashScreen();
                            break;
                        case "launching":
                            showSplashScreen({ "enableTransparency": true });
                            break;
                        case "launched":
                            hideSplashScreen();
                            routes.myServices().push();
                            break;
                    }
                    break;
            }
        },
        [
            state.stateDescription === "not initialized" ?
                state.stateDescription :
                state.launchState
        ]
    );

    const indexedFormFields = useSelector(selectors.indexedFormFieldsSelector);

    if (state.stateDescription !== "ready") {
        return null;
    }

    assert(restorablePackageConfig !== undefined);
    assert(indexedFormFields !== undefined);

    return (
        <div className={className}>
            <div className={classNames.wrapperForScroll}>
                <div className={classNames.wrapperForMawWidth}>
                    <CatalogLauncherMainCard
                        packageName={state.packageName}
                        packageIconUrl={state.icon}
                        isBookmarked={isBookmarked}
                        onIsBookmarkedValueChange={onIsBookmarkedValueChange}
                        friendlyName={friendlyName!}
                        onFriendlyNameChange={onFriendlyNameChange}
                        onRequestLaunch={onRequestLaunch}
                        onRequestCancel={onRequestCancel}
                        onRequestCopyLaunchUrl={
                            restorablePackageConfig.formFieldsValueDifferentFromDefault.length !== 0 ?
                                onRequestCopyLaunchUrl :
                                undefined
                        }
                    />
                    {
                        Object.keys(indexedFormFields!).map(
                            dependencyNamePackageNameOrGlobal =>
                                <CatalogLauncherConfigurationCard
                                    key={dependencyNamePackageNameOrGlobal}
                                    dependencyNamePackageNameOrGlobal={dependencyNamePackageNameOrGlobal}
                                    {...indexedFormFields[dependencyNamePackageNameOrGlobal]}
                                    onFormValueChange={onFormValueChange}
                                />
                        )
                    }
                </div>
            </div>
        </div>
    );

});
