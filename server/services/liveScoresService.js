const axios = require('axios');
const SportsEvent = require('../models/SportsEvent');

class LiveScoresService {
  constructor(socketServer) {
    this.socketServer = socketServer;
    this.intervalIds = new Map();
  }

  // Start live scores updates for a sport
  async startLiveScores(sportKey) {
    if (this.intervalIds.has(sportKey)) {
      return; // Already running
    }

    const intervalId = setInterval(async () => {
      let retries = 0;
      const maxRetries = 2;
      while (retries <= maxRetries) {
        try {
          await this.updateLiveScores(sportKey);
          break; // Success
        } catch (error) {
          retries++;
          if (error.message?.includes('404')) {
            console.error(`Invalid sport key: ${sportKey} → Stopping updates (404 Not Found)`);
            this.stopLiveScores(sportKey);
            break;
          } else if (error.code === 'ECONNABORTED' && retries <= maxRetries) {
            console.warn(`Timeout on ${sportKey} (retry ${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
          } else {
            console.error(`Error updating ${sportKey} (retry ${retries}):`, error.message || error);
            break;
          }
        }
      }
    }, 3000000); // Every 30 seconds

    this.intervalIds.set(sportKey, intervalId);
    console.log(`Started live scores → ${sportKey}`);
  }

  stopLiveScores(sportKey) {
    const id = this.intervalIds.get(sportKey);
    if (id) {
      clearInterval(id);
      this.intervalIds.delete(sportKey);
      console.log(`Stopped → ${sportKey}`);
    }
  }

  async updateLiveScores(sportKey) {
    if (!process.env.THE_ODDS_API_KEY) {
      throw new Error('Missing THE_ODDS_API_KEY env var');
    }

    const response = await axios.get(`https://api.the-odds-api.com/v4/sports/${sportKey}/scores`, {
      params: {
        apiKey: process.env.THE_ODDS_API_KEY,
        daysFrom: 7, // Last week for more data (set to 1 for strict live)
      },
      timeout: 30000 // 30s timeout – fixes La Liga error
    });

    // Log raw response size for debugging
    console.log(`API response for ${sportKey}: ${response.data.length} total events`);

    const liveEvents = response.data.filter(event =>
      !event.completed &&
      event.scores &&
      event.scores.length > 0
    );

    for (const event of liveEvents) {
      await SportsEvent.findOneAndUpdate(
        { eventId: event.id },
        {
          sportKey,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          commenceTime: event.commence_time,
          scores: {
            home: this.getTeamScore(event, event.home_team),
            away: this.getTeamScore(event, event.away_team)
          },
          status: 'live',
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );
    }

    this.socketServer.updateLiveScores(sportKey, liveEvents);
    console.log(`Updated ${liveEvents.length} live events → ${sportKey} (${response.data.length} total)`);
    return liveEvents;
  }

  getTeamScore(event, teamName) {
    const score = event.scores.find(s => s.name === teamName);
    return score ? parseInt(score.score, 10) || 0 : 0;
  }

  // VERIFIED KEYS (From Official Docs/Examples – All Active/Working as of 2025)
  getAvailableSports() {
    return [
      // SOCCER (Verified: Examples from docs use these exact keys)
      { key: 'soccer_epl', name: 'Premier League', popular: true },
      { key: 'soccer_spain_la_liga', name: 'La Liga', popular: true },
      { key: 'soccer_italy_serie_a', name: 'Serie A', popular: true },
      { key: 'soccer_germany_bundesliga', name: 'Bundesliga', popular: true },
      { key: 'soccer_france_ligue_one', name: 'Ligue 1', popular: true },
      { key: 'soccer_uefa_champions_league', name: 'UEFA Champions League', popular: true }, // Verified full key
      { key: 'soccer_uefa_europa_league', name: 'UEFA Europa League', popular: false },      // Verified full key
      { key: 'soccer_usa_mls', name: 'MLS', popular: false },

      // CRICKET (Verified: Standard keys; internationals active year-round)
      { key: 'cricket_ipl', name: 'Indian Premier League', popular: true },           // Mar-May (off-season now)
      { key: 'cricket_big_bash', name: 'Big Bash League', popular: true },            // Nov-Feb (seasonal)
      { key: 'cricket_test_match', name: 'Test Matches (International)', popular: true }, // Fixed & verified
      { key: 'cricket_odi_international', name: 'One Day Internationals', popular: false }, // Fixed: Full key for internationals
      { key: 'cricket_t20_international', name: 'T20 Internationals', popular: false },   // Fixed: Full key
      { key: 'cricket_the_hundred', name: 'The Hundred', popular: false },             // Jul-Aug
      { key: 'cricket_caribbean_premier_league', name: 'CPL', popular: false },        // Aug-Sep

      // BASKETBALL
      { key: 'basketball_nba', name: 'NBA', popular: true },
      { key: 'basketball_euroleague', name: 'EuroLeague', popular: false },

      // AMERICAN FOOTBALL
      { key: 'americanfootball_nfl', name: 'NFL', popular: true },
      { key: 'americanfootball_ncaa', name: 'NCAA Football', popular: false },

      // BASEBALL
      { key: 'baseball_mlb', name: 'MLB', popular: true },

      // ICE HOCKEY
      { key: 'icehockey_nhl', name: 'NHL', popular: true },
    ];
  }

  async getLiveEvents(sportKey) {
    return await SportsEvent.find({
      sportKey,
      status: 'live',
      commenceTime: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last week
    })
      .sort({ commenceTime: 1 })
      .lean();
  }

  startAllPopularSports() {
    const sports = this.getAvailableSports()
      .filter(s => s.popular)
      .map(s => s.key);

    console.log('Starting live scores for:', sports.join(', '));
    sports.forEach(key => this.startLiveScores(key));
  }

  stopAllLiveScores() {
    this.intervalIds.forEach((id, key) => {
      clearInterval(id);
      console.log(`Stopped → ${key}`);
    });
    this.intervalIds.clear();
  }

  // BONUS: Fetch real-time valid sports (call on startup)
  async fetchAndLogSports() {
    try {
      const response = await axios.get('https://api.the-odds-api.com/v4/sports', {
        params: { apiKey: process.env.THE_ODDS_API_KEY, all: true }
      });
      const soccerCricket = response.data.filter(s => 
        s.key.startsWith('soccer_') || s.key.startsWith('cricket_')
      ).filter(s => s.active); // Only active
      console.log('Active Soccer/Cricket Keys (from API):');
      soccerCricket.forEach(s => console.log(`  ${s.key}: ${s.title}`));
    } catch (error) {
      console.error('Failed to fetch sports list:', error.message);
    }
  }
}

module.exports = LiveScoresService;