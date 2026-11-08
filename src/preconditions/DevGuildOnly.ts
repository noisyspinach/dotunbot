import { Precondition } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { env } from "../lib/env.js";

export class DevGuildOnlyPrecondition extends Precondition {
    public constructor(context: Precondition.LoaderContext, options: Precondition.Options) {
        super(context, { ...options, name: "DevGuildOnly" });
    }

    public override chatInputRun(interaction: ChatInputCommandInteraction) {
        return interaction.guildId === env.devGuildId ? this.ok() : this.error({ message: "No" });
    }
}

declare module "@sapphire/framework" {
    interface Preconditions {
        DevGuildOnly: never;
    }
}
