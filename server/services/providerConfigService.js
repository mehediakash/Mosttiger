const ProviderConfig = require("../models/ProviderConfig");
const Game = require("../models/Game");
const axios = require("axios");
const cloudinaryUploadService = require("./cloudinaryUploadService");
const {
  CONFIGURABLE_PROVIDER_CATEGORIES,
} = require("../models/ProviderConfig");

const ALLOWED_CATEGORY_SET = new Set(CONFIGURABLE_PROVIDER_CATEGORIES);
const PROVIDER_BASE_URL = "https://igamingapis.com/provider/";
const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://igamingapis.com/",
};

class ProviderConfigError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ProviderConfigError";
    this.statusCode = statusCode;
  }
}

const cleanString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeProviderIdentifier = (value) => cleanString(value);

const getProviderIdentifierFromPayload = (payload = {}, fallback = "") =>
  normalizeProviderIdentifier(
    payload.brand_id ||
      payload.brandId ||
      payload.providerCode ||
      payload.providerId ||
      fallback,
  );

const getProviderNameFromPayload = (payload = {}) =>
  cleanString(payload.brand || payload.brand_title || payload.providerName);

const normalizeCategories = (categories = []) => {
  if (!Array.isArray(categories)) {
    throw new ProviderConfigError("categories must be an array", 400);
  }

  const normalized = [];
  const seen = new Set();

  for (const category of categories) {
    const value = cleanString(category);

    if (!value) continue;

    if (value === "Hot") {
      throw new ProviderConfigError(
        "Hot cannot be configured through Provider Configuration",
        400,
      );
    }

    if (!ALLOWED_CATEGORY_SET.has(value)) {
      throw new ProviderConfigError(`Invalid provider category: ${value}`, 400);
    }

    if (!seen.has(value)) {
      seen.add(value);
      normalized.push(value);
    }
  }

  return normalized;
};

const normalizeDisplayOrder = (value) => {
  if (value === undefined || value === null || value === "") return 0;

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || !Number.isInteger(number)) {
    throw new ProviderConfigError(
      "displayOrder must be a non-negative integer",
    );
  }

  return number;
};

const validateCategoryValue = (category) => {
  const value = cleanString(category);

  if (!value) return "";

  if (value === "Hot") {
    throw new ProviderConfigError(
      "Hot cannot be configured through Provider Configuration",
      400,
    );
  }

  if (!ALLOWED_CATEGORY_SET.has(value)) {
    throw new ProviderConfigError(`Invalid provider category: ${value}`, 400);
  }

  return value;
};

const getCategoryDisplayOrder = (config = {}, category) => {
  const categoryConfig = Array.isArray(config.categoryConfig)
    ? config.categoryConfig
    : [];
  const match = categoryConfig.find((item) => item.category === category);

  return match?.displayOrder ?? config.displayOrder ?? 0;
};

const normalizeCategoryConfig = ({
  categoryConfig,
  categories,
  existingCategoryConfig = [],
  fallbackOrder = 0,
}) => {
  const categorySet = new Set(categories);
  const existingByCategory = new Map(
    (existingCategoryConfig || []).map((item) => [
      item.category,
      normalizeDisplayOrder(item.displayOrder),
    ]),
  );

  if (categoryConfig === undefined) {
    return categories.map((category) => ({
      category,
      displayOrder: existingByCategory.has(category)
        ? existingByCategory.get(category)
        : fallbackOrder,
    }));
  }

  if (!Array.isArray(categoryConfig)) {
    throw new ProviderConfigError("categoryConfig must be an array", 400);
  }

  const seenCategories = new Set();
  const submittedByCategory = new Map();

  for (const item of categoryConfig) {
    const category = validateCategoryValue(item?.category);
    if (!category) continue;

    if (seenCategories.has(category)) {
      throw new ProviderConfigError(
        `Duplicate categoryConfig entry: ${category}`,
        400,
      );
    }

    if (!categorySet.has(category)) {
      throw new ProviderConfigError(
        `categoryConfig contains category not assigned to provider: ${category}`,
        400,
      );
    }

    seenCategories.add(category);
    submittedByCategory.set(category, normalizeDisplayOrder(item.displayOrder));
  }

  return categories.map((category) => ({
    category,
    displayOrder: submittedByCategory.has(category)
      ? submittedByCategory.get(category)
      : existingByCategory.has(category)
        ? existingByCategory.get(category)
        : fallbackOrder,
  }));
};

const normalizeBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === "")
    return defaultValue;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;

  throw new ProviderConfigError("enabled must be true or false", 400);
};

const normalizeCustomImage = (payload = {}) => {
  const customImage =
    typeof payload.customImage === "object" && payload.customImage !== null
      ? payload.customImage
      : {};

  return {
    customImageUrl: cleanString(
      payload.customImageUrl ||
        payload.imageUrl ||
        customImage.url ||
        customImage.secureUrl ||
        (typeof payload.customImage === "string" ? payload.customImage : ""),
    ),
    customImagePublicId: cleanString(
      payload.customImagePublicId ||
        payload.cloudinaryPublicId ||
        customImage.publicId,
    ),
  };
};

const ensureUniqueCategoryOrders = async (brandId, categoryConfig = []) => {
  const entries = Array.isArray(categoryConfig) ? categoryConfig : [];
  if (!entries.length) return;

  const categories = entries.map((entry) => entry.category);
  const configs = await ProviderConfig.find({
    brand_id: { $ne: brandId },
    categories: { $in: categories },
  })
    .select("brand_id brand categories displayOrder categoryConfig")
    .lean();

  for (const entry of entries) {
    const displayOrder = normalizeDisplayOrder(entry.displayOrder);
    const conflictingProvider = configs.find((config) => {
      if (!config.categories?.includes(entry.category)) return false;

      const existingOrder = getCategoryDisplayOrder(config, entry.category);
      return existingOrder === displayOrder;
    });

    if (conflictingProvider) {
      throw new ProviderConfigError(
        `Display order ${displayOrder} is already used by ${conflictingProvider.brand || conflictingProvider.brand_id} in ${entry.category}`,
        400,
      );
    }
  }
};

const findProviderSnapshot = async (brandId) => {
  const game = await Game.findOne({ brand_id: brandId })
    .select("brand brand_id image_url")
    .lean();

  if (!game) return null;

  return {
    brand_id: game.brand_id,
    brand: game.brand,
    providerApiImage: game.image_url || "",
  };
};

const buildPublicProviderConfig = (config, providerApiData = {}) => {
  if (!config) return null;

  const doc =
    typeof config.toObject === "function" ? config.toObject() : config;
  const providerApiImage = cleanString(
    providerApiData.providerApiImage ||
      providerApiData.logo ||
      providerApiData.image ||
      providerApiData.image_url,
  );
  const customImage = doc.customImageUrl || "";

  return {
    providerCode: doc.brand_id,
    providerName: doc.brand,
    enabled: doc.enabled,
    customImage: customImage || null,
    categories: doc.categories || [],
    displayOrder: doc.displayOrder || 0,
    categoryConfig: doc.categoryConfig || [],
    image: customImage || providerApiImage || null,
  };
};

