import {
  ApplicationCommandRegistry,
  Awaitable,
  Command,
  CommandOptions,
} from "@sapphire/framework";
import {
  ChannelType,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import Embed from "../../lib/Embed";
import Response from "../../lib/Response";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

class FivemCommand extends Command {
  constructor(context: Command.LoaderContext, options?: CommandOptions) {
    super(context, {
      ...options,
      name: "fivem",
      description: "fivem",
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
            .setDescription("Configurer le système fivem")
            .addStringOption((o) =>
              o
                .setName("ip")
                .setDescription("L'IP du serveur fivem")
                .setRequired(true)
            )
            .addStringOption((o) =>
              o
                .setName("port")
                .setDescription("Le port du serveur fivem")
                .setRequired(true)
            )
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("Le canal fivem")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
        )
        .addSubcommand((command) =>
          command.setName("delete").setDescription("Désactive le système fivem")
        )
    );
  }

  async chatInputRun(
    interaction: ChatInputCommandInteraction
  ): Promise<unknown> {
    await interaction.deferReply({ flags: "Ephemeral" });
    return this[
      interaction.options.getSubcommand() === "setup" ? "runSetup" : "runDelete"
    ](interaction);
  }

  async runSetup(interaction: ChatInputCommandInteraction) {
    const ip = interaction.options.getString("ip", true);
    const port = interaction.options.getString("port", true);
    const channel = interaction.options.getChannel(
      "channel"
    ) as TextChannel | null;

    if (!channel || !this.validateInputs(ip, port)) {
      return await this.replyError(interaction, "Inputs invalides.");
    }

    if (!interaction.guild) {
      return await this.replyError(interaction, "La guilde n'est pas disponible.");
    }

    const serverExists = await db.fivem.findFirst({
      where: { guildId: interaction.guild.id },
    });
    if (serverExists) {
      return await this.replyError(interaction, "Le serveur est déjà configuré.");
    }

    await db.fivem.create({
      data: {
        guildId: interaction.guild.id,
        ip,
        port,
        playerlistchannel: channel.id,
      },
    });

    return await interaction.editReply({
      content: await Response.Generate(
        interaction,
        "Système fivem configuré avec succès!",
        "success"
      ),
    });
  }

  async runDelete(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      return await this.replyError(interaction, "La guilde n'est pas disponible.");
    }

    const server = await db.fivem.findFirst({
      where: { guildId: interaction.guild.id },
    });
    if (!server) {
      return await this.replyError(
        interaction,
        "Le système fivem n'est pas configuré."
      );
    }
    const messagee = await db.fivem_playerlist_message.findFirst({
      where: { guildId: interaction.guild.id },
    });

    if (messagee) {
      const channel = interaction.guild.channels.cache.get(
        server.playerlistchannel
      ) as TextChannel;
      if (channel) {
        try {
          const msg = await channel.messages.fetch(messagee.messageId);
          if (msg) {
            await msg.delete();
          }
        } catch (error) {
          console.error(error);
        }
      }
    }
    await db.fivem.delete({ where: { id: server.id } });
    if (messagee) {
      await db.fivem_playerlist_message.delete({
        where: { id: messagee.id },
      });
    }

    return await interaction.editReply({
      content: await Response.Generate(
        interaction,
        "Système fivem désactivé avec succès!",
        "success"
      ),
    });
  }

  private async replyError(
    interaction: ChatInputCommandInteraction,
    message: string
  ) {
    return await interaction.editReply({
      content: await Response.Generate(interaction, message, "error"),
    });
  }

  private validateInputs(ip: string, port: string): boolean {
    const ipRegex =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const portRegex = /^[0-9]{1,5}$/;

    return ipRegex.test(ip) && portRegex.test(port);
  }
}

module.exports = { FivemCommand };
