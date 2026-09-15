const mongoose = require('mongoose');

class SEOSettingsController {
  
  // Get or create SEO settings
  async getSEOSettings(req, res) {
    try {
      // Using a simple collection for SEO settings
      const db = mongoose.connection.db;
      const collection = db.collection('seo_settings');
      
      let settings = await collection.findOne({ _id: 'global' });
      
      if (!settings) {
        // Create default SEO settings
        const defaultSettings = {
          _id: 'global',
          siteTitle: 'Online Betting Platform',
          siteDescription: 'Best online betting and casino games platform',
          keywords: 'betting, casino, sports, games, online',
          metaTags: [],
          socialMedia: {
            facebook: '',
            twitter: '',
            instagram: ''
          },
          analytics: {
            googleAnalytics: '',
            facebookPixel: ''
          },
          updatedBy: req.user.id,
          updatedAt: new Date()
        };
        
        await collection.insertOne(defaultSettings);
        settings = defaultSettings;
      }

      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Get SEO settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching SEO settings'
      });
    }
  }

  // Update SEO settings
  async updateSEOSettings(req, res) {
    try {
      const {
        siteTitle,
        siteDescription,
        keywords,
        metaTags,
        socialMedia,
        analytics
      } = req.body;

      const db = mongoose.connection.db;
      const collection = db.collection('seo_settings');

      const updateData = {
        siteTitle: siteTitle || '',
        siteDescription: siteDescription || '',
        keywords: keywords || '',
        metaTags: metaTags || [],
        socialMedia: socialMedia || {},
        analytics: analytics || {},
        updatedBy: req.user.id,
        updatedAt: new Date()
      };

      await collection.updateOne(
        { _id: 'global' },
        { $set: updateData },
        { upsert: true }
      );

      res.status(200).json({
        success: true,
        message: 'SEO settings updated successfully',
        data: updateData
      });
    } catch (error) {
      console.error('Update SEO settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating SEO settings'
      });
    }
  }

  // Get specific page SEO settings
  async getPageSEOSettings(req, res) {
    try {
      const { page } = req.params;

      const db = mongoose.connection.db;
      const collection = db.collection('seo_settings');
      
      const settings = await collection.findOne({ _id: `page_${page}` });

      res.status(200).json({
        success: true,
        data: settings || {}
      });
    } catch (error) {
      console.error('Get page SEO settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching page SEO settings'
      });
    }
  }

  // Update page-specific SEO settings
  async updatePageSEOSettings(req, res) {
    try {
      const { page } = req.params;
      const { title, description, keywords, metaTags } = req.body;

      const db = mongoose.connection.db;
      const collection = db.collection('seo_settings');

      const updateData = {
        _id: `page_${page}`,
        page: page,
        title: title || '',
        description: description || '',
        keywords: keywords || '',
        metaTags: metaTags || [],
        updatedBy: req.user.id,
        updatedAt: new Date()
      };

      await collection.updateOne(
        { _id: `page_${page}` },
        { $set: updateData },
        { upsert: true }
      );

      res.status(200).json({
        success: true,
        message: `SEO settings for ${page} updated successfully`,
        data: updateData
      });
    } catch (error) {
      console.error('Update page SEO settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating page SEO settings'
      });
    }
  }
}

module.exports = new SEOSettingsController();