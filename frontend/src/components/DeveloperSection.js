import React from "react";
import {
  FaTwitter,
  FaLinkedinIn,
  FaInstagram,
  FaBehance,
} from "react-icons/fa";

const team = [
  {
    name: "Rutika Kolhapure",
    role: "Backend Developer",
    description:
      "Specializes in server-side logic, database management, and API development to ensure robust and scalable backend systems.",
    image: "/images/rutika.jpg",
    socials: {
      twitter: "#",
      linkedin: "#",
      instagram: "#",
      behance: "#"
    }
  },
  {
    name: "Prachi Dhekule",
    role: "Database Expert",
    description:
      "Skilled in database design, optimization, and management, ensuring efficient data storage and retrieval for our applications.",
    image: "/images/prachi.jpg",
    socials: {
      twitter: "#",
      linkedin: "#",
      instagram: "#",
      behance: "#"
    }
  },
  {
    name: "Pranjal Yallurkar",
    role: "AI/ML Specialist",
    description:
      "Focuses on integrating AI and machine learning algorithms to enhance application performance and user experience.",
    image: "/images/pranjal.jpg",
    socials: {
      twitter: "#",
      linkedin: "#",
      instagram: "#",
      behance: "#"
    }
  },
  {
    name: "Rakshita Handage",
    role: "UI/UX Designer and Frontend Developer",
    description:
      "Combines design aesthetics with frontend development skills to create intuitive and visually appealing user interfaces.",
    image: "/images/rakshita.jpg",
    socials: {
      twitter: "#",
      linkedin: "#",
      instagram: "#",
      behance: "#"
    }
  },
];

// Named export
export function DeveloperSection() {
  return (
    <div className="bg-black text-white py-20 px-4 md:px-6">
      {/* Section Header */}
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-extrabold">Our Team</h2>
        <div className="flex justify-center mt-3">
          <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full"></div>
        </div>
        <p className="mt-4 text-gray-300 max-w-2xl mx-auto">
          Meet the talented individuals who make Agro Optics possible
        </p>
      </div>

      {/* Team Grid - All in one row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {team.map((member, index) => (
          <div
            key={index}
            className="group bg-[#111] rounded-2xl shadow-lg overflow-hidden border border-gray-800 hover:border-pink-600 transition-all duration-300 hover:shadow-xl hover:shadow-pink-900/20"
          >
            {/* Photo Container */}
            <div className="relative overflow-hidden h-80">
              <img
                src={member.image}
                alt={member.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/images/placeholder-profile.jpg";
                }}
              />
              
              {/* Social Icons Overlay - Hidden by default, visible on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-10">
                <div className="flex gap-4">
                  <a 
                    href={member.socials.twitter} 
                    className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-pink-600 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 hover:scale-110"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaTwitter className="text-white text-lg" />
                  </a>
                  <a 
                    href={member.socials.linkedin} 
                    className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-blue-600 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 delay-75 hover:scale-110"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaLinkedinIn className="text-white text-lg" />
                  </a>
                  <a 
                    href={member.socials.instagram} 
                    className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-pink-500 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 delay-100 hover:scale-110"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaInstagram className="text-white text-lg" />
                  </a>
                  <a 
                    href={member.socials.behance} 
                    className="p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-blue-400 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 delay-150 hover:scale-110"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaBehance className="text-white text-lg" />
                  </a>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <h3 className="text-xl md:text-2xl font-bold group-hover:text-pink-400 transition-colors duration-300">
                {member.name}
              </h3>
              <p className="text-yellow-400 font-semibold mt-1 text-sm md:text-base">
                {member.role}
              </p>
              <p className="text-gray-300 mt-4 leading-relaxed text-sm md:text-base">
                {member.description}
              </p>

              {/* Social Icons for mobile (always visible on mobile, hidden on desktop) */}
              <div className="flex justify-center gap-4 mt-6 lg:hidden">
                <a 
                  href={member.socials.twitter} 
                  className="p-2 rounded-full bg-gray-800 hover:bg-pink-600 transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaTwitter />
                </a>
                <a 
                  href={member.socials.linkedin} 
                  className="p-2 rounded-full bg-gray-800 hover:bg-blue-600 transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaLinkedinIn />
                </a>
                <a 
                  href={member.socials.instagram} 
                  className="p-2 rounded-full bg-gray-800 hover:bg-pink-500 transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaInstagram />
                </a>
                <a 
                  href={member.socials.behance} 
                  className="p-2 rounded-full bg-gray-800 hover:bg-blue-400 transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaBehance />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional styling for better responsiveness */}
      <style jsx>{`
        @media (min-width: 1024px) {
          .grid-cols-4 > * {
            flex: 0 0 calc(25% - 1.5rem);
          }
        }
      `}</style>
    </div>
  );
}

// Default export (for backward compatibility)
export default DeveloperSection;