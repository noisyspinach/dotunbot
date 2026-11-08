import { ApplicationCommandRegistries, RegisterBehavior, SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";
import { fileURLToPath } from "node:url";
import { env } from "./lib/env.js";

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

const client = new SapphireClient({
    intents: [GatewayIntentBits.Guilds],
    baseUserDirectory: fileURLToPath(new URL(".", import.meta.url)),
});

await client.login(env.token);
