import deDE from "./locales/de-DE.json" with { type: "json" };
import enGB from "./locales/en-GB.json" with { type: "json" };
import enUS from "./locales/en-US.json" with { type: "json" };

const translations = {
    "en-GB": enGB,
    "en-US": enUS,
    "de-DE": deDE,
} as const;

export type LocaleCode = keyof typeof translations;

export type TranslationKey = keyof typeof enGB;

type TranslationVariables = Record<string, string | number>;

export function resolveLocale(locale?: string): LocaleCode {
    switch (locale) {
        case "de":
        case "de-DE":
            return "de-DE";

        case "en-US":
            return "en-US";

        case "en-GB":
        default:
            return "en-GB";
    }
}

export function t(locale: LocaleCode, key: TranslationKey, variables?: TranslationVariables): string {
    let value: string = translations[locale][key];

    if (variables) {
        for (const [name, replacement] of Object.entries(variables)) {
            value = value.replaceAll(`{${name}}`, String(replacement));
        }
    }

    return value;
}
