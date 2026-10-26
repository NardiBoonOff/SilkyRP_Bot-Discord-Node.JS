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
  TextChannel,
} from "discord.js";
import Embed from "../../lib/Embed";
import Response from "../../lib/Response";
class VerifyCommand extends Command {
  constructor(
    context: Command.LoaderContext,
    options: CommandOptions | undefined
  ) {
    super(context, {
      ...options,
      name: "verify",
      description: "verify",
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
            .setDescription("Configurer le système de vérification")
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("Le canal de vérification")
                .setRequired(true)
            )
            .addStringOption((o) =>
              o
                .setName("color")
                .setDescription("Couleur hexadécimale de l'embed")
                .setRequired(true)
            )
            .addRoleOption((o) =>
              o
                .setName("role")
                .setDescription("Rôle vérifié")
                .setRequired(true)
            )
        )
        .addSubcommand((command) =>
          command
            .setName("delete")
            .setDescription("Désactiver le système de vérification")
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("Le canal de vérification")
                .setRequired(true)
            )
            .addStringOption((o) =>
              o
                .setName("messageid")
                .setDescription("L'ID du message de vérification")
                .setRequired(true)
            )
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
      case "delete":
        await interaction.deferReply({ flags: "Ephemeral" });
        return await this.runDelete(interaction);
    }
  }

  async runSetup(_interaction: ChatInputCommandInteraction) {
    const opt = _interaction.options;
    const channel = opt.getChannel("channel") as TextChannel;
    const role = opt.getRole("role");
    const color = opt.getString("color");
    const embedcolor = /^#[0-9A-F]{6}$/i.test(color || "")
      ? (color as ColorResolvable)
      : null;

    if (!embedcolor)
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "La couleur de l'embed n'est pas dans le format hexadécimal.",
          "error"
        ),
      });

    const embed = Embed.build(
      embedcolor,
      "Système de Vérification",
      _interaction.guild?.name || " ",
      _interaction.guild?.iconURL() || null,
      "`✅` Système de vérification",
      "Click on the `✅ Verify` below to be verified.",
      _interaction.guild?.iconURL() || null
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify:${role?.id}`)
        .setLabel("Vérifier")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Secondary)
    );

    if (!channel) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "La chaîne est introuvable.",
          "error"
        ),
      });
    }
    await channel.send({ embeds: [embed], components: [row] });

    return await _interaction.editReply({
      content: await Response.Generate(
        _interaction,
        "Système de vérification configuré avec succès!",
        "success"
      ),
    });
  }

  async runDelete(_interaction: ChatInputCommandInteraction) {
    const opt = _interaction.options;
    const messageid = opt.getString("messageid");
    const channel = opt.getChannel("channel") as TextChannel;
    if (!messageid) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "L'ID du message est invalide ou non fourni.",
          "error"
        ),
      });
    }
    const message = await channel.messages.fetch(messageid);
    try {
      await message.delete();
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Système de vérification désactivé avec succès!",
          "success"
        ),
      });
    } catch (e) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "L'ID du message est invalide ou non fourni.",
          "error"
        ),
      });
    }
  }
}

module.exports = { VerifyCommand };
