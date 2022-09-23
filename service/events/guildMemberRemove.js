const logger = require('../../pkg/utils/logger');
const userInfos = require('../../pkg/models/object/user_infos');

const execute = async member => {
  logger.debug(`member remove id: ${member.id}, guild: ${member.guild.id}`);
  await userInfos.deleteUser({ user_id: member.id, guild_id: member.guild.id }).then(logger.info(`member remove in database id: ${member.id}, guild: ${member.guild.id}`));
};

module.exports = {
  name: 'guildMemberRemove',
  execute,
};