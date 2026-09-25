import React from "react";
import { Helmet } from "react-helmet-async";
import { FaUsers, FaShieldAlt, FaTrophy, FaGlobe } from "react-icons/fa";

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Us - mosttiger BD | Leading Online Gaming Platform</title>
        <meta
          name="description"
          content="Learn about mosttiger BD, Bangladesh's premier online gaming and betting platform. Discover our commitment to fair play, security, and responsible gaming."
        />
        <meta
          name="keywords"
          content="about mosttiger BD, online gaming Bangladesh, betting platform, responsible gaming, fair play"
        />
        <meta property="og:title" content="About Us - mosttiger BD" />
        <meta
          property="og:description"
          content="Bangladesh's leading online gaming platform with secure, fair, and responsible betting services."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://mosttigerbd.com/about" />
      </Helmet>

      <div className="min-h-screen bg-primary from-[#0f2a47] via-[#205583] to-[#0f2a47]">
        {/* Hero Section */}
        <section className="relative py-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              About{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                mosttiger BD
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Bangladesh's premier online gaming and betting platform, committed
              to delivering exceptional entertainment with the highest standards
              of security and fairness.
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { number: "50K+", label: "Active Users" },
                { number: "99.9%", label: "Uptime" },
                { number: "24/7", label: "Support" },
                { number: "100%", label: "Secure" },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500 mb-2">
                    {stat.number}
                  </div>
                  <div className="text-white/80 text-sm md:text-base">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  Our Mission
                </h2>
                <p className="text-lg text-white/80 leading-relaxed mb-6">
                  To provide Bangladesh's gaming community with a world-class
                  online betting and gaming experience that combines
                  cutting-edge technology, fair play, and responsible
                  entertainment.
                </p>
                <p className="text-lg text-white/80 leading-relaxed">
                  We believe in creating opportunities for entertainment while
                  maintaining the highest standards of integrity, security, and
                  responsible gaming practices.
                </p>
              </div>
              <div className="relative">
                <div className="w-full h-96 bg-primary from-primary/20 to-orange-500/20 rounded-3xl backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <div className="text-center">
                    <FaTrophy className="text-6xl text-primary mx-auto mb-4" />
                    <p className="text-white text-xl font-semibold">
                      Excellence in Gaming
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
              Our Values
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: FaShieldAlt,
                  title: "Security First",
                  description:
                    "Advanced encryption and security measures to protect your data and transactions.",
                },
                {
                  icon: FaUsers,
                  title: "Fair Play",
                  description:
                    "Provably fair gaming systems ensuring every outcome is random and unbiased.",
                },
                {
                  icon: FaGlobe,
                  title: "Responsible Gaming",
                  description:
                    "Committed to promoting responsible gaming practices and player protection.",
                },
              ].map((value, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-300"
                >
                  <value.icon className="text-4xl text-primary mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {value.title}
                  </h3>
                  <p className="text-white/80 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-white/10">
              <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-8">
                Our Story
              </h2>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <p className="text-lg text-white/80 leading-relaxed mb-6">
                    Founded with a vision to revolutionize online gaming in
                    Bangladesh, mosttiger BD has grown from a small platform to
                    become the most trusted name in digital entertainment.
                  </p>
                  <p className="text-lg text-white/80 leading-relaxed mb-6">
                    Our journey began with a simple belief: gaming should be
                    fun, fair, and accessible to everyone. Today, we serve
                    thousands of players across Bangladesh, offering a wide
                    range of games and betting options.
                  </p>
                  <p className="text-lg text-white/80 leading-relaxed">
                    As we continue to grow, our commitment to excellence,
                    security, and responsible gaming remains unwavering.
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-32 h-32 bg-primary from-primary to-orange-500 rounded-full mb-6">
                    <span className="text-4xl font-bold text-white">
                      mosttiger
                    </span>
                  </div>
                  <p className="text-white/80 text-lg">
                    mosttiger Better Gaming Experience
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Join Our Community
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Experience the future of online gaming in Bangladesh. Register
              today and discover why thousands of players choose mosttiger BD
              for their entertainment needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary hover:to-orange-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                Get Started Now
              </a>
              <a
                href="/contact"
                className="border-2 border-white/30 hover:border-white/50 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300"
              >
                Contact Us
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default About;
