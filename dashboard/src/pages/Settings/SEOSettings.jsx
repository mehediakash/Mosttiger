import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Button, message, Tabs, Select,
  Row, Col, Divider, Tag, Space, InputNumber, Switch
} from 'antd';
import {
  GlobalOutlined, FileTextOutlined, SaveOutlined,
  EyeOutlined, TwitterOutlined, FacebookOutlined
} from '@ant-design/icons';
import { seoAPI } from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const SEOSettings = () => {
  const [globalSettings, setGlobalSettings] = useState({});
  const [pageSettings, setPageSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pages = [
    { value: 'home', label: 'Homepage' },
    { value: 'casino', label: 'Casino' },
    { value: 'sports', label: 'Sports Betting' },
    { value: 'promotions', label: 'Promotions' },
    { value: 'about', label: 'About Us' },
    { value: 'contact', label: 'Contact' },
    { value: 'terms', label: 'Terms & Conditions' },
    { value: 'privacy', label: 'Privacy Policy' },
  ];

  useEffect(() => {
    loadGlobalSettings();
  }, []);

  const loadGlobalSettings = async () => {
    setLoading(true);
    try {
      const response = await seoAPI.getGlobalSEOSettings();
      setGlobalSettings(response.data);
    } catch (error) {
      message.error('Failed to load SEO settings');
    } finally {
      setLoading(false);
    }
  };

  const loadPageSettings = async (page) => {
    try {
      const response = await seoAPI.getPageSEOSettings(page);
      setPageSettings(prev => ({
        ...prev,
        [page]: response.data
      }));
    } catch (error) {
      console.error(`Failed to load settings for page: ${page}`);
    }
  };

  const handleSaveGlobal = async (values) => {
    setSaving(true);
    try {
      await seoAPI.updateGlobalSEOSettings(values);
      message.success('Global SEO settings updated successfully');
      loadGlobalSettings();
    } catch (error) {
      message.error('Failed to update global SEO settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePage = async (page, values) => {
    setSaving(true);
    try {
      await seoAPI.updatePageSEOSettings(page, values);
      message.success(`SEO settings for ${page} updated successfully`);
      loadPageSettings(page);
    } catch (error) {
      message.error(`Failed to update settings for ${page}`);
    } finally {
      setSaving(false);
    }
  };

  const PreviewCard = ({ title, description, keywords }) => (
    <Card title="Search Engine Preview" size="small">
      <div className="border-l-4 border-blue-500 pl-4">
        <div className="text-blue-600 text-lg hover:underline cursor-pointer">
          {title || 'Your Website Title'}
        </div>
        <div className="text-green-600 text-sm">
          https://yourwebsite.com/page-url
        </div>
        <div className="text-gray-600 text-sm mt-1">
          {description || 'Your website description will appear here...'}
        </div>
      </div>
      <Divider />
      <div className="text-xs text-gray-500">
        <strong>Keywords:</strong> {keywords?.join(', ') || 'No keywords set'}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <Tabs defaultActiveKey="global">
          <TabPane tab="Global SEO Settings" key="global">
            <GlobalSEOSettings
              settings={globalSettings}
              onSave={handleSaveGlobal}
              loading={loading}
              saving={saving}
              PreviewCard={PreviewCard}
            />
          </TabPane>
          
          <TabPane tab="Page-Specific SEO" key="pages">
            <PageSEOSettings
              pages={pages}
              pageSettings={pageSettings}
              onLoadPage={loadPageSettings}
              onSave={handleSavePage}
              saving={saving}
              PreviewCard={PreviewCard}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

// Global SEO Settings Component
const GlobalSEOSettings = ({ settings, onSave, loading, saving, PreviewCard }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        siteTitle: settings.siteTitle,
        siteDescription: settings.siteDescription,
        keywords: settings.keywords?.join(', '),
        metaTags: settings.metaTags,
        socialMedia: settings.socialMedia,
        analytics: settings.analytics,
      });
    }
  }, [settings, form]);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <Card loading={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onSave}
          >
            {/* Basic SEO Settings */}
            <div className="space-y-6">
              <Form.Item
                name="siteTitle"
                label="Site Title"
                rules={[{ required: true, message: 'Please enter site title' }]}
              >
                <Input 
                  placeholder="Your Website Name - Best Online Casino & Sports Betting"
                  prefix={<GlobalOutlined />}
                />
              </Form.Item>

              <Form.Item
                name="siteDescription"
                label="Site Description"
                rules={[{ required: true, message: 'Please enter site description' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Brief description of your website for search engines (150-160 characters recommended)"
                  showCount
                  maxLength={160}
                />
              </Form.Item>

              <Form.Item
                name="keywords"
                label="Keywords"
                tooltip="Separate keywords with commas"
              >
                <TextArea
                  rows={3}
                  placeholder="online casino, sports betting, slots, live games, real money games"
                  showCount
                  maxLength={500}
                />
              </Form.Item>
            </div>

            <Divider orientation="left">Social Media & Meta Tags</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['metaTags', 'og:title']}
                  label="Open Graph Title"
                >
                  <Input placeholder="Title for social media shares" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['metaTags', 'og:image']}
                  label="Open Graph Image"
                >
                  <Input placeholder="URL to image for social media shares" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name={['metaTags', 'og:description']}
              label="Open Graph Description"
            >
              <TextArea
                rows={3}
                placeholder="Description for social media shares"
              />
            </Form.Item>

            <Divider orientation="left">Social Media Links</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['socialMedia', 'facebook']}
                  label="Facebook URL"
                >
                  <Input 
                    placeholder="https://facebook.com/yourpage"
                    prefix={<FacebookOutlined />}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['socialMedia', 'twitter']}
                  label="Twitter URL"
                >
                  <Input 
                    placeholder="https://twitter.com/yourhandle"
                    prefix={<TwitterOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Analytics & Tracking</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['analytics', 'googleAnalyticsId']}
                  label="Google Analytics ID"
                >
                  <Input placeholder="G-XXXXXXXXXX" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['analytics', 'facebookPixelId']}
                  label="Facebook Pixel ID"
                >
                  <Input placeholder="XXXXXXXXXXXXXXX" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={saving}
                icon={<SaveOutlined />}
                size="large"
              >
                Save Global SEO Settings
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>

      <Col xs={24} lg={8}>
        <PreviewCard
          title={form.getFieldValue('siteTitle')}
          description={form.getFieldValue('siteDescription')}
          keywords={form.getFieldValue('keywords')?.split(',').map(k => k.trim())}
        />
        
        {/* SEO Tips */}
        <Card title="SEO Tips" size="small" className="mt-4">
          <div className="space-y-2 text-sm">
            <div>• Keep titles under 60 characters</div>
            <div>• Descriptions should be 150-160 characters</div>
            <div>• Use relevant, specific keywords</div>
            <div>• Include your brand name in titles</div>
            <div>• Use compelling language in descriptions</div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

