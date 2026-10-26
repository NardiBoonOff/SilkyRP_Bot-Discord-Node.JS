import {
  ApplicationCommandRegistry,
  Awaitable,
  ChatInputCommand,
  Command,
  CommandOptions,
} from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ColorResolvable,
  Events,
  GuildMember,
  TextChannel,
} from "discord.js";

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
import Response from "../../lib/Response";
class BugReportCommand extends Command {
  constructor(
    context: Command.LoaderContext,
    options: CommandOptions | undefined
  ) {
    super(context, {
      ...options,
      name: "bugreport",
      description: "bugreport",
      preconditions: ["GuildOnly"],
      requiredUserPermissions: ["Administrator"],
    });
  }

  registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): Awaitable<void> {
    registry.registerChatInputCommand((cmd) =>
      cmd
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand((command) =>
          command
            .setName("setup")
            .setDescription("Configurer le système de signalement de bugs")
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("Le channel de signalement de bugs")
                .setRequired(true)
            )
        )
        .addSubcommand((command) =>
          command
            .setName("disable")
            .setDescription("Désactiver le système de signalement de bugs")
        )
    );
  }

  async chatInputRun(
    interaction: ChatInputCommandInteraction,
    context: ChatInputCommand.RunContext
  ): Promise<unknown> {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case "setup":
        await interaction.deferReply({ flags: "Ephemeral" });
        return await this.runSetup(interaction);
        break;
      case "disable":
        await interaction.deferReply({ flags: "Ephemeral" });
        return await this.runDelete(interaction);
        break;
    }
  }

  async runSetup(_interaction: ChatInputCommandInteraction) {
    const opt = _interaction.options;
    const channel = opt.getChannel("channel") as TextChannel;
    if (!_interaction.guild) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Échec de la configuration du système de rapport de bugs, le serveur est invalide.",
          "error"
        ),
      });
    }
    const data = await db.bugReport.findUnique({
      where: { guildId: _interaction.guild.id },
    });

    if (data) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Le système de signalement de bugs est déjà configuré!",
          "error"
        ),
      });
    }

    await db.bugReport.create({
      data: {
        guildId: _interaction.guild.id,
        channelId: channel.id,
      },
    });

    return await _interaction.editReply({
      content: await Response.Generate(
        _interaction,
        "Système de signalement de bugs configuré avec succès!",
        "success"
      ),
    });
  }

  async runDelete(_interaction: ChatInputCommandInteraction) {
    if (!_interaction.guild) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Échec de la configuration du système de rapport de bugs, le serveur est invalide.",
          "error"
        ),
      });
    }
    const data = await db.bugReport.findUnique({
      where: { guildId: _interaction.guild.id },
    });

    if (!data) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Le système de signalement de bugs n'est pas configuré!",
          "error"
        ),
      });
    }

    await db.bugReport.delete({
      where: {
        id: data.id,
      },
    });
    return await _interaction.editReply({
      content: await Response.Generate(
        _interaction,
        "Système de signalement de bugs désactivé avec succès!",
        "success"
      ),
    });
  }
}

module.exports = { BugReportCommand };
