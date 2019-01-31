const debug = require('debug')('briscoloker:briscolokerHelpers:betting');
const ObjectId = require('mongodb').ObjectID;
const mongoDbHelpers = require('../mongoDbHelpers');
const getMyGameBro = require('./getMyGameBro');

module.exports = async (token, mongoClient, bet) => {
  // get the game
  debug('token', token);
  debug('bet', bet);
  const game = await getMyGameBro(token, mongoClient);
  const hero = game.players.filter(P => P.id === token)[0];
  const villan = game.players.filter(P => P.id !== token)[0];
  let currentHand = game.currentHand;
  debug('hero.currentHand.bets', hero.currentHand.bets);
  debug('villan.currentHand.bets', villan.currentHand.bets);
  debug('hero.chips', hero.chips);
  debug('villan.chips', villan.chips);
  // 1. need to check if the player has the money to bet
  if (hero.chips < bet) {
    // Not enought money to bet
    bet = hero.chips;
  }
  let villanContribution = parseInt(villan.currentHand.bets, 10);
  let heroContribution = parseInt(hero.currentHand.bets, 10) + bet;
  debug('bet', bet);
  debug('villanContribution', villanContribution);
  debug('heroContribution', heroContribution);
  if (villanContribution > heroContribution) {
    // villan still have more money on the pot.
    // hero is all in
    // villan need the difference back
    const difference = villanContribution - heroContribution;
    villan.chips += difference;
    // update the current bet of the villan
    villan.currentHand.bets -= difference;
    currentHand.pot -= difference;
    game.logs.push({
      time: new Date().getTime(),
      log: `${villan.name} got ${difference} back`,
    });
    game.logs.push({
      time: new Date().getTime(),
      log: `${hero.name} went all in for ${bet}`,
    });
  } else if (villanContribution < heroContribution) {
    // hero contribution higher then villan contribution
    // if the villan is with 0 chips, he is all-in and
    // need to resize hero bet
    if (villan.chips === 0) {
      // need to resize the bet
      const difference = heroContribution - villanContribution;
      bet = difference;
      game.logs.push({
        time: new Date().getTime(),
        log: `${hero.name} called all in for ${bet}`,
      });
    }
  }
  debug('Actual bet size', bet);
  villanContribution = parseInt(villan.currentHand.bets, 10);
  heroContribution = parseInt(hero.currentHand.bets, 10) + bet;
  debug('villanContribution', villanContribution);
  debug('heroContribution', heroContribution);
  // 2. spend the money
  hero.chips -= bet;
  currentHand.pot += bet;
  hero.currentHand.bets += bet;
  // 3. switch the initiative
  hero.initiative = false;
  villan.initiative = true;
  // 4. check if the betting round is over
  //   they played the same amount of chips / it's not the first check
  if (villan.currentHand.bets === hero.currentHand.bets && currentHand.bettingRound !==0) {
    debug('Same contribution so no more betting');
    currentHand.isBettingPhase = false;
    // if the round ends, hero get the card initiave
    game.logs.push({
      time: new Date().getTime(),
      log: `${hero.name} ${bet === 0 ? 'checked' : `called ${bet}`}`,
    });
  } else {
    game.logs.push({
      time: new Date().getTime(),
      log: `${hero.name} ${bet === 0 ? 'checked' : `raised ${bet}`}`,
    });
  }
  // 5. bump the betting round
  currentHand.bettingRound++;
  // 6. check if villan has still anything left
  // if not end the betting phase
  if (villan.chips === 0) {
    debug('Villan chips === 0', villan.chips);
    currentHand.isBettingPhase = false;
  }
  // 7 save the state of the game into mongo
  const gamesCollection = mongoClient.collection('games');
  await mongoDbHelpers.updateOneByObjectId(gamesCollection, ObjectId(game._id), game);
};
