const config = require('../../pkg/utils/config');
const contractUtils = require('./contract_utils');

exports.getSnapshot = async (hash) => {
  const account = await contractUtils.contract();
  // return await queryRule({guild_id: guildId});
  return await account.viewFunction(config.snapshot_contract, 'get_snapshot', { hash: hash });
};