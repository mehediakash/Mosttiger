const axios = require('axios');

class ProviderHealthService {
  constructor() {
    this.providers = {
      igaming: {
        name: 'iGaming API',
        // FIX: Use correct API URL and endpoint
        baseUrl: process.env.IGAMING_API_URL || 'https://igamingapis.com/vuejs/api',
        healthEndpoint: '/health',
        status: 'unknown',
        lastChecked: null,
        responseTime: null
      },
      sports: {
        name: 'Sports API',
        baseUrl: 'https://api.the-odds-api.com/v4',
        healthEndpoint: '/sports',
        status: 'unknown',
        lastChecked: null,
        responseTime: null
      }
    };
  }

  // Check health of all providers
  async checkAllProvidersHealth() {
    const healthResults = {};

    for (const [key, provider] of Object.entries(this.providers)) {
      try {
        const startTime = Date.now();
        
        const response = await axios.get(`${provider.baseUrl}${provider.healthEndpoint}`, {
          timeout: 10000,
          params: key === 'sports' ? { apiKey: process.env.THE_ODDS_API_KEY } : {}
        });

        const responseTime = Date.now() - startTime;

        this.providers[key].status = 'healthy';
        this.providers[key].lastChecked = new Date();
        this.providers[key].responseTime = responseTime;

        healthResults[key] = {
          status: 'healthy',
          responseTime: responseTime,
          lastChecked: new Date()
        };

      } catch (error) {
        this.providers[key].status = 'unhealthy';
        this.providers[key].lastChecked = new Date();
        this.providers[key].error = error.message;

        healthResults[key] = {
          status: 'unhealthy',
          error: error.message,
          lastChecked: new Date()
        };
      }
    }

    return healthResults;
  }

  // Get provider health status
  async getProviderHealthStatus() {
    return {
      providers: this.providers,
      overallStatus: this.getOverallStatus(),
      lastUpdated: new Date()
    };
  }

  // Get overall system status
  getOverallStatus() {
    const healthyProviders = Object.values(this.providers).filter(p => p.status === 'healthy').length;
    const totalProviders = Object.keys(this.providers).length;

    if (healthyProviders === totalProviders) return 'healthy';
    if (healthyProviders === 0) return 'unhealthy';
    return 'degraded';
  }

  // Start periodic health checks
  startHealthChecks() {
    // Check every 5 minutes
    setInterval(() => {
      this.checkAllProvidersHealth();
    }, 5 * 60 * 1000);

    // Initial check
    this.checkAllProvidersHealth();
  }
}

module.exports = new ProviderHealthService();