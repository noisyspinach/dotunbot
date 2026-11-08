import { Command } from "@sapphire/framework";
import {
    ActionRowBuilder,
    ComponentType,
    ContainerBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
} from "discord.js";

import { resolveLocale, t, type LocaleCode, type TranslationKey } from "../../lib/i18n/index.js";

const HELP_MENU_ID = "help:category";
const COLLECTOR_TIMEOUT = 120_000;

type HelpableCommand = Command & {
    category?: string;
    hiddenFromHelp?: boolean;
    helpDescriptionKey?: TranslationKey;
};

const CATEGORY_KEYS: Record<string, TranslationKey> = {
    utility: "categories.utility",
    other: "categories.other",
    fun: "categories.fun",
};

function getCategoryLabel(locale: LocaleCode, category: string): string {
    const key = CATEGORY_KEYS[category.toLowerCase()] ?? "categories.other";

    return t(locale, key);
}

function buildHelpView(
    commands: HelpableCommand[],
    categories: string[],
    selectedCategory: string,
    locale: LocaleCode,
    disabled = false,
) {
    const categoryCommands = commands.filter(command => (command.category ?? "other") === selectedCategory);

    const commandList = categoryCommands
        .map(command => {
            const description = command.helpDescriptionKey
                ? t(locale, command.helpDescriptionKey)
                : command.description || t(locale, "common.unknown");

            return `**/${command.name}**\n-# ${description}`;
        })
        .join("\n\n")
        .slice(0, 3500);

    const container = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                [
                    t(locale, "help.title"),
                    t(locale, "help.description"),
                    "",
                    `**${t(locale, "help.category")}:** ${getCategoryLabel(locale, selectedCategory)}`,
                    `**${t(locale, "help.commands")}:** ${categoryCommands.length}`,
                ].join("\n"),
            ),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(commandList || t(locale, "help.empty")))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                disabled ? t(locale, "help.expired") : `-# ${t(locale, "help.footer")}`,
            ),
        );

    const menu = new StringSelectMenuBuilder()
        .setCustomId(HELP_MENU_ID)
        .setPlaceholder(t(locale, "help.placeholder"))
        .setDisabled(disabled)
        .addOptions(
            categories.slice(0, 25).map(category => ({
                label: getCategoryLabel(locale, category),
                value: category,
                default: category === selectedCategory,
            })),
        );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    return [container, row];
}

export class HelpCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "help",
            description: "Browse available bot commands.",
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(builder => builder.setName(this.name).setDescription(this.description));
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const locale = resolveLocale(interaction.locale);

        const commands = [...this.container.stores.get("commands").values()] as HelpableCommand[];

        const visibleCommands = commands
            .filter(command => !command.hiddenFromHelp)
            .sort((a, b) => a.name.localeCompare(b.name));

        const categories = [...new Set(visibleCommands.map(command => command.category ?? "other"))].sort((a, b) =>
            a.localeCompare(b),
        );

        if (categories.length === 0) {
            return interaction.reply({
                content: t(locale, "errors.noCommands"),
                flags: MessageFlags.Ephemeral,
            });
        }

        let selectedCategory = categories[0];

        await interaction.reply({
            components: buildHelpView(visibleCommands, categories, selectedCategory, locale),
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });

        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: COLLECTOR_TIMEOUT,
        });

        collector.on("collect", async component => {
            if (component.customId !== HELP_MENU_ID) return;

            if (component.user.id !== interaction.user.id) {
                await component.reply({
                    content: t(locale, "help.owned"),
                    flags: MessageFlags.Ephemeral,
                });

                return;
            }

            const category = component.values[0];

            if (!categories.includes(category)) {
                await component.deferUpdate();
                return;
            }

            selectedCategory = category;

            await component.update({
                components: buildHelpView(visibleCommands, categories, selectedCategory, locale),
            });
        });

        collector.on("end", async () => {
            await interaction
                .editReply({
                    components: buildHelpView(visibleCommands, categories, selectedCategory, locale, true),
                })
                .catch(() => null);
        });
    }
}
