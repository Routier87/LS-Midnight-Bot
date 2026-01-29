const { ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton()) return;
    
    if (interaction.customId === 'create_ticket') {
      await interaction.deferReply({ ephemeral: true });
      
      const guild = interaction.guild;
      const user = interaction.user;
      const member = interaction.member;
      
      // Vérifier si l'utilisateur a déjà un ticket ouvert
      const category = guild.channels.cache.get(client.config.tickets.categoryId);
      
      // Rechercher tous les tickets existants
      let existingTicket = null;
      if (category) {
        existingTicket = category.children.cache.find(ch => 
          ch.topic && ch.topic.includes(user.id)
        );
      } else {
        // Vérifier dans tous les salons si la catégorie n'existe pas
        const allChannels = guild.channels.cache.filter(ch => 
          ch.type === ChannelType.GuildText && 
          ch.topic && 
          ch.topic.includes(user.id)
        );
        existingTicket = allChannels.first();
      }
      
      if (existingTicket) {
        return interaction.editReply({ 
          content: `❌ **Vous avez déjà un ticket ouvert !**\nRendez-vous ici : ${existingTicket}\nVeuillez le fermer avant d'en créer un nouveau.`,
          ephemeral: true
        });
      }
      
      // Obtenir le prochain numéro de ticket
      const ticketNumber = await client.getNextTicketNumber(guild.id);
      
      // Créer ou récupérer la catégorie des tickets
      let ticketCategory = category;
      if (!ticketCategory) {
        try {
          ticketCategory = await guild.channels.create({
            name: '🎫・Tickets Support',
            type: ChannelType.GuildCategory,
            position: 0, // En haut de la liste
            permissionOverwrites: [
              {
                id: guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
              },
              {
                id: client.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.ManageChannels,
                  PermissionsBitField.Flags.ManageMessages,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory
                ]
              },
              // Ajouter les rôls admin et support par défaut
              {
                id: client.config.roles.admin,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory,
                  PermissionsBitField.Flags.ManageMessages
                ]
              },
              {
                id: client.config.roles.support,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                  PermissionsBitField.Flags.ReadMessageHistory
                ]
              }
            ]
          });
          
          // Mettre à jour la config
          client.config.tickets.categoryId = ticketCategory.id;
          fs.writeFileSync('./config.json', JSON.stringify(client.config, null, 2));
          
          console.log(`✅ Catégorie tickets créée: ${ticketCategory.name}`);
        } catch (error) {
          console.error('❌ Erreur création catégorie:', error);
          return interaction.editReply({ 
            content: '❌ Erreur lors de la création de la catégorie tickets.',
            ephemeral: true
          });
        }
      }
      
      // Créer le canal de ticket avec numéro formaté
      const formattedNumber = ticketNumber.toString().padStart(4, '0');
      const ticketName = `ticket-${formattedNumber}`;
      
      try {
        const ticketChannel = await guild.channels.create({
          name: ticketName,
          type: ChannelType.GuildText,
          parent: ticketCategory.id,
          topic: `LS Midnight RP - Ticket #${formattedNumber} | Créateur: ${user.id} | ${user.tag} | Date: ${new Date().toISOString()}`,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
              id: user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.EmbedLinks,
                PermissionsBitField.Flags.AddReactions
              ]
            },
            {
              id: client.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ManageChannels,
                PermissionsBitField.Flags.ManageMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            }
          ]
        });
        
        // Ajouter automatiquement les rôles support et admin
        const supportRole = guild.roles.cache.get(client.config.tickets.supportRoleId);
        const adminRole = guild.roles.cache.get(client.config.tickets.adminRoleId);
        
        if (supportRole) {
          await ticketChannel.permissionOverwrites.create(supportRole, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true,
            AttachFiles: true,
            EmbedLinks: true
          });
        }
        
        if (adminRole) {
          await ticketChannel.permissionOverwrites.create(adminRole, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true,
            ManageChannels: true,
            AttachFiles: true,
            EmbedLinks: true
          });
        }
        
        // Message de bienvenue enrichi
        const welcomeEmbed = new EmbedBuilder()
          .setTitle(`🎫 TICKET #${formattedNumber} - LS MIDNIGHT RP`)
          .setDescription(`**Bonjour ${user}, bienvenue dans votre ticket de support !**\n\nNotre équipe a été notifiée et vous répondra dans les plus brefs délais.`)
          .addFields(
            {
              name: '📋 **INSTRUCTIONS IMPORTANTES**',
              value: '1. Décrivez votre problème en **détail**\n2. Fournissez toutes les **preuves nécessaires**\n3. Soyez **patient** et **respectueux**\n4. Ne mentionnez pas le staff inutilement'
            },
            {
              name: '🛠️ **COMMANDES DISPONIBLES**',
              value: '• `/ticket close` - Fermer le ticket\n• `/ticket add @membre` - Ajouter quelqu\'un\n• `/ticket remove @membre` - Retirer quelqu\'un\n• `/ticket rename [nom]` - Renommer'
            },
            {
              name: '👥 **ÉQUIPE DE SUPPORT**',
              value: supportRole ? `Rôle: ${supportRole}\nAdmin: <@&${client.config.roles.admin}>` : 'En configuration...'
            },
            {
              name: '📊 **INFORMATIONS**',
              value: `**Créateur:** ${user.tag}\n**ID:** \`${user.id}\`\n**Date:** <t:${Math.floor(Date.now()/1000)}:F>\n**Serveur:** LS Midnight RP`
            }
          )
          .setColor(0x0a0a2a) // Bleu nuit LS Midnight
          .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setFooter({ 
            text: 'LS Midnight RP • Support Professionnel', 
            iconURL: guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png'
          })
          .setTimestamp();
        
        // Boutons d'action pour le ticket
        const actionRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('close_ticket')
              .setLabel('Fermer le ticket')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('🔒'),
            new ButtonBuilder()
              .setCustomId('claim_ticket')
              .setLabel('Prendre en charge')
              .setStyle(ButtonStyle.Success)
              .setEmoji('👤'),
            new ButtonBuilder()
              .setCustomId('transcript_ticket')
              .setLabel('Transcription')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('📄')
          );
        
        // Envoyer le message de bienvenue
        await ticketChannel.send({ 
          content: `**🔔 NOUVEAU TICKET !**\n${user} ${supportRole ? supportRole.toString() : ''} ${adminRole ? adminRole.toString() : ''}\n━━━━━━━━━━━━━━━━━━━━━━━━`,
          embeds: [welcomeEmbed], 
          components: [actionRow] 
        });
        
        // Message supplémentaire avec règles
        const rulesEmbed = new EmbedBuilder()
          .setTitle('📜 Règles du support')
          .setDescription('Pour un traitement optimal de votre demande :')
          .addFields(
            { name: '✅ À FAIRE', value: '• Être clair et précis\n• Rester poli et patient\n• Fournir des captures d\'écran\n• Répondre aux questions du staff' },
            { name: '❌ À ÉVITER', value: '• Être irrespectueux\n• Spammer le ticket\n• Ouvrir des tickets inutiles\n• Mentionner plusieurs fois le staff' }
          )
          .setColor(0x3498db)
          .setFooter({ text: 'Merci de votre coopération !' })
          .setTimestamp();
        
        await ticketChannel.send({ embeds: [rulesEmbed] });
        
        // Réponse à l'utilisateur qui a créé le ticket
        await interaction.editReply({ 
          content: `✅ **TICKET #${formattedNumber} CRÉÉ AVEC SUCCÈS !**\n\n➤ **Salon:** ${ticketChannel}\n➤ **Équipe notifiée:** Oui\n➤ **Statut:** En attente de prise en charge\n\nRendez-vous dans votre ticket !` 
        });
        
        // Logs détaillés dans le salon des logs tickets
        const logChannel = guild.channels.cache.get(client.config.tickets.logChannelId);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('📝 **NOUVEAU TICKET OUVERT**')
            .setDescription(`Un nouveau ticket a été créé par un membre`)
            .addFields(
              { name: '🎫 Numéro', value: `\`#${formattedNumber}\``, inline: true },
              { name: '👤 Créateur', value: `${user.tag}\n\`${user.id}\``, inline: true },
              { name: '🔗 Salon', value: `${ticketChannel}`, inline: true },
              { name: '📅 Date', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: false },
              { name: '📊 Statistiques', value: `Total tickets: ${ticketNumber}`, inline: false }
            )
            .setColor(0x2ecc71)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'LS Midnight RP • Logs système', iconURL: guild.iconURL({ dynamic: true }) })
            .setTimestamp();
          
          await logChannel.send({ 
            content: `${supportRole ? supportRole.toString() : ''} ${adminRole ? adminRole.toString() : ''}`,
            embeds: [logEmbed] 
          });
        }
        
        // Sauvegarder le compteur
        client.saveTicketCounters();
        
      } catch (error) {
        console.error('❌ Erreur création ticket:', error);
        await interaction.editReply({ 
          content: '❌ Une erreur est survenue lors de la création du ticket. Veuillez réessayer.',
          ephemeral: true
        });
      }
    }
    
    else if (interaction.customId === 'close_ticket') {
      await interaction.deferReply();
      
      const channel = interaction.channel;
      const user = interaction.user;
      const guild = interaction.guild;
      
      // Vérifier si c'est un ticket
      const ticketCategory = guild.channels.cache.get(client.config.tickets.categoryId);
      const isTicketChannel = channel.parentId === client.config.tickets.categoryId || 
                             channel.name.startsWith('ticket-');
      
      if (!isTicketChannel) {
        return interaction.editReply({ 
          content: '❌ Cette commande ne peut être utilisée que dans un ticket.' 
        });
      }
      
      // Vérifier les permissions
      const supportRole = guild.roles.cache.get(client.config.tickets.supportRoleId);
      const adminRole = guild.roles.cache.get(client.config.tickets.adminRoleId);
      
      const isSupport = supportRole && interaction.member.roles.cache.has(supportRole.id);
      const isAdmin = adminRole && interaction.member.roles.cache.has(adminRole.id);
      const isModerator = interaction.member.roles.cache.has(client.config.roles.moderator);
      const isStaff = interaction.member.roles.cache.has(client.config.roles.staff);
      
      const hasPermission = isSupport || isAdmin || isModerator || isStaff || 
                           interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
      
      // Autoriser le créateur du ticket à le fermer
      const isCreator = channel.topic && channel.topic.includes(user.id);
      
      if (!hasPermission && !isCreator) {
        return interaction.editReply({ 
          content: '❌ **Permission refusée !**\nSeuls le staff, le support ou le créateur du ticket peuvent le fermer.' 
        });
      }
      
      // Récupérer le numéro du ticket
      const ticketNumber = channel.name.split('-')[1] || '0000';
      
      // Embed de confirmation de fermeture
      const closeEmbed = new EmbedBuilder()
        .setTitle('🔒 **FERMETURE DU TICKET**')
        .setDescription(`Le ticket **#${ticketNumber}** sera fermé dans **10 secondes**...`)
        .addFields(
          { name: '👤 Fermé par', value: `${user.tag}`, inline: true },
          { name: '🎫 Numéro', value: `#${ticketNumber}`, inline: true },
          { name: '⏰ Compte à rebours', value: '10 secondes', inline: true }
        )
        .setColor(0xe74c3c)
        .setFooter({ text: 'LS Midnight RP • Fermeture de ticket' })
        .setTimestamp();
      
      // Bouton pour annuler la fermeture
      const cancelRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('cancel_close')
            .setLabel('ANNULER LA FERMETURE')
            .setStyle(ButtonStyle.Success)
            .setEmoji('❌')
        );
      
      const closeMessage = await interaction.editReply({ 
        embeds: [closeEmbed], 
        components: [cancelRow] 
      });
      
      // Créer la transcription avant fermeture
      async function createTranscript() {
        try {
          // Récupérer les messages (limité à 100 pour l'exemple)
          const messages = await channel.messages.fetch({ limit: 100 });
          const transcript = [];
          
          transcript.push(`=== TRANSCRIPTION TICKET #${ticketNumber} ===`);
          transcript.push(`Serveur: ${guild.name}`);
          transcript.push(`Créateur: ${channel.topic ? channel.topic.split('|')[2]?.trim() : 'Inconnu'}`);
          transcript.push(`Fermé par: ${user.tag} (${user.id})`);
          transcript.push(`Date fermeture: ${new Date().toLocaleString('fr-FR')}`);
          transcript.push('='.repeat(50));
          
          // Trier les messages par date (plus ancien au plus récent)
          const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
          
          sortedMessages.forEach(msg => {
            const date = msg.createdAt.toLocaleString('fr-FR');
            const author = msg.author.tag;
            const content = msg.content || '(Message sans texte)';
            const attachments = msg.attachments.size > 0 ? 
              `[Pièces jointes: ${msg.attachments.map(a => a.url).join(', ')}]` : '';
            
            transcript.push(`[${date}] ${author}: ${content} ${attachments}`);
          });
          
          transcript.push('='.repeat(50));
          transcript.push('FIN DE LA TRANSCRIPTION');
          
          const transcriptText = transcript.join('\n');
          
          // Créer un salon de transcripts s'il n'existe pas
          let transcriptChannel = guild.channels.cache.get(client.config.tickets.transcriptChannelId);
          if (!transcriptChannel) {
            transcriptChannel = await guild.channels.create({
              name: '📁・transcripts-tickets',
              type: ChannelType.GuildText,
              parent: ticketCategory?.id || null,
              permissionOverwrites: [
                {
                  id: guild.id,
                  deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                  id: client.user.id,
                  allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                }
              ]
            });
            
            // Ajouter les rôles qui doivent voir les transcripts
            if (adminRole) {
              await transcriptChannel.permissionOverwrites.create(adminRole, {
                ViewChannel: true,
                SendMessages: false
              });
            }
            
            if (supportRole) {
              await transcriptChannel.permissionOverwrites.create(supportRole, {
                ViewChannel: true,
                SendMessages: false
              });
            }
            
            client.config.tickets.transcriptChannelId = transcriptChannel.id;
            fs.writeFileSync('./config.json', JSON.stringify(client.config, null, 2));
          }
          
          // Envoyer la transcription
          const transcriptFile = new AttachmentBuilder(
            Buffer.from(transcriptText, 'utf-8'),
            { name: `transcript-ticket-${ticketNumber}.txt` }
          );
          
          const transcriptEmbed = new EmbedBuilder()
            .setTitle(`📄 Transcription Ticket #${ticketNumber}`)
            .setDescription(`Transcription du ticket fermé par ${user.tag}`)
            .addFields(
              { name: '🎫 Numéro', value: `#${ticketNumber}`, inline: true },
              { name: '👤 Fermé par', value: user.tag, inline: true },
              { name: '📅 Date', value: new Date().toLocaleDateString('fr-FR'), inline: true },
              { name: '💬 Messages', value: `${messages.size} messages`, inline: false }
            )
            .setColor(0x9b59b6)
            .setFooter({ text: 'LS Midnight RP • Archives' })
            .setTimestamp();
          
          await transcriptChannel.send({
            embeds: [transcriptEmbed],
            files: [transcriptFile]
          });
          
        } catch (error) {
          console.error('❌ Erreur création transcription:', error);
        }
      }
      
      // Collecteur pour annuler la fermeture
      const filter = i => i.customId === 'cancel_close' && i.user.id === user.id;
      const collector = channel.createMessageComponentCollector({ 
        filter, 
        time: 10000 
      });
      
      let cancelled = false;
      
      collector.on('collect', async i => {
        await i.deferUpdate();
        await closeMessage.edit({ 
          content: '✅ **FERMETURE ANNULÉE !**\nLe ticket reste ouvert.', 
          embeds: [], 
          components: [] 
        });
        cancelled = true;
        collector.stop();
      });
      
      collector.on('end', async collected => {
        if (!cancelled) {
          // Mettre à jour le message de fermeture
          await closeMessage.edit({ 
            embeds: [EmbedBuilder.from(closeEmbed)
              .setDescription('**FERMETURE EN COURS...**')
              .setColor(0xf39c12)],
            components: [] 
          });
          
          // Créer la transcription
          await createTranscript();
          
          // Log de fermeture
          const logChannel = guild.channels.cache.get(client.config.tickets.logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle('📝 **TICKET FERMÉ**')
              .setDescription(`Le ticket **#${ticketNumber}** a été fermé`)
              .addFields(
                { name: '👤 Fermé par', value: user.tag, inline: true },
                { name: '🎫 Numéro', value: `#${ticketNumber}`, inline: true },
                { name: '🔗 Salon', value: channel.name, inline: true },
                { name: '⏱️ Durée', value: `Créé <t:${Math.floor(channel.createdTimestamp/1000)}:R>`, inline: false }
              )
              .setColor(0xe67e22)
              .setFooter({ text: 'LS Midnight RP • Logs système' })
              .setTimestamp();
            
            await logChannel.send({ embeds: [logEmbed] });
          }
          
          // Attendre 2 secondes puis supprimer le canal
          setTimeout(async () => {
            try {
              await channel.delete(`Ticket #${ticketNumber} fermé par ${user.tag}`);
            } catch (error) {
              console.error('❌ Erreur suppression salon:', error);
            }
          }, 2000);
        }
      });
    }
    
    else if (interaction.customId === 'claim_ticket') {
      await interaction.deferReply({ ephemeral: true });
      
      const supportRole = interaction.guild.roles.cache.get(client.config.tickets.supportRoleId);
      const adminRole = interaction.guild.roles.cache.get(client.config.tickets.adminRoleId);
      const staffRole = interaction.guild.roles.cache.get(client.config.roles.staff);
      
      const hasAccess = (supportRole && interaction.member.roles.cache.has(supportRole.id)) ||
                       (adminRole && interaction.member.roles.cache.has(adminRole.id)) ||
                       (staffRole && interaction.member.roles.cache.has(staffRole.id)) ||
                       interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
      
      if (!hasAccess) {
        return interaction.editReply({ 
          content: '❌ **Accès refusé !**\nSeuls les membres du support, admin ou staff peuvent prendre en charge un ticket.' 
        });
      }
      
      // Renommer le ticket pour indiquer qu'il est pris en charge
      const newName = `🚨-${interaction.channel.name}`;
      try {
        await interaction.channel.setName(newName);
        
        const claimEmbed = new EmbedBuilder()
          .setTitle('👤 **TICKET PRIS EN CHARGE**')
          .setDescription(`${interaction.user} a pris en charge ce ticket.\nIl vous assistera désormais personnellement.`)
          .addFields(
            { name: '🕒 Heure de prise en charge', value: `<t:${Math.floor(Date.now()/1000)}:T>`, inline: true },
            { name: '👤 Responsable', value: interaction.user.tag, inline: true }
          )
          .setColor(0x2ecc71)
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'LS Midnight RP • Support actif' })
          .setTimestamp();
        
        await interaction.channel.send({ 
          content: `📢 **ATTENTION ${interaction.channel.topic?.split('|')[2]?.trim() || 'Membre'}**\nVotre ticket est maintenant pris en charge !`,
          embeds: [claimEmbed] 
        });
        
        await interaction.editReply({ 
          content: '✅ **VOUS AVEZ PRIS EN CHARGE CE TICKET !**\nLe ticket a été renommé et le membre a été notifié.' 
        });
        
      } catch (error) {
        console.error('❌ Erreur prise en charge:', error);
        await interaction.editReply({ 
          content: '❌ Erreur lors de la prise en charge du ticket.' 
        });
      }
    }
    
    else if (interaction.customId === 'transcript_ticket') {
      await interaction.deferReply({ ephemeral: true });
      
      // Vérifier les permissions
      const supportRole = interaction.guild.roles.cache.get(client.config.tickets.supportRoleId);
      const hasPermission = (supportRole && interaction.member.roles.cache.has(supportRole.id)) ||
                           interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages);
      
      if (!hasPermission) {
        return interaction.editReply({ 
          content: '❌ Seul le support peut générer une transcription.' 
        });
      }
      
      await interaction.editReply({ 
        content: '📄 **GÉNÉRATION DE LA TRANSCRIPTION...**\nCette fonctionnalité sera disponible lors de la fermeture du ticket.' 
      });
    }
  }
};
