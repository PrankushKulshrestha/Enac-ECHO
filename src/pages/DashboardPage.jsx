import { useAuth } from '../lib/AuthContext';
import { Leaf, Coins, Recycle, Gift, ArrowRight, MapPin, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const recentActivity = [
  // Placeholder rows — replace with real Appwrite queries
  // { id: 1, type: 'Mobile Phone', points: 50, date: '2 Mar 2026', status: 'verified' },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <main className="pt-24 pb-16 px-6 bg-cream min-h-screen">
      <div className="max-w-5xl mx-auto">

        {/* Welcome header */}
        <div className="mb-10">
          <span className="section-tag mb-3 inline-flex">
            <Leaf className="w-3 h-3" />
            Dashboard
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-moss mt-3">
            Welcome, {user?.name?.split(' ')[0] || 'Eco Hero'}!
          </h1>
          <p className="font-body text-bark/55 mt-2 text-sm">
            Here's your e-waste contribution summary.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {[
            {
              label: 'Eco Points',
              value: '0',
              sub: 'Points earned',
              icon: Coins,
              color: 'text-eco-600',
              bg: 'bg-eco-100',
            },
            {
              label: 'Items Deposited',
              value: '0',
              sub: 'Total items',
              icon: Recycle,
              color: 'text-moss',
              bg: 'bg-moss/10',
            },
            {
              label: 'Rewards Redeemed',
              value: '0',
              sub: 'Coupons used',
              icon: Gift,
              color: 'text-leaf',
              bg: 'bg-leaf/10',
            },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-3xl p-7 border border-eco-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className={`w-11 h-11 ${bg} rounded-2xl flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${color}`} strokeWidth={1.5} />
              </div>
              <div className="font-display font-bold text-3xl text-moss">{value}</div>
              <div className="font-body text-bark/55 text-sm mt-1">{label}</div>
              <div className="font-mono text-xs text-bark/35 mt-0.5 tracking-wide">{sub}</div>
            </div>
          ))}
        </div>

        {/* Two-column section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">

          {/* Recent Activity */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-eco-100 p-7">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-eco-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-4 h-4 text-moss" strokeWidth={1.5} />
                </div>
                <h2 className="font-display font-semibold text-moss">Recent Activity</h2>
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-eco-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Recycle className="w-7 h-7 text-eco-300" strokeWidth={1.5} />
                </div>
                <p className="font-display font-medium text-bark/50 text-sm">No deposits yet</p>
                <p className="font-body text-bark/35 text-xs mt-1">Your submissions will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-eco-50 last:border-0">
                    <div>
                      <p className="font-body font-medium text-sm text-bark">{item.type}</p>
                      <p className="font-mono text-xs text-bark/40">{item.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-semibold text-sm text-eco-600">+{item.points} pts</span>
                      <span className={`font-mono text-xs px-2 py-1 rounded-full ${
                        item.status === 'verified'
                          ? 'bg-eco-100 text-eco-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Find a bin */}
            <div className="bg-moss rounded-3xl p-7 text-cream flex-1 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-leaf/30 blur-2xl pointer-events-none" />
              <div className="w-10 h-10 bg-cream/15 rounded-xl flex items-center justify-center mb-4 border border-cream/20">
                <MapPin className="w-5 h-5 text-eco-300" strokeWidth={1.5} />
              </div>
              <h3 className="font-display font-semibold text-base mb-2">Find a Bin</h3>
              <p className="font-body text-cream/65 text-xs leading-relaxed mb-5">
                6 collection points across campus. Drop off your e-waste and earn points.
              </p>
              <Link
                to="/#map"
                className="inline-flex items-center gap-2 bg-cream text-moss font-display font-semibold text-xs px-4 py-2.5 rounded-full hover:bg-eco-100 transition-colors duration-200 group"
              >
                View Map
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Leaderboard teaser */}
            <div className="bg-white rounded-3xl border border-eco-100 p-7">
              <div className="w-10 h-10 bg-eco-100 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5 text-moss" strokeWidth={1.5} />
              </div>
              <h3 className="font-display font-semibold text-moss text-base mb-1">Leaderboard</h3>
              <p className="font-body text-bark/50 text-xs leading-relaxed">
                Campus rankings coming soon. Start depositing to secure your spot!
              </p>
            </div>

          </div>
        </div>

        {/* Rewards CTA */}
        <div className="bg-white rounded-3xl p-8 border border-eco-100 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-eco-100 rounded-2xl flex items-center justify-center shrink-0">
              <Gift className="w-7 h-7 text-moss" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-moss">Redeem Your Points</h2>
              <p className="font-body text-bark/55 text-sm mt-0.5">
                Exchange eco-points for coupons from our partner brands.
              </p>
            </div>
          </div>
          <button
            disabled
            className="shrink-0 inline-flex items-center gap-2 bg-eco-100 text-moss/50 font-display font-semibold text-sm px-6 py-3 rounded-full cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>

      </div>
    </main>
  );
}