const buildAdminProviderConfig = (config, providerApiData = {}) => {
  const publicConfig = buildPublicProviderConfig(config, providerApiData);
  if (!publicConfig) return null;

  const doc =
    typeof config.toObject === "function" ? config.toObject() : config;

  return {
    ...publicConfig,
    brand_id: doc.brand_id,
    brand: doc.brand,
    customImageUrl: doc.customImageUrl || "",
    customImagePublicId: doc.customImagePublicId || "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const normalizeApiProvider = (provider = {}) => {
  const providerCode = cleanString(
    provider.brand_id ||
      provider.brandId ||
      provider.providerCode ||
      provider.providerId ||
      provider.code ||
      provider.id,
  );
  const providerName = cleanString(
    provider.brand_title ||
      provider.brand ||
      provider.providerName ||
      provider.name ||
      provider.title,
  );
  const apiImage = cleanString(
    provider.logo ||
      provider.image ||
      provider.image_url ||
      provider.providerImage ||
      provider.icon,
  );

  if (!providerCode && !providerName) return null;

  return {
    providerCode: providerCode || providerName,
    providerName: providerName || providerCode,
    apiImage,
    raw: provider,
  };
};

const mergeProviderWithConfig = (provider, config = null) => {
  const customImage = config?.customImageUrl || config?.customImage || "";

  return {
    providerCode: provider.providerCode,
    providerName:
      config?.brand || config?.providerName || provider.providerName,
    apiImage: provider.apiImage || "",
    customImage: customImage || null,
    image: customImage || provider.apiImage || null,
    enabled: config ? config.enabled : null,
    categories: config?.categories || [],
    displayOrder: config?.displayOrder || 0,
    categoryConfig: config?.categoryConfig || [],
    configured: !!config,
    customImagePublicId: config?.customImagePublicId || "",
    createdAt: config?.createdAt || null,
    updatedAt: config?.updatedAt || null,
  };
};

class ProviderConfigService {
  get allowedCategories() {
    return CONFIGURABLE_PROVIDER_CATEGORIES;
  }

  validateCategories(categories) {
    return normalizeCategories(categories);
  }

  async getAllConfigs(options = {}) {
    const query = {};

    if (options.enabled !== undefined) {
      query.enabled = options.enabled === true || options.enabled === "true";
    }

    if (options.category) {
      query.categories = cleanString(options.category);
    }

    const configs = await ProviderConfig.find(query)
      .sort({ displayOrder: 1, brand: 1 })
      .lean();

    return configs.map((config) =>
      options.admin
        ? buildAdminProviderConfig(config)
        : buildPublicProviderConfig(config),
    );
  }

  async getProviderManagementList() {
    const [providerResponse, configs] = await Promise.all([
      axios.get(PROVIDER_BASE_URL, {
        timeout: 10000,
        headers: REQUEST_HEADERS,
      }),
      ProviderConfig.find({}).lean(),
    ]);

    const apiProviders = (providerResponse.data?.games || [])
      .map(normalizeApiProvider)
      .filter(Boolean);

    const configByCode = new Map(
      configs.map((config) => [String(config.brand_id), config]),
    );

    const mergedProviders = apiProviders
      .map((provider) =>
        mergeProviderWithConfig(
          provider,
          configByCode.get(provider.providerCode),
        ),
      )
      .sort((a, b) => {
        if (a.configured !== b.configured) return a.configured ? -1 : 1;
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        return a.providerName.localeCompare(b.providerName);
      });

    return {
      providers: mergedProviders,
      total: mergedProviders.length,
      configured: mergedProviders.filter((provider) => provider.configured)
        .length,
      enabled: mergedProviders.filter((provider) => provider.enabled === true)
        .length,
      disabled: mergedProviders.filter((provider) => provider.enabled === false)
        .length,
      allowedCategories: CONFIGURABLE_PROVIDER_CATEGORIES,
      categoryArrangement: this.buildCategoryArrangement(mergedProviders),
    };
  }

  buildCategoryArrangement(providers = []) {
    return CONFIGURABLE_PROVIDER_CATEGORIES.map((category) => {
      const categoryProviders = providers
        .filter((provider) => provider.categories?.includes(category))
        .map((provider) => ({
          providerCode: provider.providerCode,
          providerName: provider.providerName,
          image: provider.image || provider.apiImage || null,
          apiImage: provider.apiImage || "",
          customImage: provider.customImage || null,
          enabled: provider.enabled,
          configured: provider.configured,
          displayOrder:
            provider.categoryConfig?.find((item) => item.category === category)
              ?.displayOrder ??
            provider.displayOrder ??
            0,
        }))
        .sort((a, b) => {
          if (a.displayOrder !== b.displayOrder) {
            return a.displayOrder - b.displayOrder;
          }
          return a.providerName.localeCompare(b.providerName);
        });

      return {
        category,
        providers: categoryProviders,
      };
    });
  }

  async getConfigByProviderIdentifier(identifier, options = {}) {
    const brandId = normalizeProviderIdentifier(identifier);
    if (!brandId) {
      throw new ProviderConfigError("Provider identifier is required", 400);
    }

    const config = await ProviderConfig.findOne({ brand_id: brandId }).lean();
    if (!config) {
      throw new ProviderConfigError("Provider configuration not found", 404);
    }

    return options.admin
      ? buildAdminProviderConfig(config)
      : buildPublicProviderConfig(config);
  }

  async createConfig(payload = {}, adminId = null) {
    const brandId = getProviderIdentifierFromPayload(payload);
    if (!brandId) {
      throw new ProviderConfigError("Provider identifier is required", 400);
    }

    const providerSnapshot = await findProviderSnapshot(brandId);
    const providerName =
      getProviderNameFromPayload(payload) || providerSnapshot?.brand;

    if (!providerName) {
      throw new ProviderConfigError(
        "Provider name is required when the provider is not found in synced games",
        400,
      );
    }

    const image = normalizeCustomImage(payload);
    const categories = normalizeCategories(payload.categories || []);
    const displayOrder = normalizeDisplayOrder(payload.displayOrder);
    const categoryConfig = normalizeCategoryConfig({
      categoryConfig: payload.categoryConfig,
      categories,
      fallbackOrder: displayOrder,
    });

    await ensureUniqueCategoryOrders(brandId, categoryConfig);

    const config = await ProviderConfig.create({
      brand_id: brandId,
      brand: providerName,
      enabled: normalizeBoolean(payload.enabled, true),
      categories,
      displayOrder,
      categoryConfig,
      ...image,
      updatedBy: adminId,
    });

    return buildAdminProviderConfig(config, providerSnapshot);
  }

  async updateConfig(identifier, payload = {}, adminId = null) {
    const brandId = getProviderIdentifierFromPayload(payload, identifier);
    if (!brandId) {
      throw new ProviderConfigError("Provider identifier is required", 400);
    }

    const config = await ProviderConfig.findOne({
      brand_id: normalizeProviderIdentifier(identifier),
    });

    if (!config) {
      throw new ProviderConfigError("Provider configuration not found", 404);
    }

    const providerName = getProviderNameFromPayload(payload);

    if (providerName) config.brand = providerName;
    if (payload.enabled !== undefined) {
      config.enabled = normalizeBoolean(payload.enabled, true);
    }
    let nextCategories = config.categories || [];
    if (payload.categories !== undefined) {
      nextCategories = normalizeCategories(payload.categories);
      config.categories = nextCategories;
    }
    let nextDisplayOrder = config.displayOrder || 0;
    if (payload.displayOrder !== undefined) {
      nextDisplayOrder = normalizeDisplayOrder(payload.displayOrder);
      config.displayOrder = nextDisplayOrder;
    }
    if (
      payload.categories !== undefined ||
      payload.categoryConfig !== undefined
    ) {
      config.categoryConfig = normalizeCategoryConfig({
        categoryConfig: payload.categoryConfig,
        categories: nextCategories,
        existingCategoryConfig: config.categoryConfig,
        fallbackOrder: nextDisplayOrder,
      });
      await ensureUniqueCategoryOrders(config.brand_id, config.categoryConfig);
    }
    if (
      payload.customImage !== undefined ||
      payload.customImageUrl !== undefined ||
      payload.imageUrl !== undefined ||
      payload.customImagePublicId !== undefined ||
      payload.cloudinaryPublicId !== undefined
    ) {
      const image = normalizeCustomImage(payload);
      config.customImageUrl = image.customImageUrl;
      config.customImagePublicId = image.customImagePublicId;
    }

    config.updatedBy = adminId;
    await config.save();

    return buildAdminProviderConfig(config);
  }

  async setEnabled(identifier, enabled, adminId = null) {
    return this.updateConfig(identifier, { enabled }, adminId);
  }

  async updateCategories(identifier, categories, adminId = null) {
    return this.updateConfig(identifier, { categories }, adminId);
  }

  async updateDisplayOrder(identifier, displayOrder, adminId = null) {
    return this.updateConfig(identifier, { displayOrder }, adminId);
  }

  async updateCustomImage(identifier, imagePayload = {}, adminId = null) {
    return this.updateConfig(
      identifier,
      {
        customImage: imagePayload.customImage,
        customImageUrl: imagePayload.customImageUrl || imagePayload.url,
        customImagePublicId:
          imagePayload.customImagePublicId || imagePayload.publicId,
      },
      adminId,
    );
  }

  async removeCustomImage(identifier, adminId = null) {
    const config = await ProviderConfig.findOneAndUpdate(
      { brand_id: normalizeProviderIdentifier(identifier) },
      {
        $set: {
          customImageUrl: "",
          customImagePublicId: "",
          updatedBy: adminId,
        },
      },
      { new: true },
    );

    if (!config) {
      throw new ProviderConfigError("Provider configuration not found", 404);
    }

    return buildAdminProviderConfig(config);
  }

  async uploadCustomImage(identifier, file, adminId = null, payload = {}) {
    const brandId = normalizeProviderIdentifier(identifier);
    if (!brandId) {
      throw new ProviderConfigError("Provider identifier is required", 400);
    }

    let existingConfig = await ProviderConfig.findOne({ brand_id: brandId });
    if (!existingConfig) {
      const providerSnapshot = await findProviderSnapshot(brandId);
      const providerName =
        getProviderNameFromPayload(payload) || providerSnapshot?.brand;

      if (!providerName) {
        throw new ProviderConfigError(
          "Provider name is required when the provider is not found in synced games",
          400,
        );
      }

      existingConfig = new ProviderConfig({
        brand_id: brandId,
        brand: providerName,
        enabled: true,
        categories: [],
        displayOrder: 0,
        categoryConfig: [],
        updatedBy: adminId,
      });
    }

    const previousPublicId = existingConfig.customImagePublicId || "";
    let uploadedImage = null;

    try {
      uploadedImage = await cloudinaryUploadService.uploadImage(file, {
        folder: `mosttiger/provider-images/${brandId}`,
      });

      existingConfig.customImageUrl =
        uploadedImage.secureUrl || uploadedImage.url;
      existingConfig.customImagePublicId = uploadedImage.publicId || "";
      existingConfig.updatedBy = adminId;
      await existingConfig.save();
    } catch (error) {
      if (uploadedImage?.publicId) {
        cloudinaryUploadService
          .deleteImage(uploadedImage.publicId)
          .catch((cleanupError) => {
            console.error("Provider custom image rollback cleanup failed:", {
              providerCode: brandId,
              publicId: uploadedImage.publicId,
              message: cleanupError.message,
            });
          });
      }
      throw error;
    }

    if (previousPublicId && previousPublicId !== uploadedImage.publicId) {
      cloudinaryUploadService.deleteImage(previousPublicId).catch((error) => {
        console.error("Previous provider custom image cleanup failed:", {
          providerCode: brandId,
          publicId: previousPublicId,
          message: error.message,
        });
      });
    }

    return buildAdminProviderConfig(existingConfig);
  }

  async clearCustomImage(identifier, adminId = null) {
    const brandId = normalizeProviderIdentifier(identifier);
    if (!brandId) {
      throw new ProviderConfigError("Provider identifier is required", 400);
    }

    const config = await ProviderConfig.findOne({ brand_id: brandId });
    if (!config) {
      throw new ProviderConfigError("Provider configuration not found", 404);
    }

    const previousPublicId = config.customImagePublicId || "";
    config.customImageUrl = "";
    config.customImagePublicId = "";
    config.updatedBy = adminId;
    await config.save();

    if (previousPublicId) {
      cloudinaryUploadService.deleteImage(previousPublicId).catch((error) => {
        console.error("Provider custom image cleanup failed:", {
          providerCode: brandId,
          publicId: previousPublicId,
          message: error.message,
        });
      });
    }

    return buildAdminProviderConfig(config);
  }

  async getCategoryArrangement() {
    const configs = await ProviderConfig.find({})
      .sort({ displayOrder: 1, brand: 1 })
      .lean();
    const providers = configs.map((config) =>
      mergeProviderWithConfig(
        {
          providerCode: config.brand_id,
          providerName: config.brand,
          apiImage: "",
        },
        config,
      ),
    );

    return {
      allowedCategories: CONFIGURABLE_PROVIDER_CATEGORIES,
      categories: this.buildCategoryArrangement(providers),
    };
  }

  async updateCategoryOrder(category, items = [], adminId = null) {
    const normalizedCategory = validateCategoryValue(category);

    if (!normalizedCategory) {
      throw new ProviderConfigError("Category is required", 400);
    }

    if (!Array.isArray(items)) {
      throw new ProviderConfigError("items must be an array", 400);
    }

    const seenProviders = new Set();
    const seenOrders = new Set();
    const normalizedItems = items.map((item) => {
      const providerCode = normalizeProviderIdentifier(
        item?.providerCode || item?.brand_id || item?.providerId,
      );
      const displayOrder = normalizeDisplayOrder(item?.displayOrder);

      if (!providerCode) {
        throw new ProviderConfigError("Provider code is required", 400);
      }

      if (seenProviders.has(providerCode)) {
        throw new ProviderConfigError(
          `Duplicate provider in category order: ${providerCode}`,
          400,
        );
      }

      if (seenOrders.has(displayOrder)) {
        throw new ProviderConfigError(
          `Duplicate display order in ${normalizedCategory}: ${displayOrder}`,
          400,
        );
      }

      seenProviders.add(providerCode);
      seenOrders.add(displayOrder);

      return { providerCode, displayOrder };
    });

    const submittedByProvider = new Map(
      normalizedItems.map((item) => [item.providerCode, item.displayOrder]),
    );
    const submittedConfigs = await ProviderConfig.find({
      brand_id: { $in: normalizedItems.map((item) => item.providerCode) },
    });
    const categoryConfigs = await ProviderConfig.find({
      categories: normalizedCategory,
    });
    const configByCode = new Map(
      submittedConfigs.map((config) => [String(config.brand_id), config]),
    );

    const finalSeenOrders = new Set();
    for (const config of categoryConfigs) {
      const providerCode = String(config.brand_id);
      const displayOrder = submittedByProvider.has(providerCode)
        ? submittedByProvider.get(providerCode)
        : getCategoryDisplayOrder(config, normalizedCategory);

      if (finalSeenOrders.has(displayOrder)) {
        throw new ProviderConfigError(
          `Duplicate display order in ${normalizedCategory}: ${displayOrder}`,
          400,
        );
      }

      finalSeenOrders.add(displayOrder);
    }

    for (const item of normalizedItems) {
      const config = configByCode.get(item.providerCode);
      if (!config) {
        throw new ProviderConfigError(
          `Provider configuration not found: ${item.providerCode}`,
          404,
        );
      }

      if (!config.categories.includes(normalizedCategory)) {
        throw new ProviderConfigError(
          `${item.providerCode} is not assigned to ${normalizedCategory}`,
          400,
        );
      }

      const existing = Array.isArray(config.categoryConfig)
        ? config.categoryConfig.filter(
            (entry) => entry.category !== normalizedCategory,
          )
        : [];
      config.categoryConfig = [
        ...existing,
        {
          category: normalizedCategory,
          displayOrder: item.displayOrder,
        },
      ];
      config.updatedBy = adminId;
      await config.save();
    }

    return this.getCategoryArrangement();
  }

  buildPublicProviderConfig(config, providerApiData = {}) {
    return buildPublicProviderConfig(config, providerApiData);
  }
}

module.exports = new ProviderConfigService();
module.exports.ProviderConfigError = ProviderConfigError;
module.exports.CONFIGURABLE_PROVIDER_CATEGORIES =
  CONFIGURABLE_PROVIDER_CATEGORIES;
