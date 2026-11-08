import { Command } from "@sapphire/framework";
import {
    ContainerBuilder,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder,
} from "discord.js";
import { COLORS, latencyColor } from "../lib/colors.js";
import { env } from "../lib/env.js";
import { resolveLocale, t, type LocaleCode } from "../lib/i18n/index.js";

function pendingView(locale: LocaleCode) {
    return new ContainerBuilder()
        .setAccentColor(COLORS.pending)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(t(locale, "ping.pending")));
}

function resultView(roundTrip: number, gateway: number, locale: LocaleCode, avatarUrl: string) {
    return new ContainerBuilder()
        .setAccentColor(latencyColor(roundTrip))
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(t(locale, "ping.title")),
                    new TextDisplayBuilder().setContent(
                        [
                            `**${t(locale, "ping.roundtrip")}:** \`${roundTrip}ms\``,
                            `**${t(locale, "ping.gateway")}:** \`${gateway}ms\``,
                        ].join("\n"),
                    ),
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl)),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(t(locale, "ping.startup")));
}

export class PingCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "ping",
            description: "Get the bot latency",
            preconditions: ["DevGuildOnly"],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(builder => builder.setName(this.name).setDescription(this.description), {
            guildIds: [env.devGuildId],
        });
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const locale = resolveLocale(interaction.locale);

        const response = await interaction.reply({
            components: [pendingView(locale)],
            flags: MessageFlags.IsComponentsV2,
            withResponse: true,
        });
        const replyTimestamp = response.resource?.message?.createdTimestamp ?? Date.now();
        const roundTrip = replyTimestamp - interaction.createdTimestamp;

        const gateway = Math.round(this.container.client.ws.ping);

        const client = this.container.client;
        const avatarUrl = client.user?.displayAvatarURL({ size: 256 }) ?? client.rest.cdn.defaultAvatar(0);

        await interaction.editReply({
            components: [resultView(roundTrip, gateway, locale, avatarUrl)],
            flags: MessageFlags.IsComponentsV2,
        });
    }
}
