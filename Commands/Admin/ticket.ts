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
  CategoryChannel,
  ChannelType,
  ChatInputCommandInteraction,
  ColorResolvable,
  Role,
  TextChannel,
} from "discord.js";
import Embed from "../../lib/Embed";
import Response from "../../lib/Response";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

class TicketCommand extends Command {
  constructor(
    context: Command.LoaderContext,
    options: CommandOptions | undefined
  ) {
    super(context, {
      ...options,
      name: "ticket",
      description: "ticket",
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
            .setDescription("Setup the ticket system")
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("The ticket channel")
                .setRequired(true)
            )
            .addStringOption((o) =>
              o
                .setName("color")
                .setDescription("Hex color of the embed")
                .setRequired(true)
            )
            .addRoleOption((o) =>
              o
                .setName("staffrole")
                .setDescription("Staff role")
                .setRequired(true)
            )
            .addChannelOption((o) =>
              o
                .setName("logschannel")
                .setDescription("The logs channel")
                .setRequired(true)
            )
        )
        .addSubcommand((command) =>
          command
            .setName("delete")
            .setDescription("Disable the ticket system")
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("The verify channel")
                .setRequired(true)
            )
            .addStringOption((o) =>
              o
                .setName("messageid")
                .setDescription("The verify message ID")
                .setRequired(true)
            )
        )
        .addSubcommand((command) =>
          command
            .setName("add-category")
            .setDescription("Add a category to the ticket system")
            .addChannelOption((o) =>
              o
                .setName("category")
                .setDescription("The parent")
                .setRequired(true)
                .addChannelTypes([ChannelType.GuildCategory])
            )
            .addStringOption((o) =>
              o.setName("name").setDescription("name").setRequired(true)
            )
        )
        .addSubcommand((command) =>
          command
            .setName("remove-category")
            .setDescription("Remove a category from the ticket system")
            .addStringOption((o) =>
              o.setName("name").setDescription("name").setRequired(true)
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
      case "delete":
        await interaction.deferReply({ flags: "Ephemeral" });
        return await this.runDelete(interaction);
      case "add-category":
        await interaction.deferReply({ flags: "Ephemeral" });
        return await this.runAddCategory(interaction);
      case "remove-category":
        await interaction.deferReply({ flags: "Ephemeral" });
        return await this.runRemoveCategory(interaction);
    }
  }

  async runSetup(_interaction: ChatInputCommandInteraction) {
    const opt = _interaction.options;
    const channel = opt.getChannel("channel") as TextChannel;
    const logschannel = opt.getChannel("logschannel") as TextChannel;
    const staffole = opt.getRole("staffrole") as Role;
    const color = opt.getString("color");
    const embedcolor = /^#[0-9A-F]{6}$/i.test(color || "")
      ? (color as ColorResolvable)
      : null;

    if (!embedcolor) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "La couleur de l'embed n'est pas au format hexadécimal.",
          "error"
        ),
      });
    }

    const embed = Embed.build(
      embedcolor,
      "Système de Tickets",
      _interaction.guild?.name || " ",
      _interaction.guild?.iconURL() || null,
      "`🎫` Système de Tickets",
      "Clique sur `🎫 Ouvrir un Ticket` ci-dessous pour créer un ticket afin de pouvoir rentrer en contact avec l'équipe d'Administration de Silky RP, merci de bien vouloir cliquer sur le ⬇️ bouton ci-dessous ⬇️.",
      _interaction.guild?.iconURL() || null
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket:select`)
        .setLabel("Ouvrir un Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Secondary)
    );

    if (!channel) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Le Channel est introuvable.",
          "error"
        ),
      });
    }

    if (!_interaction.guildId) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "L'ID du serveur n'est pas disponible.",
          "error"
        ),
      });
    }

    const data = await db.ticket_Settings.findFirst({
      where: {
        guildId: _interaction.guildId,
      },
    });

    if (!logschannel) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Le Channel de logs est introuvable.",
          "error"
        ),
      });
    }

    if (data) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Le système de tickets est déjà configuré.",
          "error"
        ),
      });
    }

    await db.ticket_Settings.create({
      data: {
        guildId: _interaction.guildId,
        logsChannelId: logschannel.id,
        staffRoleId: staffole?.id,
      },
    });
    await channel.send({ embeds: [embed], components: [row] });

    return await _interaction.editReply({
      content: await Response.Generate(
        _interaction,
        "Système de tickets configuré avec succès!",
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
    if (!_interaction.guildId) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "L'ID du serveur n'est pas disponible.",
          "error"
        ),
      });
    }

    try {
      const data = await db.ticket_Settings.findFirst({
        where: {
          guildId: _interaction.guildId,
        },
      });

      if (!data) {
        return await _interaction.editReply({
          content: await Response.Generate(
            _interaction,
            "Le système de tickets n'est pas configuré.",
            "error"
          ),
        });
      }

      await db.ticket_Settings.delete({
        where: {
          id: data.id,
        },
      });
      const message = await channel.messages.fetch(messageid);
      await message.delete();
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Système de tickets désactivé avec succès!",
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

  async runAddCategory(_interaction: ChatInputCommandInteraction) {
    const opt = _interaction.options;
    const name = opt.getString("name");
    const category = opt.getChannel("category") as CategoryChannel;
    if (!category) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "La catégorie est introuvable.",
          "error"
        ),
      });
    }
    if (!name) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Le nom est invalide ou non fourni.",
          "error"
        ),
      });
    }

    if (!_interaction.guildId) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "L'ID du serveur n'est pas disponible.",
          "error"
        ),
      });
    }

    try {
      const data = await db.ticket_Categories.findFirst({
        where: {
          guildId: _interaction.guildId,
          categoryName: name,
        },
      });

      if (data) {
        return await _interaction.editReply({
          content: await Response.Generate(
            _interaction,
            "La catégorie est déjà ajoutée",
            "error"
          ),
        });
      }

      await db.ticket_Categories.create({
        data: {
          guildId: _interaction.guildId,
          categoryName: name,
          categoryParent: category.id,
        },
      });

      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Catégorie ajoutée avec succès!",
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

  async runRemoveCategory(_interaction: ChatInputCommandInteraction) {
    const opt = _interaction.options;
    const name = opt.getString("name");
    if (!_interaction.guildId) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "L'ID du serveur n'est pas disponible.",
          "error"
        ),
      });
    }
    if (!name) {
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Le nom est invalide ou non fourni.",
          "error"
        ),
      });
    }

    try {
      const data = await db.ticket_Categories.findFirst({
        where: {
          guildId: _interaction.guildId,
          categoryName: name,
        },
      });

      if (!data) {
        return await _interaction.editReply({
          content: await Response.Generate(
            _interaction,
            "La catégorie est introuvable",
            "error"
          ),
        });
      }

      await db.ticket_Categories.delete({
        where: {
          id: data.id,
        },
      });
      return await _interaction.editReply({
        content: await Response.Generate(
          _interaction,
          "Catégorie supprimée avec succès!",
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

module.exports = { TicketCommand };
