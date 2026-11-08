import { Events, Listener, type ChatInputCommandErrorPayload } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import { randomBytes } from "node:crypto";

export class ChatInputCommandErrorListener extends Listener<typeof Events.ChatInputCommandError> {
    public override async run(error: unknown, { command, interaction }: ChatInputCommandErrorPayload) {
        const traceId = randomBytes(3).toString("hex");
        this.container.logger.error(`[${traceId}] /${command.name} failed:`, error);

        const content = `AAAHHHHH!!!!! (ref: \`${traceId}\`)`;
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content, flags: MessageFlags.Ephemeral });
            }
        } catch {}
    }
}
