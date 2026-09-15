// Use the LiveScoresService instance attached to the app (set in `index.js`)
const getLiveScoresService = (req) => req.app.get('liveScoresService');

// @desc    Get available sports for live scores
// @route   GET /api/realtime/sports
// @access  Private
exports.getAvailableSports = async (req, res) => {
  try {
    const liveScoresService = getLiveScoresService(req);
    const sports = liveScoresService.getAvailableSports();

    res.status(200).json({
      success: true,
      data: sports
    });
  } catch (error) {
    console.error('Get available sports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available sports'
    });
  }
};

// @desc    Get live events for a sport
// @route   GET /api/realtime/live-events/:sportKey
// @access  Private
exports.getLiveEvents = async (req, res) => {
  try {
    const { sportKey } = req.params;

    const liveScoresService = getLiveScoresService(req);
    const events = await liveScoresService.getLiveEvents(sportKey);

    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get live events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching live events'
    });
  }
};

// @desc    Get socket connection status
// @route   GET /api/realtime/connection-status
// @access  Private
exports.getConnectionStatus = async (req, res) => {
  try {
    const connectedUsers = req.app.get('socketServer').getConnectedUsersCount();

    res.status(200).json({
      success: true,
      data: {
        connected: true,
        connectedUsers,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Get connection status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking connection status'
    });
  }
};