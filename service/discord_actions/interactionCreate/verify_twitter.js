const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const discordUtils = require('../../../pkg/utils/discord_utils');
const twitterUtils = require('../../../pkg/utils/twitter_utils');
const twitterUsers = require('../../../pkg/models/object/twitter_users');

const embed = new MessageEmbed()
  .setColor('#0099ff')
  .setTitle('Connect Twitter Account')
  .setDescription('Click the button below to complete the twitter authorization operation.');

const button = new MessageButton()
  .setLabel('Connect Twitter')
  .setStyle('LINK');

const action = new MessageActionRow()
  .addComponents(button);


const execute = async interaction => {
  const twitterUser = await twitterUsers.get({ guild_id: interaction.guildId, user_id: interaction.user.id });
  if (twitterUser && twitterUser.access_token) {
    await interaction.reply({
      content: '\n',
      embeds:[new MessageEmbed()
        .setDescription(`You already verified twitter account, Nepbot will start to check the rule that you satisfied.\n 
      Once the process finished you can see the new role in your profile.\n
      It usually will take a few seconds`)],
      ephemeral:true });
    twitterUtils.verifyTwitterRule(interaction.guildId, interaction.user.id);
    return;
  }
  button.setURL(await twitterUtils.generateOAuthLink(interaction.guildId, interaction.user.id));
  // replay message to discord user
  await interaction.reply({ content: '\n', ephemeral:true, embeds:[embed], components: [action] });
  discordUtils.setInteraction(interaction);
};

module.exports = {
  execute,
};