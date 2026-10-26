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
class WelcomeCommand extends Command {
  constructor(
    context: Command.LoaderContext,
    options: CommandOptions | undefined
  ) {
    super(context, {
      ...options,
      name: "welcome",
      description: "welcome",
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
            .setDescription("Configurer le système de Bienvenue")
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("Le canal de Bienvenue")
                .setRequired(true)
            )
        )
        .addSubcommand((command) =>
          command
            .setName("disable")
            .setDescription("Désactiver le système de Bienvenue")
        )

        .addSubcommand((command) =>
          command.setName("emit").setDescription("Tester le système de Bienvenue")
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
      case "emit":
        await interaction.deferReply({ flags: "Ephemeral" });
        return await this.runTest(interaction);
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
          "Échec de la configuration du système de bienvenue, le serveur est invalide.",
          "error"
        ),
      });
    }
    const data = await db.welcome.findUnique({
      where: { guildId: _interaction.guild.id },
    });

    if (data) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Le système de bienvenue est déjà configuré!",
          "error"
        ),
      });
    }

    await db.welcome.create({
      data: {
        guildId: _interaction.guild.id,
        channelId: channel.id,
      },
    });

    return await _interaction.editReply({
      content: await Response.Generate(
        _interaction,
        "Système de bienvenue configuré avec succès!",
        "success"
      ),
    });
  }

  async runDelete(_interaction: ChatInputCommandInteraction) {
    if (!_interaction.guild) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Échec de la configuration du système de bienvenue, le serveur est invalide.",
          "error"
        ),
      });
    }
    const data = await db.welcome.findUnique({
      where: { guildId: _interaction.guild.id },
    });

    if (!data) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Le système de bienvenue n'est pas configuré!",
          "error"
        ),
      });
    }

    await db.welcome.delete({
      where: {
        id: data.id,
      },
    });
    return await _interaction.editReply({
      content: await Response.Generate(
        _interaction,
        "Système de bienvenue désactivé avec succès!",
        "success"
      ),
    });
  }

  async runTest(_interaction: ChatInputCommandInteraction) {
    const member = _interaction.member;
    if (member && member instanceof GuildMember) {
      await this.container.client.emit(Events.GuildMemberAdd, member);
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Tester le système de bienvenue réussi!",
          "success"
        ),
      });
    } else {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Échec du test du système de bienvenue, le membre est invalide.",
          "error"
        ),
      });
    }
  }
}

module.exports = { WelcomeCommand };
