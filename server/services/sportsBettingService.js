const axios = require("axios");
const SportsEvent = require("../models/SportsEvent");
const SportsBet = require("../models/SportsBet");
const WalletService = require("./walletService");
const TurnoverService = require("./turnoverService");
const affiliateTrackingService = require("./affiliateTrackingService");
const referralService = require("./referralService");

class SportsBettingService {
  constructor() {
    this.apiKey = process.env.THE_ODDS_API_KEY;
    this.baseUrl = "https://api.the-odds-api.com/v4";
  }

  // Fetch sports events from The Odds API
  async fetchSportsEvents(sport = "upcoming", regions = "us", markets = "h2h") {
    try {
      const response = await axios.get(`${this.baseUrl}/sports/${sport}/odds`, {
        params: {
          apiKey: this.apiKey,
          regions: regions,
          markets: markets,
        },
      });

      // Process and store events
      const events = response.data;
      await this.storeEvents(events);

      return events;
    } catch (error) {
      console.error(
        "Fetch sports events error:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to fetch sports events");
    }
  }

  // Store events in database
  async storeEvents(events) {
    for (const event of events) {
      await SportsEvent.findOneAndUpdate(
        { eventId: event.id },
        {
          eventId: event.id,
          sport: event.sport_key,
          sportKey: event.sport_key,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime: new Date(event.commence_time),
          odds: event.bookmakers.map((bookmaker) => ({
            bookmaker: bookmaker.title,
            markets: bookmaker.markets.map((market) => ({
              market: market.key,
              lastUpdate: new Date(market.last_update),
              outcomes: market.outcomes.map((outcome) => ({
                name: outcome.name,
                price: outcome.price,
                point: outcome.point || null,
              })),
            })),
          })),
          lastUpdated: new Date(),
        },
        { upsert: true, new: true },
      );
    }
  }

