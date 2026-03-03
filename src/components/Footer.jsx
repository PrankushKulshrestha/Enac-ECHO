import { Link } from 'react-router-dom';
import { Leaf, MapPin, Mail, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-moss text-cream relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-leaf/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-eco-700/30 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cream/15 rounded-xl flex items-center justify-center border border-cream/20">
                <Leaf className="w-5 h-5 text-eco-300" strokeWidth={2} />
              </div>
              <div>
                <div className="font-display font-bold text-xl tracking-tight">Project ECHO</div>
                <div className="font-mono text-xs text-eco-300 tracking-widest uppercase">Enactus NSUT</div>
              </div>
            </div>
            <p className="font-body text-cream/70 text-sm leading-relaxed max-w-xs">
              An initiative by Enactus NSUT to promote sustainable e-waste management on campus.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-sm tracking-widest uppercase text-eco-300 mb-5">
              Contact
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-eco-400 mt-0.5 shrink-0" />
                <p className="font-body text-cream/70 text-sm leading-relaxed">
                  Netaji Subhas University of Technology, Azad Hind Fauj Marg, Dwarka, New Delhi - 110078
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-eco-400 shrink-0" />
                <a
                  href="mailto:enactus@nsut.ac.in"
                  className="font-body text-cream/70 text-sm hover:text-eco-300 transition-colors duration-200"
                >
                  enactus@nsut.ac.in
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-sm tracking-widest uppercase text-eco-300 mb-5">
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="font-body text-cream/70 text-sm hover:text-eco-300 transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-4 h-px bg-cream/30 group-hover:w-6 group-hover:bg-eco-400 transition-all duration-300" />
                  About Project
                </Link>
              </li>
              <li>
                <Link to="/#map" className="font-body text-cream/70 text-sm hover:text-eco-300 transition-colors duration-200 flex items-center gap-2 group">
                  <span className="w-4 h-px bg-cream/30 group-hover:w-6 group-hover:bg-eco-400 transition-all duration-300" />
                  Bin Locations
                </Link>
              </li>
              <li>
                <a
                  href="https://enactus.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-cream/70 text-sm hover:text-eco-300 transition-colors duration-200 flex items-center gap-2 group"
                >
                  <span className="w-4 h-px bg-cream/30 group-hover:w-6 group-hover:bg-eco-400 transition-all duration-300" />
                  Enactus NSUT
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-cream/10 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-mono text-xs text-cream/40 tracking-wide">
              © 2026 Project ECHO – Enactus NSUT. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-eco-400 animate-pulse" />
              <span className="font-mono text-xs text-cream/40">Making NSUT Greener</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
