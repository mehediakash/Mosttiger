const express = require("express");
const providerController = require("../controllers/providerController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Public route to fetch sorted providers
router.get("/", (req, res) => providerController.getProviders(req, res));

// Admin routes
router.get("/admin", protect, authorize("admin"), (req, res) =>
  providerController.getAdminProviders(req, res)
);
router.post("/", protect, authorize("admin"), (req, res) =>
  providerController.createProvider(req, res)
);
router.patch("/:id", protect, authorize("admin"), (req, res) =>
  providerController.updateProvider(req, res)
);
router.put("/:id", protect, authorize("admin"), (req, res) =>
  providerController.updateProvider(req, res)
);
router.delete("/:id", protect, authorize("admin"), (req, res) =>
  providerController.deleteProvider(req, res)
);

module.exports = router;