  // Get available sports
  async getSports() {
    try {
      const response = await axios.get(`${this.baseUrl}/sports`, {
        params: {
          apiKey: this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Get sports error:", error.response?.data || error.message);
      throw new Error("Failed to fetch sports list");
    }
  }

  // Get events by sport
  async getEventsBySport(sportKey, options = {}) {
    const { regions = "us", markets = "h2h", page = 1, limit = 50 } = options;

    const query = { sportKey: sportKey };

    // Filter by date if provided
    if (options.date) {
      const startDate = new Date(options.date);
      const endDate = new Date(options.date);
      endDate.setDate(endDate.getDate() + 1);

      query.commenceTime = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const events = await SportsEvent.find(query)
      .sort({ commenceTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await SportsEvent.countDocuments(query);

    return {
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    };
  }

  // Place a sports bet
  async placeBet(userId, betData) {
    const session = await SportsBet.startSession();
    session.startTransaction();

    try {
      const { matches, totalStake, walletType = "main" } = betData;

      // Validate matches and odds
      for (const match of matches) {
        const event = await SportsEvent.findOne({ eventId: match.matchId });
        if (!event) {
          throw new Error(`Event not found: ${match.matchId}`);
        }

        // Check if odds are still valid
        const validOdds = this.validateOdds(
          event,
          match.market,
          match.selection,
        );
        if (!validOdds) {
          throw new Error(`Invalid odds for match: ${match.matchId}`);
        }
      }

      // Check user balance
      const walletBalance = await WalletService.getWalletBalance(userId);
      if (walletBalance[walletType] < totalStake) {
        throw new Error("Insufficient balance");
      }

      // Generate bet slip ID
      const betSlipId =
        `BS${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

      // Create bet record
      const bet = await SportsBet.create(
        [
          {
            user: userId,
            betSlipId: betSlipId,
            matches: matches,
            totalStake: totalStake,
            walletType: walletType,
            status: "pending",
          },
        ],
        { session },
      );

      // Deduct stake from user wallet
      await WalletService.updateWallet(userId, -totalStake, walletType, "bet", {
        description: `Sports bet - ${betSlipId}`,
        betSlipId: betSlipId,
        betSource: "sports",
        gameType: "sports",
        metadata: {
          sportCount: matches.length,
          sports: matches.map((m) => m.sport),
        },
      });

      // ✅ UNIVERSAL TURNOVER (Automatic via WalletService)
      // The WalletService.updateWallet() call above automatically triggers
      // TurnoverService.recordTurnoverFromTransaction() for this bet
      console.log(
        `[SPORTS] 🎯 Turnover will be recorded automatically by WalletService | Slip=${betSlipId} | Amount=${totalStake} BDT`,
      );

      await session.commitTransaction();
      session.endSession();

      affiliateTrackingService.recordTurnoverChanged(userId).catch((err) => {
        console.error(
          `[AFFILIATE] Sports turnover refresh failed (non-blocking): ${err.message}`,
        );
      });
      referralService.recordTurnoverChanged(userId).catch((err) => {
        console.error(
          `[REFERRAL] Sports turnover refresh failed (non-blocking): ${err.message}`,
        );
      });
      referralService.recordReferralTurnover(userId, totalStake, {
        source: "sports",
        betSlipId,
      }).catch((err) => {
        console.error(
          `[REFERRAL] Sports claim turnover update failed (non-blocking): ${err.message}`,
        );
      });

      return {
        success: true,
        betSlipId: betSlipId,
        betId: bet[0]._id,
        potentialWin: bet[0].potentialWin,
        placedAt: bet[0].placedAt,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // Validate odds
  validateOdds(event, market, selection) {
    for (const bookmaker of event.odds) {
      for (const marketData of bookmaker.markets) {
        if (marketData.market === market) {
          for (const outcome of marketData.outcomes) {
            if (outcome.name === selection) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // Get user bet history
  async getUserBetHistory(userId, options = {}) {
    const { page = 1, limit = 20, status, startDate, endDate } = options;

    const query = { user: userId };

    if (status) query.status = status;

    if (startDate || endDate) {
      query.placedAt = {};
      if (startDate) query.placedAt.$gte = new Date(startDate);
      if (endDate) query.placedAt.$lte = new Date(endDate);
    }

    const bets = await SportsBet.find(query)
      .sort({ placedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await SportsBet.countDocuments(query);

    return {
      bets,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    };
  }

  // Settle bet (admin function)
  async settleBet(betSlipId, results) {
    const session = await SportsBet.startSession();
    session.startTransaction();

    try {
      const bet = await SportsBet.findOne({ betSlipId }).session(session);

      if (!bet) {
        throw new Error("Bet not found");
      }

      if (bet.status !== "pending") {
        throw new Error("Bet already settled");
      }

      let allWon = true;
      let anyLost = false;

      // Update match results
      for (let i = 0; i < bet.matches.length; i++) {
        const matchResult = results[i];
        bet.matches[i].status = matchResult.status;

        if (matchResult.status === "lost") {
          anyLost = true;
        } else if (matchResult.status !== "won") {
          allWon = false;
        }
      }

      // Determine overall bet status
      if (anyLost) {
        bet.status = "lost";
        bet.actualWin = 0;
      } else if (allWon) {
        bet.status = "won";
        bet.actualWin = bet.potentialWin;
      } else {
        bet.status = "partially_won";
        // Calculate partial win based on won matches
        const wonOdds = bet.matches
          .filter((match) => match.status === "won")
          .reduce((acc, match) => acc * match.odds, 1);
        bet.actualWin = parseFloat((bet.totalStake * wonOdds).toFixed(2));
      }

      bet.settledAt = new Date();
      await bet.save({ session });

      // Process winnings if any
      if (bet.actualWin > 0) {
        await WalletService.updateWallet(
          bet.user,
          bet.actualWin,
          bet.walletType,
          "win",
          {
            description: `Sports bet win - ${betSlipId}`,
            betSlipId: betSlipId,
          },
        );
      }

      // ✅ UNIVERSAL TURNOVER UPDATE (Automatic via TurnoverService)
      // When win amount is credited, it triggers another WalletService.updateWallet() call
      // However, we can explicitly update turnover status if needed:
      if (bet.actualWin > 0) {
        console.log(
          `[SPORTS] 🎯 Updating turnover status | Slip=${betSlipId} | Status=${bet.status} | Win=${bet.actualWin} BDT`,
        );
        TurnoverService.updateTurnoverStatus(
          bet._id.toString(),
          bet.status,
          bet.actualWin,
        ).catch((err) => {
          console.error(
            `[TURNOVER] ⚠ Status update failed (non-blocking): ${err.message}`,
          );
        });
      }

      await session.commitTransaction();
      session.endSession();

      affiliateTrackingService.recordTurnoverChanged(bet.user).catch((err) => {
        console.error(
          `[AFFILIATE] Sports tracking refresh failed (non-blocking): ${err.message}`,
        );
      });
      referralService.recordTurnoverChanged(bet.user).catch((err) => {
        console.error(
          `[REFERRAL] Sports tracking refresh failed (non-blocking): ${err.message}`,
        );
      });

      return {
        success: true,
        betStatus: bet.status,
        actualWin: bet.actualWin,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}

module.exports = new SportsBettingService();
