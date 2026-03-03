import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Recycle, Coins, Gift, Leaf, ChevronDown, Users, Building2, Zap } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

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

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    // Hero animation
    const timer = setTimeout(() => setHeroVisible(true), 100);

    // Stats intersection observer
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
        {/* Floating decorative blobs */}
        <div className="absolute top-24 left-8 w-32 h-32 rounded-full bg-eco-200/40 blur-2xl animate-float pointer-events-none" />
        <div className="absolute bottom-24 right-12 w-48 h-48 rounded-full bg-leaf/15 blur-3xl animate-float-delayed pointer-events-none" />
        <div className="absolute top-1/2 left-4 w-20 h-20 rounded-full bg-eco-300/20 blur-xl animate-pulse-slow pointer-events-none" />

        {/* Leaf pattern grid (subtle) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232D4A22' fill-opacity='1'%3E%3Cpath d='M30 5 C20 15, 10 25, 30 40 C50 25, 40 15, 30 5z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Pill tag */}
          <div className="inline-flex items-center gap-2 mb-8">
            <span className="section-tag">
              <Leaf className="w-3 h-3" />
              A Sustainable Initiative by Enactus NSUT
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl text-moss leading-[1.05] tracking-tight mb-6">
            Project{' '}
            <span className="relative inline-block">
              <span className="text-gradient-eco">ECHO</span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 6 Q50 2 100 5 Q150 8 198 4" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6"/>
              </svg>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="font-body text-bark/60 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-4">
            <span className="font-semibold text-leaf">Electronic Collection & Handling Organization</span>
          </p>
          <p className="font-body text-bark/55 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-10">
            Transform your e-waste into eco-points. Join the sustainable revolution at NSUT.
          </p>

          {/* CTA Buttons */}
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

        {/* Scroll indicator */}
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

          <div className="map-container w-full h-96 lg:h-[520px] relative">
            <iframe
              className="map-iframe rounded-3xl"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.5234506388457!2d77.03356687549778!3d28.61003007568!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d1b3bb4ad6af5%3A0x9f3d9cb3ef3c8e78!2sNetaji%20Subhas%20University%20of%20Technology!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="NSUT Campus Map - Bin Locations"
            />
            {/* Map overlay legend */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-eco-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-moss" />
                <span className="font-body text-xs text-bark/70 font-medium">Collection Bins</span>
              </div>
              <div className="font-mono text-xs text-bark/50">6 active locations</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <section ref={statsRef} className="py-20 bg-cream px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <StatCard number={6} suffix="" label="Collection Bins" icon={Recycle} delay={0} visible={statsVisible} />
            <StatCard number={500} suffix="+" label="Students Engaged" icon={Users} delay={100} visible={statsVisible} />
            <StatCard number={100} suffix="kg+" label="E-waste Collected" icon={Zap} delay={200} visible={statsVisible} />
            <StatCard number={5} suffix="+" label="Partner Organizations" icon={Building2} delay={300} visible={statsVisible} />
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
            <StepCard
              number={1}
              icon={MapPin}
              title="Deposit E-Waste"
              description="Drop your electronic waste at any of our 6 strategically placed bins across campus."
              color="bg-moss"
            />
            <StepCard
              number={2}
              icon={Coins}
              title="Earn Points"
              description="Log your submission and earn eco-points based on the type and quantity of e-waste deposited."
              color="bg-leaf"
            />
            <StepCard
              number={3}
              icon={Gift}
              title="Redeem Rewards"
              description="Exchange your points for exclusive coupons and rewards from our partner brands."
              color="bg-eco-500"
            />
          </div>
        </div>
      </section>

      {/* ── JOIN THE MOVEMENT ── */}
      <section className="py-24 bg-moss relative overflow-hidden px-6">
        {/* Background decorations */}
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
            {/* For Students */}
            <div className="bg-cream/10 backdrop-blur-sm border border-cream/15 rounded-3xl p-8 hover:bg-cream/15 transition-all duration-300 group">
              <div className="w-12 h-12 bg-eco-500/20 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-eco-500/30 transition-colors duration-300">
                <Users className="w-6 h-6 text-eco-300" strokeWidth={1.5} />
              </div>
              <h3 className="font-display font-semibold text-xl text-cream mb-3">For Students</h3>
              <p className="font-body text-cream/65 text-sm leading-relaxed">
                Earn rewards while contributing to environmental sustainability. Track your impact and compete with peers.
              </p>
            </div>

            {/* For Campus */}
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
