const ggrTopUpService = require("../services/ggrTopUpService");

exports.getLatestGGR = async (req, res) => {
  try {
    const data = await ggrTopUpService.getLatestGGR();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Server error while fetching latest GGR", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching latest GGR",
    });
  }
};
