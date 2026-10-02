const Provider = require("../models/Provider");
const Game = require("../models/Game");
const {
  compareProviders,
  parseAndValidateDisplayOrder,
} = require("../utils/providerSort");

class ProviderService {
  /**
   * Safely synchronizes providers from Game brands into Provider collection.
   * Ensures existing providers exist in Provider collection with displayOrder: null.
   */
  async syncProviders() {
    try {
      const dbBrands = await Game.distinct("brand");
      const cleanBrands = Array.from(
        new Set((dbBrands || []).filter(Boolean).map((b) => String(b).trim())),
      );

      if (cleanBrands.length === 0) return;

      const existingProviders = await Provider.find({
        name: { $in: cleanBrands },
      }).select("name");

      const existingNames = new Set(existingProviders.map((p) => p.name));
      const newProviders = cleanBrands
        .filter((brand) => !existingNames.has(brand))
        .map((brand) => ({
          name: brand,
          displayOrder: null,
          status: "Active",
          isActive: true,
        }));

      if (newProviders.length > 0) {
        await Provider.insertMany(newProviders, { ordered: false }).catch(
          () => {},
        );
      }
    } catch (err) {
      console.error("ProviderService.syncProviders error:", err.message);
    }
  }

  /**
   * Returns all active providers sorted according to business rules:
   * 1. displayOrder ASC (1, 2, 3...)
   * 2. Duplicates Z -> A
   * 3. Unordered Z -> A
   */
  async getActiveSortedProviders() {
    await this.syncProviders();
    const providers = await Provider.find({ status: "Active" }).lean();
    return providers.sort(compareProviders);
  }

  /**
   * Returns all providers for Admin with optional search and filter.
   */
  async getAdminProviders(query = {}) {
    await this.syncProviders();

    const filter = {};
    if (query.status && query.status !== "all") {
      filter.status = query.status;
    }
    if (query.search) {
      filter.name = { $regex: query.search.trim(), $options: "i" };
    }

    const providers = await Provider.find(filter).lean();
    const sorted = providers.sort(compareProviders);

    const totalCount = sorted.length;
    const orderedCount = sorted.filter(
      (p) =>
        p.displayOrder !== null &&
        p.displayOrder !== undefined &&
        p.displayOrder >= 1,
    ).length;
    const unorderedCount = totalCount - orderedCount;

    return {
      providers: sorted,
      total: totalCount,
      orderedCount,
      unorderedCount,
    };
  }

  /**
   * Creates a new provider.
   */
  async createProvider(data) {
    const { name, displayOrder, status = "Active", logo = "" } = data;

    if (!name || typeof name !== "string" || !name.trim()) {
      throw new Error("Provider name is required");
    }

    const trimmedName = name.trim();
    const existing = await Provider.findOne({
      name: { $regex: `^${trimmedName}$`, $options: "i" },
    });
    if (existing) {
      throw new Error(`Provider "${trimmedName}" already exists`);
    }

    const orderValidation = parseAndValidateDisplayOrder(displayOrder);
    if (!orderValidation.valid) {
      throw new Error(orderValidation.error);
    }

    const provider = new Provider({
      name: trimmedName,
      displayOrder: orderValidation.value,
      status: status === "Inactive" ? "Inactive" : "Active",
      isActive: status !== "Inactive",
      logo: typeof logo === "string" ? logo.trim() : "",
    });

    return await provider.save();
  }

  /**
   * Updates an existing provider by ID or Name.
   */
  async updateProvider(id, updates) {
    const provider = await Provider.findById(id);
    if (!provider) {
      throw new Error("Provider not found");
    }

    if (
      updates.name &&
      typeof updates.name === "string" &&
      updates.name.trim()
    ) {
      const trimmedName = updates.name.trim();
      if (trimmedName.toLowerCase() !== provider.name.toLowerCase()) {
        const existing = await Provider.findOne({
          name: { $regex: `^${trimmedName}$`, $options: "i" },
          _id: { $ne: id },
        });
        if (existing) {
          throw new Error(`Provider "${trimmedName}" already exists`);
        }
        provider.name = trimmedName;
      }
    }

    if ("displayOrder" in updates) {
      const orderValidation = parseAndValidateDisplayOrder(
        updates.displayOrder,
      );
      if (!orderValidation.valid) {
        throw new Error(orderValidation.error);
      }
      provider.displayOrder = orderValidation.value;
    }

    if ("status" in updates) {
      provider.status = updates.status === "Inactive" ? "Inactive" : "Active";
      provider.isActive = updates.status !== "Inactive";
    }

    if ("logo" in updates && typeof updates.logo === "string") {
      provider.logo = updates.logo.trim();
    }

    return await provider.save();
  }

  /**
   * Deletes a provider by ID.
   */
  async deleteProvider(id) {
    const provider = await Provider.findByIdAndDelete(id);
    if (!provider) {
      throw new Error("Provider not found");
    }
    return provider;
  }
}

module.exports = new ProviderService();
