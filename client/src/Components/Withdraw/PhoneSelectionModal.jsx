import React, { useState, useEffect } from "react";
import { FaTimes, FaPhone, FaCheck } from "react-icons/fa";

const PhoneSelectionModal = ({
  isOpen,
  onClose,
  phones,
  onSelect,
  selectedPhone,
}) => {
  const [localSelected, setLocalSelected] = useState(selectedPhone);

  useEffect(() => {
    setLocalSelected(selectedPhone);
  }, [selectedPhone]);

  if (!isOpen) return null;

  const handleSelect = (phone) => {
    setLocalSelected(phone.number);
    onSelect(phone.number);
    onClose();
  };

  // Get primary phone (has isPrimary: true or is first)
  const getPrimaryPhone = () => {
    return phones.find((p) => p.isPrimary) || phones[0];
  };

  return (
    <>
      {/* OVERLAY */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-9998 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* MODAL CONTAINER */}
      <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
        {/* MODAL CONTENT */}
        <div
          className="w-full max-w-sm bg-[#1a1a1a] rounded-3xl shadow-2xl border border-[#ffb80022] overflow-hidden animate-in fade-in zoom-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between p-4 border-b border-primary/30">
            <div className="flex items-center gap-2">
              <FaPhone className="text-primary" size={18} />
              <h3 className="text-white font-bold text-lg">
                Select Phone Number
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition"
              aria-label="Close modal"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* CONTENT */}
          <div className="max-h-80 overflow-y-auto p-3 space-y-2">
            {phones && phones.length > 0 ? (
              phones.map((phone, idx) => {
                const isPrimary =
                  phone.isPrimary || phone === getPrimaryPhone();
                const isSelected = localSelected === phone.number;

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(phone)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-white/20 bg-[#252525] hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FaPhone className="text-primary" size={16} />
                      <div className="text-left">
                        <p className="text-white font-bold">{phone.number}</p>
                        {isPrimary && (
                          <p className="text-primary text-xs font-semibold">
                            PRIMARY
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="bg-primary text-black rounded-full p-1">
                        <FaCheck size={14} />
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-white/60 text-sm">No phone numbers saved</p>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="border-t border-white/10 p-3">
            <button
              onClick={onClose}
              className="w-full h-12 bg-[#4b4b4b] hover:bg-[#5a5a5a] text-white rounded-lg font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PhoneSelectionModal;
