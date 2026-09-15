const sportsBettingService = require('../services/sportsBettingService');

// @desc    Get available sports
// @route   GET /api/sports
// @access  Private
exports.getSports = async (req, res) => {
  try {
    const sports = await sportsBettingService.getSports();
    
    res.status(200).json({
      success: true,
      data: sports
    });
  } catch (error) {
    console.error('Get sports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sports'
    });
  }
};

// @desc    Get events by sport
// @route   GET /api/sports/events/:sportKey
// @access  Private
exports.getEventsBySport = async (req, res) => {
  try {
    const { sportKey } = req.params;
    const {
      regions = 'us',
      markets = 'h2h',
      page = 1,
      limit = 50,
      date
    } = req.query;

    const result = await sportsBettingService.getEventsBySport(sportKey, {
      regions,
      markets,
      page: parseInt(page),
      limit: parseInt(limit),
      date
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching events'
    });
  }
};

// @desc    Get live events
// @route   GET /api/sports/events/live
// @access  Private
exports.getLiveEvents = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const query = { 
      status: 'live',
      commenceTime: { $gte: new Date() }
    };

    const events = await SportsEvent.find(query)
      .sort({ commenceTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await SportsEvent.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        events,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    console.error('Get live events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching live events'
    });
  }
};

// @desc    Place sports bet
// @route   POST /api/sports/bet
// @access  Private
exports.placeBet = async (req, res) => {
  try {
    const { matches, totalStake, walletType = 'main' } = req.body;

    // Validation
    if (!matches || !Array.isArray(matches) || matches.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one match is required'
      });
    }

    if (!totalStake || totalStake <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid total stake is required'
      });
    }

    const result = await sportsBettingService.placeBet(req.user._id, {
      matches,
      totalStake,
      walletType
    });

    res.status(201).json({
      success: true,
      message: 'Bet placed successfully',
      data: result
    });
  } catch (error) {
    console.error('Place bet error:', error);
    
    if (error.message.includes('Insufficient balance') || error.message.includes('Invalid odds')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while placing bet'
    });
  }
};

// @desc    Get user bet history
// @route   GET /api/sports/bet-history
// @access  Private
exports.getBetHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate
    } = req.query;

    const result = await sportsBettingService.getUserBetHistory(req.user._id, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      startDate,
      endDate
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get bet history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bet history'
    });
  }
};

// @desc    Get bet details
// @route   GET /api/sports/bet/:betSlipId
// @access  Private
exports.getBetDetails = async (req, res) => {
  try {
    const { betSlipId } = req.params;

    const bet = await SportsBet.findOne({
      betSlipId: betSlipId,
      user: req.user._id
    });

    if (!bet) {
      return res.status(404).json({
        success: false,
        message: 'Bet not found'
      });
    }

    res.status(200).json({
      success: true,
      data: bet
    });
  } catch (error) {
    console.error('Get bet details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bet details'
    });
  }
};

// @desc    Refresh sports events
// @route   POST /api/sports/refresh-events
// @access  Private
exports.refreshEvents = async (req, res) => {
  try {
    const { sport = 'upcoming' } = req.body;

    await sportsBettingService.fetchSportsEvents(sport);
    
    res.status(200).json({
      success: true,
      message: 'Events refreshed successfully'
    });
  } catch (error) {
    console.error('Refresh events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while refreshing events'
    });
  }
};