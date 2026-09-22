import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaTelegram,
} from "react-icons/fa";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      alert("Thank you for your message! We will get back to you soon.");
      setFormData({ name: "", email: "", subject: "", message: "" });
      setIsSubmitting(false);
    }, 2000);
  };

  return (
    <>
      <Helmet>
        <title>Contact Us - ck369 BD | Get in Touch</title>
        <meta
          name="description"
          content="Contact ck369 BD for support, inquiries, or partnership opportunities. We're here to help 24/7."
        />
        <meta
          name="keywords"
          content="contact ck369 BD, customer support, gambling support Bangladesh, betting help"
        />
        <meta property="og:title" content="Contact Us - ck369 BD" />
        <meta
          property="og:description"
          content="Get in touch with our support team for any questions or assistance."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://ck369bd.com/contact" />
      </Helmet>

      <div className="min-h-screen bg-primary from-[#0f2a47] via-[#205583] to-[#0f2a47]">
        {/* Hero Section */}
        <section className="relative py-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                Contact
              </span>{" "}
              Us
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Have questions or need assistance? Our support team is here to
              help you 24/7. Get in touch with us through any of the channels
              below.
            </p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 pb-16">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">
                  Get in Touch
                </h2>
                <p className="text-white/80 mb-8">
                  We're committed to providing excellent customer service.
                  Choose the contact method that works best for you.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-3 rounded-xl">
                      <FaPhone className="text-primary text-xl" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        Phone Support
                      </h3>
                      <p className="text-white/60">+880 1234-567890</p>
                      <p className="text-white/40 text-sm">24/7 Available</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-3 rounded-xl">
                      <FaEnvelope className="text-primary text-xl" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        Email Support
                      </h3>
                      <p className="text-white/60">support@ck369bd.com</p>
                      <p className="text-white/40 text-sm">
                        Response within 24 hours
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-3 rounded-xl">
                      <FaMapMarkerAlt className="text-primary text-xl" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        Office Address
                      </h3>
                      <p className="text-white/60">
                        123 Gulshan Avenue, Dhaka 1212
                      </p>
                      <p className="text-white/40 text-sm">Bangladesh</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-3 rounded-xl">
                      <FaClock className="text-primary text-xl" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        Business Hours
                      </h3>
                      <p className="text-white/60">24/7 Support</p>
                      <p className="text-white/40 text-sm">
                        Live chat available
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Follow Us
                </h3>
                <div className="flex gap-4">
                  {[
                    {
                      icon: FaFacebook,
                      href: "#",
                      color: "hover:text-blue-400",
                    },
                    {
                      icon: FaTwitter,
                      href: "#",
                      color: "hover:text-blue-300",
                    },
                    {
                      icon: FaInstagram,
                      href: "#",
                      color: "hover:text-pink-400",
                    },
                    {
                      icon: FaTelegram,
                      href: "#",
                      color: "hover:text-blue-400",
                    },
                  ].map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      className={`bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-all duration-300 ${social.color}`}
                    >
                      <social.icon className="text-xl" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h2 className="text-3xl font-bold text-white mb-6">
                Send us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-white font-medium mb-2"
                  >
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-white font-medium mb-2"
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter your email address"
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-white font-medium mb-2"
                  >
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-primary transition-colors"
                    placeholder="What is this about?"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-white font-medium mb-2"
                  >
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary hover:to-orange-600 text-black font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                      Sending...
                    </div>
                  ) : (
                    "Send Message"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;