// Page-Specific SEO Settings Component
const PageSEOSettings = ({ pages, pageSettings, onLoadPage, onSave, saving, PreviewCard }) => {
  const [selectedPage, setSelectedPage] = useState('home');
  const [form] = Form.useForm();

  useEffect(() => {
    if (selectedPage) {
      onLoadPage(selectedPage);
    }
  }, [selectedPage, onLoadPage]);

  useEffect(() => {
    const settings = pageSettings[selectedPage];
    if (settings) {
      form.setFieldsValue({
        title: settings.title,
        description: settings.description,
        keywords: settings.keywords?.join(', '),
        metaTags: settings.metaTags,
      });
    }
  }, [selectedPage, pageSettings, form]);

  const handleSave = async (values) => {
    await onSave(selectedPage, values);
  };

  const currentSettings = pageSettings[selectedPage] || {};

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <Card>
          <div className="mb-6">
            <Form.Item label="Select Page">
              <Select
                value={selectedPage}
                onChange={setSelectedPage}
                style={{ width: 200 }}
              >
                {pages.map(page => (
                  <Option key={page.value} value={page.value}>
                    {page.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
          >
            <Form.Item
              name="title"
              label="Page Title"
              rules={[{ required: true, message: 'Please enter page title' }]}
            >
              <Input placeholder={`${pages.find(p => p.value === selectedPage)?.label} - Your Website`} />
            </Form.Item>

            <Form.Item
              name="description"
              label="Page Description"
              rules={[{ required: true, message: 'Please enter page description' }]}
            >
              <TextArea
                rows={4}
                placeholder="Description for this specific page"
                showCount
                maxLength={160}
              />
            </Form.Item>

            <Form.Item
              name="keywords"
              label="Page Keywords"
            >
              <TextArea
                rows={3}
                placeholder="Page-specific keywords separated by commas"
                showCount
                maxLength={500}
              />
            </Form.Item>

            <Divider orientation="left">Open Graph Settings</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['metaTags', 'og:title']}
                  label="OG Title"
                >
                  <Input placeholder="Override for social media" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['metaTags', 'og:image']}
                  label="OG Image"
                >
                  <Input placeholder="Page-specific social media image" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name={['metaTags', 'og:description']}
              label="OG Description"
            >
              <TextArea
                rows={3}
                placeholder="Override description for social media"
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={saving}
                icon={<SaveOutlined />}
              >
                Save Page SEO Settings
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>

      <Col xs={24} lg={8}>
        <PreviewCard
          title={form.getFieldValue('title')}
          description={form.getFieldValue('description')}
          keywords={form.getFieldValue('keywords')?.split(',').map(k => k.trim())}
        />

        {/* Current Settings */}
        <Card title="Current Settings" size="small" className="mt-4">
          {currentSettings ? (
            <div className="space-y-2 text-sm">
              <div><strong>Last Updated:</strong> {currentSettings.updatedAt || 'Never'}</div>
              <div><strong>Title Length:</strong> {currentSettings.title?.length || 0} chars</div>
              <div><strong>Description Length:</strong> {currentSettings.description?.length || 0} chars</div>
              <div><strong>Keywords:</strong> {currentSettings.keywords?.length || 0}</div>
            </div>
          ) : (
            <div className="text-gray-500">No settings saved for this page</div>
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default SEOSettings;