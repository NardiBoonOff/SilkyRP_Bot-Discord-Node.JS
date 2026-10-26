import {
  InteractionHandler,
  InteractionHandlerOptions,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { ButtonInteraction, DiscordAPIError } from "discord.js";
import Response from "../../lib/Response";

// 10062 = Unknown interaction (expirée / déjà traitée par une autre instance)
// 40060 = Interaction déjà acquittée
const IGNORED_CODES = [10062, 40060];

class VerifyButton extends InteractionHandler {
  constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandlerOptions
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  async parse(interaction: ButtonInteraction) {
    return interaction.customId.startsWith("verify:")
      ? this.some()
      : this.none();
  }

  async run(interaction: ButtonInteraction) {
    // Toujours en premier : Discord n'accorde que 3 secondes pour répondre.
    try {
      await interaction.deferReply({ flags: "Ephemeral" });
    } catch (e) {
      if (e instanceof DiscordAPIError && IGNORED_CODES.includes(e.code as number)) {
        return; // clic expiré ou déjà traité : on ignore silencieusement
      }
      throw e;
    }

    const roleId = interaction.customId.split(":")[1];

    if (!interaction.guild || !roleId) {
      return await interaction.editReply({
        content: await Response.Generate(
          interaction,
          "Ce bouton de vérification est invalide.",
          "error"
        ),
      });
    }

    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);

      if (member.roles.cache.has(roleId)) {
        return await interaction.editReply({
          content: await Response.Generate(
            interaction,
            "You are already verified",
            "error"
          ),
        });
      }

      await member.roles.add(roleId);

      return await interaction.editReply({
        content: await Response.Generate(
          interaction,
          "You are now verified",
          "success"
        ),
      });
    } catch (e) {
      this.container.logger.error("[verify] Impossible d'ajouter le rôle :", e);
      return await interaction.editReply({
        content: await Response.Generate(
          interaction,
          "Impossible de te donner le rôle. Vérifie que le rôle du bot est au-dessus du rôle vérifié et qu'il a la permission « Gérer les rôles ».",
          "error"
        ),
      });
    }
  }
}

module.exports = { VerifyButton };