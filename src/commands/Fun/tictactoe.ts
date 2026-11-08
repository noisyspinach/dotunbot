import { createCanvas, loadImage } from "@napi-rs/canvas";
import { Command } from "@sapphire/framework";
import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags,
} from "discord.js";

import { resolveLocale, t } from "../../lib/i18n/index.js";

const boardImage = await loadImage("assets/board.png");
const CELL = boardImage.width / 3;

const LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

const hasWon = (b: string[]) => LINES.some(([x, y, z]) => b[x] && b[x] === b[y] && b[x] === b[z]);

const fmt = (text: string, vars: Record<string, unknown>) =>
    text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));

function drawBoard(b: string[]) {
    const canvas = createCanvas(boardImage.width, boardImage.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(boardImage, 0, 0);

    ctx.lineCap = "round";
    ctx.lineWidth = CELL * 0.1;
    const r = CELL * 0.25;

    b.forEach((v, i) => {
        const x = (i % 3) * CELL + CELL / 2;
        const y = Math.floor(i / 3) * CELL + CELL / 2;

        if (v === "X") {
            ctx.strokeStyle = "#ed4245";
            ctx.beginPath();
            ctx.moveTo(x - r, y - r);
            ctx.lineTo(x + r, y + r);
            ctx.moveTo(x + r, y - r);
            ctx.lineTo(x - r, y + r);
            ctx.stroke();
        } else if (v === "O") {
            ctx.strokeStyle = "#5865f2";
            ctx.beginPath();
            ctx.arc(x, y, r * 1.1, 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: `tttboard-${Date.now()}.png` });
}

function render(b: string[], text: string, over = false) {
    const rows = [0, 1, 2].map(r =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            [0, 1, 2].map(c => {
                const i = r * 3 + c;
                return new ButtonBuilder()
                    .setCustomId(String(i))
                    .setLabel(b[i] || String(i + 1))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(over || !!b[i]);
            }),
        ),
    );
    return { content: text, files: [drawBoard(b)], attachments: [], components: rows };
}

export class TicTacToeCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, name: "tictactoe", description: "Play tic tac toe against someone" });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(builder =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption(o => o.setName("opponent").setDescription("Who to play against").setRequired(true)),
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const locale = resolveLocale(interaction.locale);
        const opponent = interaction.options.getUser("opponent", true);

        if (opponent.bot) {
            return interaction.reply({ content: t(locale, "tictactoe.botOpponent"), flags: MessageFlags.Ephemeral });
        } else if (opponent.id === interaction.user.id) {
            return interaction.reply({ content: t(locale, "tictactoe.selfOpponent"), flags: MessageFlags.Ephemeral });
        }

        const players = [interaction.user, opponent]; // X, O
        const marks = ["X", "O"];
        const emoji = ["❌", "⭕"];
        const board: string[] = Array(9).fill("");
        let turn = 0;

        const turnText = () => fmt(t(locale, "tictactoe.turn"), { mark: emoji[turn], player: players[turn] });

        const reply = await interaction.reply({
            ...render(board, `${fmt(t(locale, "tictactoe.versus"), { x: players[0], o: players[1] })}\n${turnText()}`),
            withResponse: true,
        });
        const message = reply.resource!.message!;

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            idle: 60000,
        });

        collector.on("collect", async i => {
            if (i.user.id !== players[turn].id) {
                return i.reply({ content: t(locale, "tictactoe.notYourTurn"), flags: MessageFlags.Ephemeral });
            }

            board[Number(i.customId)] = marks[turn];

            if (hasWon(board)) {
                collector.stop("done");
                return i.update(render(board, fmt(t(locale, "tictactoe.win"), { player: players[turn] }), true));
            }
            if (board.every(Boolean)) {
                collector.stop("done");
                return i.update(render(board, t(locale, "tictactoe.draw"), true));
            }

            turn = 1 - turn;
            return i.update(render(board, turnText()));
        });

        collector.on("end", (_, reason) => {
            if (reason === "idle") void interaction.editReply(render(board, t(locale, "tictactoe.timeout"), true));
        });
    }
}
