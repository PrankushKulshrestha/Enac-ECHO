import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Recycle, Coins, Gift, Leaf, ChevronDown, Users, Building2, Zap } from 'lucide-react';
import { useAuth } from '../lib/useAuth';

// Animated counter hook
function useCounter(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

// Stat card with counter
function StatCard({ number, suffix, label, icon: Icon, delay, visible }) {
  const count = useCounter(number, 1800, visible);
  return (
    <div
      className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white border border-eco-100 hover:shadow-xl hover:shadow-moss/10 hover:-translate-y-1 transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 bg-eco-100 rounded-2xl flex items-center justify-center">
        <Icon className="w-6 h-6 text-moss" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <div className="font-display font-bold text-4xl text-moss tracking-tight">
          {visible ? count : 0}{suffix}
        </div>
        <div className="font-body text-bark/60 text-sm mt-1 tracking-wide">{label}</div>
      </div>
    </div>
  );
}

// Step card
function StepCard({ number, icon: Icon, title, description, color }) {
  return (
    <div className="step-card group">
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
        </div>
        <span className="font-mono text-xs font-bold text-bark/25 mt-3.5 tracking-widest">0{number}</span>
      </div>
      <h3 className="font-display font-semibold text-xl text-moss mb-3 group-hover:text-leaf transition-colors duration-300">
        {title}
      </h3>
      <p className="font-body text-bark/65 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// Bin locations on NSUT Dwarka campus
const BIN_LOCATIONS = [
  { id: 1, name: 'Main Gate Lobby',       lat: 28.60930343043814,   lng: 77.03525103330269, description: 'Near the main entrance security post' },
  { id: 2, name: 'Library Entrance',      lat: 28.610326997786746,  lng: 77.03893135257873, description: 'Outside the central library block' },
  { id: 3, name: 'Block 6 Ground Floor',  lat: 28.610335035820555,  lng: 77.03789310072234, description: 'Inside Block 6, ground floor lobby' },
  { id: 4, name: 'Block 4 Ground Floor',  lat: 28.609712315644376,  lng: 77.03761619747404, description: 'Inside Block 4, ground floor lobby' },
  { id: 5, name: 'Canteen Area',          lat: 28.611676671790402,  lng: 77.0373852713702, description: 'Near the main student canteen' },
  { id: 6, name: 'Sports Complex',        lat: 28.609892912962863,  lng: 77.04004601343885, description: 'At the sports complex entrance' },
];

function BinMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = window.L;

      const map = L.map(mapRef.current, {
        center: [28.610335035820555, 77.03789310072234],
        zoom: 17,
        scrollWheelZoom: false,
      });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const binIcon = L.divIcon({
        className: '',
        html: `
          <div style="
            width: 36px; height: 36px;
            background: #2D4A22;
            border: 3px solid #fff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 12px rgba(45,74,34,0.4);
            display: flex; align-items: center; justify-content: center;
          ">
            <div style="
              transform: rotate(45deg);
              font-size: 14px;
              line-height: 1;
              margin-top: -2px;
            ">♻️</div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -38],
      });

      BIN_LOCATIONS.forEach((bin) => {
        L.marker([bin.lat, bin.lng], { icon: binIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; min-width: 160px;">
              <div style="font-weight: 700; color: #2D4A22; font-size: 14px; margin-bottom: 4px;">
                📍 ${bin.name}
              </div>
              <div style="color: #6b7280; font-size: 12px; line-height: 1.4;">
                ${bin.description}
              </div>
              <div style="
                margin-top: 8px;
                display: inline-block;
                background: #f0fdf4;
                color: #2D4A22;
                font-size: 10px;
                font-weight: 600;
                padding: 2px 8px;
                border-radius: 999px;
                border: 1px solid #bbf7d0;
              ">Bin #${bin.id}</div>
            </div>
          `, { maxWidth: 220 });
      });
    };

    if (window.L) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="map-container w-full h-96 lg:h-[520px] relative">
      <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '24px' }} />
      {/* Legend overlay */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-eco-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-moss" />
          <span className="font-body text-xs text-bark/70 font-medium">Collection Bins</span>
        </div>
        <div className="font-mono text-xs text-bark/50">{BIN_LOCATIONS.length} active locations</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, []);

  const handleGetStarted = () => navigate(user ? '/dashboard' : '/register');
  const handleLoginRedirect = () => navigate(user ? '/dashboard' : '/login');

  return (
    <main className="overflow-hidden">
      {/* ── HERO ── */}
      <section className="relative min-h-screen bg-hero-pattern flex flex-col items-center justify-center px-6 pt-20">
        <div className="absolute top-24 left-8 w-32 h-32 rounded-full bg-eco-200/40 blur-2xl animate-float pointer-events-none" />
        <div className="absolute bottom-24 right-12 w-48 h-48 rounded-full bg-leaf/15 blur-3xl animate-float-delayed pointer-events-none" />
        <div className="absolute top-1/2 left-4 w-20 h-20 rounded-full bg-eco-300/20 blur-xl animate-pulse-slow pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232D4A22' fill-opacity='1'%3E%3Cpath d='M30 5 C20 15, 10 25, 30 40 C50 25, 40 15, 30 5z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 mb-8">
            <span className="section-tag">
              <Leaf className="w-3 h-3" />
              A Sustainable Initiative by Enactus NSUT
            </span>
          </div>
          <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl text-moss leading-[1.05] tracking-tight mb-6">
            Project{' '}
            <span className="relative inline-block">
              <span className="text-gradient-eco">ECHO</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 6 Q50 2 100 5 Q150 8 198 4" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6"/>
              </svg>
            </span>
          </h1>
          <p className="font-body text-bark/60 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-4">
            <span className="font-semibold text-leaf">E-Waste Collection Hub Operation</span>
          </p>
          <p className="font-body text-bark/55 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-10">
            Transform your e-waste into eco-points. Join the sustainable revolution at NSUT.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={handleGetStarted} className="btn-primary text-base group">
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
            <a href="#map" className="btn-secondary text-base group">
              <MapPin className="w-4 h-4" />
              View Bin Locations
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="font-mono text-xs text-bark tracking-widest uppercase">Scroll</span>
          <ChevronDown className="w-4 h-4 text-bark animate-bounce" />
        </div>
      </section>

      {/* ── MAP SECTION ── */}
      <section id="map" className="py-24 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="section-tag mb-4 inline-flex">
              <MapPin className="w-3 h-3" />
              Campus Locations
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-moss mt-4 mb-3">
              Find a Collection Bin
            </h2>
            <p className="font-body text-bark/55 text-base max-w-md mx-auto">
              6 strategically placed bins across NSUT campus for your convenience.
            </p>
          </div>

          {/* Leaflet map with pins */}
          <BinMap />

          {/* Bin location list below map */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            {BIN_LOCATIONS.map((bin) => (
              <div key={bin.id} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-eco-50 border border-eco-100 text-center">
                <div className="w-8 h-8 bg-moss rounded-xl flex items-center justify-center text-cream text-xs font-bold font-mono">
                  {bin.id}
                </div>
                <span className="font-body text-xs text-bark/70 leading-tight">{bin.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <section ref={statsRef} className="py-20 bg-cream px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <StatCard number={6}   suffix=""    label="Collection Bins"      icon={Recycle}   delay={0}   visible={statsVisible} />
            <StatCard number={500} suffix="+"   label="Students Engaged"     icon={Users}     delay={100} visible={statsVisible} />
            <StatCard number={100} suffix="kg+" label="E-waste Collected"    icon={Zap}       delay={200} visible={statsVisible} />
            <StatCard number={5}   suffix="+"   label="Partner Organizations" icon={Building2} delay={300} visible={statsVisible} />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="section-tag mb-4 inline-flex">
              <Leaf className="w-3 h-3" />
              The Process
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-moss mt-4 mb-3">
              How It Works
            </h2>
            <p className="font-body text-bark/55 text-base max-w-md mx-auto">
              Simple steps to contribute to a sustainable campus
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <StepCard number={1} icon={MapPin} title="Deposit E-Waste"   description="Drop your electronic waste at any of our 6 strategically placed bins across campus." color="bg-moss" />
            <StepCard number={2} icon={Coins}  title="Earn Points"       description="Log your submission and earn eco-points based on the type and quantity of e-waste deposited." color="bg-leaf" />
            <StepCard number={3} icon={Gift}   title="Redeem Rewards"    description="Exchange your points for exclusive coupons and rewards from our partner brands." color="bg-eco-500" />
          </div>
        </div>
      </section>

      {/* ── JOIN THE MOVEMENT ── */}
      <section className="py-24 bg-moss relative overflow-hidden px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-leaf/20 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-eco-700/30 blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 60px),
                repeating-linear-gradient(-45deg, #fff 0px, #fff 1px, transparent 1px, transparent 60px)`
            }}
          />
        </div>
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 bg-cream/10 text-eco-300 font-mono text-xs font-bold px-4 py-1.5 rounded-full tracking-widest uppercase mb-6">
              <Leaf className="w-3 h-3" />
              Take Action
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-cream mb-3">
              Join the Movement
            </h2>
            <p className="font-body text-cream/65 text-base max-w-md mx-auto">
              Together, we can make NSUT a model for sustainable e-waste management
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-cream/10 backdrop-blur-sm border border-cream/15 rounded-3xl p-8 hover:bg-cream/15 transition-all duration-300 group">
              <div className="w-12 h-12 bg-eco-500/20 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-eco-500/30 transition-colors duration-300">
                <Users className="w-6 h-6 text-eco-300" strokeWidth={1.5} />
              </div>
              <h3 className="font-display font-semibold text-xl text-cream mb-3">For Students</h3>
              <p className="font-body text-cream/65 text-sm leading-relaxed">
                Earn rewards while contributing to environmental sustainability. Track your impact and compete with peers.
              </p>
            </div>
            <div className="bg-cream/10 backdrop-blur-sm border border-cream/15 rounded-3xl p-8 hover:bg-cream/15 transition-all duration-300 group">
              <div className="w-12 h-12 bg-eco-500/20 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-eco-500/30 transition-colors duration-300">
                <Building2 className="w-6 h-6 text-eco-300" strokeWidth={1.5} />
              </div>
              <h3 className="font-display font-semibold text-xl text-cream mb-3">For Campus</h3>
              <p className="font-body text-cream/65 text-sm leading-relaxed">
                Creating awareness about proper e-waste disposal and building a culture of environmental responsibility.
              </p>
            </div>
          </div>
          <div className="text-center">
            <button
              onClick={handleLoginRedirect}
              className="inline-flex items-center gap-3 bg-cream text-moss font-display font-semibold text-base px-8 py-4 rounded-full hover:bg-eco-100 transition-all duration-300 hover:shadow-2xl hover:shadow-moss/30 hover:-translate-y-0.5 group"
            >
              Start Contributing Today
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}