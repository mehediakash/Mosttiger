import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  FaExclamationTriangle,
  FaClock,
  FaBan,
  FaPhone,
  FaEnvelope,
  FaLink,
  FaHeart,
  FaShieldAlt,
} from "react-icons/fa";

const ResponsibleGaming = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: FaShieldAlt },
    { id: "tools", label: "Gaming Tools", icon: FaClock },
    { id: "signs", label: "Warning Signs", icon: FaExclamationTriangle },
    { id: "help", label: "Get Help", icon: FaHeart },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Responsible Gaming at mosttiger BD
              </h2>
              <p className="text-xl text-white/80 max-w-3xl mx-auto">
                Gambling should be fun and entertaining. We are committed to
                promoting responsible gaming practices and providing tools to
                help you maintain control over your gaming activities.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Set Your Limits",
                  description:
                    "Establish deposit, loss, and time limits to keep your gaming within your budget and schedule.",
                  icon: FaClock,
                },
                {
                  title: "Take Breaks",
                  description:
                    "Use our timeout and self-exclusion features to take time away when needed.",
                  icon: FaBan,
                },
                {
                  title: "Reality Checks",
                  description:
                    "Receive periodic reminders about time spent and money wagered.",
                  icon: FaExclamationTriangle,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
                >
                  <item.icon className="text-3xl text-primary mb-4" />
                  <h3 className="text-xl font-bold text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-white/80 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-primary/20 to-orange-500/20 rounded-2xl p-8 border border-primary/30">
              <h3 className="text-2xl font-bold text-white mb-4">
                Our Commitment
              </h3>
              <p className="text-white/80 leading-relaxed mb-4">
                At mosttiger BD, responsible gaming is not just a policy—it's a
                core value. We work with organizations like GamCare and follow
                industry best practices to ensure our platform promotes safe and
                enjoyable gaming.
              </p>
              <ul className="text-white/80 space-y-2">
                <li>• Age verification for all accounts (18+ only)</li>
                <li>• Self-assessment tools and reality checks</li>
                <li>• Easy access to deposit and time limits</li>
                <li>• Self-exclusion options from 24 hours to permanent</li>
                <li>• 24/7 support for responsible gaming concerns</li>
              </ul>
            </div>
          </div>
        );

      case "tools":
        return (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Responsible Gaming Tools
              </h2>
              <p className="text-xl text-white/80">
                Take control of your gaming experience with these powerful tools
                designed to help you play responsibly.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  title: "Deposit Limits",
                  description:
                    "Set daily, weekly, or monthly limits on how much you can deposit.",
                  howTo:
                    "Go to Account Settings > Responsible Gaming > Set Deposit Limits",
                  benefits:
                    "Helps control spending and prevents impulsive deposits.",
                },
                {
                  title: "Time Limits",
                  description:
                    "Limit the amount of time you can spend gaming in a session or day.",
                  howTo:
                    "Access through Account Settings > Responsible Gaming > Time Management",
                  benefits:
                    "Prevents excessive gaming sessions and promotes work-life balance.",
                },
                {
                  title: "Loss Limits",
                  description:
                    "Set maximum loss limits to stop automatic play when reached.",
                  howTo:
                    "Configure in Account Settings > Responsible Gaming > Loss Limits",
                  benefits:
                    "Protects against chasing losses and excessive spending.",
                },
                {
                  title: "Reality Checks",
                  description:
                    "Receive pop-up reminders about time spent and money wagered.",
                  howTo:
                    "Enable in Account Settings > Responsible Gaming > Reality Checks",
                  benefits:
                    "Helps maintain awareness of gaming activity and time passage.",
                },
                {
                  title: "Self-Exclusion",
                  description:
                    "Temporarily or permanently exclude yourself from gaming.",
                  howTo:
                    "Contact support or use Account Settings > Responsible Gaming > Self-Exclusion",
                  benefits: "Provides a break from gaming when needed most.",
                },
                {
                  title: "Cooling Off Period",
                  description: "Take a short break from 24 hours to 7 days.",
                  howTo:
                    "Select from Account Settings > Responsible Gaming > Timeout",
                  benefits: "Allows time to reflect and regain perspective.",
                },
              ].map((tool, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
                >
                  <h3 className="text-xl font-bold text-white mb-3">
                    {tool.title}
                  </h3>
                  <p className="text-white/80 mb-4">{tool.description}</p>
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <h4 className="text-primary font-semibold mb-2">
                      How to Set Up:
                    </h4>
                    <p className="text-white/70 text-sm">{tool.howTo}</p>
                  </div>
                  <div className="bg-green-500/10 rounded-xl p-4">
                    <h4 className="text-green-400 font-semibold mb-2">
                      Benefits:
                    </h4>
                    <p className="text-white/70 text-sm">{tool.benefits}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "signs":
        return (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Warning Signs of Problem Gambling
              </h2>
              <p className="text-xl text-white/80">
                Recognizing the signs early can help prevent gambling from
                becoming a problem.
              </p>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <FaExclamationTriangle className="text-red-400 text-2xl" />
                <h3 className="text-2xl font-bold text-white">
                  When to Seek Help
                </h3>
              </div>
              <p className="text-white/80 mb-6">
                If you recognize several of these signs in yourself or someone
                you care about, it's time to take action. Remember, it's never
                too late to seek help and regain control.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white">
                  Financial Signs
                </h3>
                {[
                  "Borrowing money to gamble or pay gambling debts",
                  "Selling personal items to fund gambling",
                  "Missing payments on bills or loans",
                  "Secretive about gambling spending",
                  "Chasing losses with larger bets",
                ].map((sign, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-white/80">{sign}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white">
                  Behavioral Signs
                </h3>
                {[
                  "Increasing time spent gambling",
                  "Neglecting work, study, or family responsibilities",
                  "Lying about gambling activities",
                  "Feeling anxious or irritable when unable to gamble",
                  "Continuing to gamble despite negative consequences",
                ].map((sign, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-white/80">{sign}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-4">
                Remember: Gambling is Entertainment
              </h3>
              <p className="text-white/80">
                Gambling should be a fun, recreational activity—not a way to
                make money or escape problems. If gambling is causing harm to
                you or your loved ones, professional help is available and
                effective.
              </p>
            </div>
          </div>
        );

      case "help":
        return (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Get Help and Support
              </h2>
              <p className="text-xl text-white/80">
                You're not alone. Help is available 24/7 from professionals who
                understand gambling addiction.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <FaPhone className="text-primary text-xl" />
                  <h3 className="text-xl font-bold text-white">
                    Our Support Team
                  </h3>
                </div>
                <p className="text-white/80 mb-4">
                  Our dedicated responsible gaming team is here to help you set
                  limits, discuss concerns, or arrange self-exclusion.
                </p>
                <div className="space-y-2">
                  <p className="text-white/60">Phone: +880 1234-567890</p>
                  <p className="text-white/60">
                    Email: support@mosttigerbd.com
                  </p>
                  <p className="text-white/60">Live Chat: Available 24/7</p>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <FaHeart className="text-red-400 text-xl" />
                  <h3 className="text-xl font-bold text-white">
                    Professional Help
                  </h3>
                </div>
                <p className="text-white/80 mb-4">
                  For professional counseling and treatment, contact these
                  organizations specializing in gambling addiction.
                </p>
                <div className="space-y-2">
                  <p className="text-white/60">GamCare: 0808 8020 133</p>
                  <p className="text-white/60">National Gambling Helpline</p>
                  <p className="text-white/60">Website: gamcare.org.uk</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-8 border border-blue-400/30">
              <h3 className="text-2xl font-bold text-white mb-4">
                Self-Assessment Quiz
              </h3>
              <p className="text-white/80 mb-6">
                Take this quick quiz to assess whether your gambling habits may
                be causing concern. Answer honestly to get an accurate
                assessment.
              </p>
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105">
                Take Self-Assessment Quiz
              </button>
            </div>

            <div className="bg-green-500/10 border border-green-400/30 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-4">
                Recovery is Possible
              </h3>
              <p className="text-white/80 mb-4">
                Thousands of people have successfully overcome gambling problems
                and rebuilt their lives. With the right support and tools, you
                can too.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="tel:+8801234567890"
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
                >
                  Call for Help Now
                </a>
                <a
                  href="/contact"
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
                >
                  Contact Our Team
                </a>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Responsible Gaming - mosttiger BD | Play Safely</title>
        <meta
          name="description"
          content="Learn about responsible gaming at mosttiger BD. Access tools for self-control, recognize warning signs, and get help if needed. Gambling should be fun and safe."
        />
        <meta
          name="keywords"
          content="responsible gaming, gambling addiction help, self exclusion, deposit limits, gambling awareness Bangladesh"
        />
        <meta property="og:title" content="Responsible Gaming - mosttiger BD" />
        <meta
          property="og:description"
          content="Your safety comes first. Learn about responsible gaming tools and get help when needed."
        />
        <meta property="og:type" content="website" />
        <link
          rel="canonical"
          href="https://mosttigerbd.com/responsible-gaming"
        />
      </Helmet>

      <div className="min-h-screen bg-primary from-[#0f2a47] via-[#205583] to-[#0f2a47]">
        {/* Hero Section */}
        <section className="relative py-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                Responsible
              </span>{" "}
              Gaming
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Gambling should be entertaining and enjoyable. We provide tools
              and resources to help you maintain control and ensure gaming
              remains a positive experience.
            </p>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-primary to-orange-500 text-black font-bold"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30"
                  }`}
                >
                  <tab.icon className="text-sm" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">{renderContent()}</div>
        </section>
      </div>
    </>
  );
};

export default ResponsibleGaming;
