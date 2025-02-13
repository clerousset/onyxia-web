import { useRef, useState, memo } from "react";
import type { ChangeEventHandler } from "react";
import { createUseClassNames } from "app/theme";
import { cx } from "tss-react";
import { Icon } from "app/theme";
import { useTranslation } from "app/i18n/useTranslations";
import { IconButton } from "app/theme";
import { useConstCallback } from "powerhooks";
import { useClickAway } from "app/tools/useClickAway";
import type { NonPostableEvt } from "evt";
import { useEvt } from "evt/hooks";


export type Props = {
    className?: string;
    search: string;
    onSearchChange(search: string): void;
    evtAction: NonPostableEvt<"CLEAR SEARCH">;
};

const { useClassNames } = createUseClassNames<{ isActive: boolean; }>()(
    (theme, { isActive }) => ({
        "root": {
            "borderRadius": 8,
            "overflow": "hidden",
            "boxShadow": theme.shadows[1],
            "& > div": {
                "display": "flex",
                "alignItems": "center",
                "backgroundColor": theme.colors.useCases.surfaces.surface1,
                "cursor": isActive ? undefined : "pointer",
                "overflow": "hidden",
                "border": "solid 2px transparent",
                "&:hover": {
                    "borderBottomColor": theme.colors.useCases.buttons.actionActive,
                }
            }
        },
        "input": {
            "flex": 1,
            "caretColor": theme.colors.useCases.typography.textFocus,
            "fontFamily": theme.typography.fontFamily,
            ...theme.typography.body1,
            "outline": "none",
            "borderWidth":0,
            "border":"none",
            "backgroundColor": "transparent",
            "color": theme.colors.useCases.typography.textPrimary,
            "&::placeholder": { 
                "color": theme.colors.useCases.typography.textDisabled,
                "opacity": 1
            }
        },
        "icon": {
            "margin": `${theme.spacing(1) - 2}px ${theme.spacing(2) - 2}px`,
        },
        "searchLabel": {
            "display": "block",
            "flex": 1,
            ...theme.typography.button,
            "color": theme.colors.useCases.typography.textPrimary
        }
    })
);

export const CatalogExplorerSearchBar = memo((props: Props) => {

    const { className, onSearchChange, search, evtAction } = props;

    const [isActive, setIsActive] = useState(false);

    const { classNames } = useClassNames({ isActive });

    const { t } = useTranslation("CatalogExplorerSearchBar");

    const onClearButtonClick = useConstCallback(() => {
        onSearchChange("")
        inputRef.current?.focus();
    });
    const onRootClick = useConstCallback(() => setIsActive(true));
    const onIconClick = useConstCallback(() => {
        const { current: inputEl } = inputRef;
        if (inputEl === null) return;
        inputEl.focus();
        inputEl.setSelectionRange(0, search.length)
    });
    const onInputChange = useConstCallback<ChangeEventHandler<HTMLInputElement>>(
        event => {
            const { value } = event.target;
            onSearchChange(value);
        }
    );

    const inputRef = useRef<HTMLInputElement>(null);

    const onInputKeyDown = useConstCallback(
        (event: { key: string; }) => {

            const key = (() => {
                switch (event.key) {
                    case "Escape":
                    case "Enter":
                        return event.key;
                    default: return "irrelevant";
                }
            })();

            if (key === "irrelevant") {
                return;
            }

            switch (key) {
                case "Enter":
                    if (search === "") {
                        setIsActive(false);
                    }
                    break;
                case "Escape":
                    onSearchChange("");
                    setIsActive(false);
                    break;
            }

            inputRef.current?.blur();

        }
    );

    const { rootRef } = useClickAway(() => {
        if (search !== "") return;
        setIsActive(false)
    });

    useEvt(
        ctx => evtAction.attach(
            action => action === "CLEAR SEARCH",
            ctx,
            () => onInputKeyDown({ "key": "Escape" })
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [evtAction]
    );

    return (
        <div
            ref={rootRef}
            className={cx(classNames.root, className)}
            onClick={onRootClick}
        >
            <div>
                <Icon
                    color={isActive ? "textFocus" : undefined}
                    id="search"
                    onClick={onIconClick}
                    className={classNames.icon}
                />
                {
                    isActive ?
                        <>
                            <input
                                ref={inputRef}
                                autoFocus={true}
                                className={classNames.input}
                                type="text"
                                value={search}
                                onChange={onInputChange}
                                onKeyDown={onInputKeyDown}
                                spellCheck={false}
                                placeholder={t("search")}
                            />
                            {
                                <IconButton
                                    fontSize="small"
                                    id="cancel"
                                    disabled={search === ""}
                                    onClick={onClearButtonClick}
                                />
                            }
                        </>
                        :
                        <span className={classNames.searchLabel} >
                            {t("search")}
                        </span>
                }
            </div>
        </div>

    );

});

export declare namespace CatalogExplorerSearchBar {

    export type I18nScheme = {
        search: undefined;
    };
}