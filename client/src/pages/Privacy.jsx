import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  FaChevronDown,
  FaChevronUp,
  FaShieldAlt,
  FaLock,
  FaEye,
  FaUserCheck,
} from "react-icons/fa";

const Privacy = () => {
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const privacySections = [
    {
      id: "collection",
      title: "Information We Collect",
      icon: FaEye,
      content: `We collect information you provide directly to us, such as when you create an account, make deposits or withdrawals, or contact our support team. This includes:

• Personal information (name, email, phone number, date of birth)
• Financial information (payment method details, transaction history)
• Gaming activity and preferences
• Device and browser information
• IP address and location data`,
    },
    {
      id: "usage",
      title: "How We Use Your Information",
      icon: FaUserCheck,
      content: `Your information helps us provide and improve our services:

• Process transactions and manage your account
• Verify your identity and prevent fraud
• Provide customer support and respond to inquiries
• Send important updates about your account and promotions
• Comply with legal and regulatory requirements
• Improve our platform and develop new features`,
    },
    {
      id: "sharing",
      title: "Information Sharing",
      icon: FaShieldAlt,
      content: `We take your privacy seriously and only share information in limited circumstances:

• With your explicit consent
• To comply with legal obligations or court orders
• To prevent fraud, security threats, or illegal activities
• With trusted service providers who help operate our platform
• In connection with a business transfer or merger

We never sell your personal information to third parties for marketing purposes.`,
    },
    {
      id: "security",
      title: "Data Security",
      icon: FaLock,
      content: `We implement comprehensive security measures to protect your information:

• SSL/TLS encryption for all data transmission
• Secure server infrastructure with regular security audits
• Encrypted storage of sensitive information
• Multi-factor authentication options
• Regular security training for our staff
• Continuous monitoring for suspicious activity

While we strive to protect your information, no method of transmission over the internet is 100% secure.`,
    },
    {
      id: "cookies",
      title: "Cookies and Tracking",
      icon: FaEye,
      content: `We use cookies and similar technologies to enhance your experience:

• Essential cookies for platform functionality
• Analytics cookies to understand user behavior
• Marketing cookies for personalized promotions
• Session cookies for security and fraud prevention

You can control cookie preferences through your browser settings, though disabling certain cookies may affect platform functionality.`,
    },
    {
      id: "rights",
      title: "Your Rights and Choices",
      icon: FaUserCheck,
      content: `You have several rights regarding your personal information:

• Access: Request a copy of your personal data
• Rectification: Correct inaccurate or incomplete information
• Deletion: Request deletion of your personal data
• Portability: Receive your data in a structured format
• Objection: Object to certain data processing activities
• Withdrawal: Withdraw consent for marketing communications

Contact our support team to exercise these rights.`,
    },
    {
      id: "retention",
      title: "Data Retention",
      icon: FaLock,
      content: `We retain your information for as long as necessary to provide our services and comply with legal requirements:

• Account information: Retained while your account is active and for 7 years after closure
• Transaction records: Retained for 7 years for regulatory compliance
• Marketing data: Retained until you unsubscribe or withdraw consent
• Inactive accounts: May be closed after 12 months of inactivity

We regularly review and delete unnecessary data.`,
    },
    {
      id: "international",
      title: "International Data Transfers",
      icon: FaShieldAlt,
      content: `Your information may be transferred to and processed in countries other than Bangladesh. We ensure appropriate safeguards are in place:

• Standard contractual clauses approved by relevant authorities
• Adequate data protection frameworks
• Secure transmission protocols
• Regular compliance audits

All transfers comply with applicable data protection laws.`,
    },
    {
      id: "children",
      title: "Children's Privacy",
      icon: FaUserCheck,
      content: `Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children under 18.

If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information promptly.

Parents or guardians who believe their child has provided us with personal information should contact our support team immediately.`,
    },
    {
      id: "changes",
      title: "Changes to This Policy",
      icon: FaShieldAlt,
      content: `We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.

When we make material changes, we will notify you through:

• Email notification to your registered email address
• Prominent notice on our platform
• Update of the "Last Updated" date below

Your continued use of our services after such changes constitutes acceptance of the updated policy.`,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Privacy Policy - mosttiger BD | Your Data Protection</title>
        <meta
          name="description"
          content="Learn how mosttiger BD protects your privacy and personal information. Our comprehensive privacy policy explains data collection, usage, and security measures."
        />
        <meta
          name="keywords"
          content="privacy policy mosttiger BD, data protection, personal information, gambling privacy Bangladesh"
        />
        <meta property="og:title" content="Privacy Policy - mosttiger BD" />
        <meta
          property="og:description"
          content="Your privacy is our priority. Learn how we protect and handle your personal information."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://mosttigerbd.com/privacy" />
      </Helmet>

      <div className="min-h-screen bg-primary from-[#0f2a47] via-[#205583] to-[#0f2a47]">
        {/* Hero Section */}
        <section className="relative py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                Privacy
              </span>{" "}
              Policy
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-8">
              Your privacy is our top priority. This policy explains how we
              collect, use, and protect your personal information.
            </p>
            <div className="flex items-center justify-center gap-4 text-white/60">
              <FaShieldAlt className="text-2xl text-primary" />
              <span>Last updated: January 2024</span>
            </div>
          </div>
        </section>

        {/* Privacy Content */}
        <section className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
              {privacySections.map((section) => (
                <div
                  key={section.id}
                  className="border-b border-white/10 last:border-b-0"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <section.icon className="text-primary text-xl" />
                      <h2 className="text-white font-bold text-lg">
                        {section.title}
                      </h2>
                    </div>
                    {openSections[section.id] ? (
                      <FaChevronUp className="text-white/60" />
                    ) : (
                      <FaChevronDown className="text-white/60" />
                    )}
                  </button>
                  {openSections[section.id] && (
                    <div className="px-6 pb-6">
                      <div className="text-white/80 leading-relaxed whitespace-pre-line pl-10">
                        {section.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Questions About Your Privacy?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              If you have any questions about this Privacy Policy or our data
              practices, please don't hesitate to contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary hover:to-orange-600 text-black font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                Contact Support
              </a>
              <a
                href="mailto:privacy@mosttigerbd.com"
                className="border-2 border-white/30 hover:border-white/50 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300"
              >
                privacy@mosttigerbd.com
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Privacy;
