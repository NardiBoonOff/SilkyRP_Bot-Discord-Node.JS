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
  TextChannel,
} from "discord.js";
import { PrismaClient } from "@prisma/client";
import Response from "../../lib/Response";
import Embed from "../../lib/Embed";

const db = new PrismaClient();

class SuggestionsCommand extends Command {
  constructor(context: Command.LoaderContext, options?: CommandOptions) {
    super(context, {
      ...options,
      name: "suggestions-submit",
      description: "Soumettre une suggestion",
      preconditions: ["GuildOnly"],
      requiredUserPermissions: ["SendMessages"],
    });
  }

  registerApplicationCommands(
    registry: ApplicationCommandRegistry
  ): Awaitable<void> {
    registry.registerChatInputCommand((cmd) =>
      cmd
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((o) =>
          o
            .setName("suggest")
            .setDescription("Entrez votre suggestion")
            .setRequired(true)
        )
    );
  }

  async chatInputRun(
    interaction: ChatInputCommandInteraction
  ): Promise<unknown> {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.guild) {
      return interaction.editReply({
        content: await Response.Generate(
          interaction,
          "Guilde invalide.",
          "error"
        ),
      });
    }

    const data = await db.suggestions.findUnique({
      where: { guildId: interaction.guild.id },
    });
    if (!data) {
      return interaction.editReply({
        content: await Response.Generate(
          interaction,
          "Les suggestions sont désactivées.",
          "error"
        ),
      });
    }

    const suggest = interaction.options.getString("suggest")!;
    const channel = interaction.guild.channels.cache.get(
      data.channelId
    ) as TextChannel;
    if (!channel) {
      return interaction.editReply({
        content: await Response.Generate(
          interaction,
          "Channel de Suggestions invalide.",
          "error"
        ),
      });
    }

    const embed = await Embed.build(
      "Random",
      "Suggestions",
      interaction.guild.name,
      interaction.guild.iconURL(),
      "`💡` Nouvelle Suggestion",
      `**Joueur:** ${interaction.user} (\`${interaction.user.id}\`)\n**Suggérer:** \`${suggest}\``,
      interaction.guild.iconURL()
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`suggestions:v`)
        .setLabel("0")
        .setEmoji("👍")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`suggestions:x`)
        .setLabel("0")
        .setEmoji("👎")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`suggestions:view`)
        .setLabel("Voir les Voteurs")
        .setStyle(ButtonStyle.Secondary)
    );

    const message = await channel.send({ embeds: [embed], components: [row] });

    await db.suggestion_Messages.create({
      data: { guildId: interaction.guild.id, messageId: message.id },
    });

    return interaction.editReply({
      content: await Response.Generate(
        interaction,
        "Suggestion soumise avec succès.",
        "success"
      ),
    });
  }
}

module.exports = { SuggestionsCommand };
