import { Leaf, Target, Heart, Globe, Users, Recycle } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="pt-24 pb-16 px-6 bg-cream min-h-screen">
      <div className="max-w-4xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-16">
          <span className="section-tag mb-4 inline-flex">
            <Leaf className="w-3 h-3" />
            About Project ECHO
          </span>
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-moss mt-4 mb-4 leading-tight">
            Electronic Collection &<br />Handling Organization
          </h1>
          <p className="font-body text-bark/60 text-lg max-w-2xl mx-auto leading-relaxed">
            A student-driven initiative by Enactus NSUT to tackle e-waste on campus
            through gamification, community engagement, and sustainable habits.
          </p>
        </div>

        {/* Mission / Values / Impact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            {
              icon: Target,
              title: 'Our Mission',
              desc: 'To make e-waste disposal accessible, rewarding, and habitual for every student at NSUT.',
              color: 'bg-moss',
            },
            {
              icon: Heart,
              title: 'Our Values',
              desc: 'Sustainability, community responsibility, innovation, and building a greener campus culture together.',
              color: 'bg-leaf',
            },
            {
              icon: Globe,
              title: 'Our Impact',
              desc: 'From campus to community — setting a model for sustainable e-waste management in educational institutions.',
              color: 'bg-eco-500',
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="step-card">
              <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-5`}>
                <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-display font-semibold text-lg text-moss mb-2">{title}</h3>
              <p className="font-body text-bark/60 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* What We Collect */}
        <div className="bg-white rounded-3xl border border-eco-100 p-10 mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-eco-100 rounded-xl flex items-center justify-center">
              <Recycle className="w-5 h-5 text-moss" strokeWidth={1.5} />
            </div>
            <h2 className="font-display font-bold text-2xl text-moss">What We Collect</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              'Mobile Phones', 'Laptops & Tablets', 'Chargers & Cables',
              'Batteries', 'Earphones & Headsets', 'Circuit Boards',
              'USB Drives', 'Old Keyboards & Mice', 'Small Appliances',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 bg-eco-50 border border-eco-100 rounded-xl px-4 py-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-eco-500 shrink-0" />
                <span className="font-body text-sm text-bark/70">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team / Enactus */}
        <div className="bg-moss rounded-3xl p-10 text-cream text-center">
          <div className="w-12 h-12 bg-cream/15 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-cream/20">
            <Users className="w-6 h-6 text-eco-300" strokeWidth={1.5} />
          </div>
          <h2 className="font-display font-bold text-2xl mb-3">Backed by Enactus NSUT</h2>
          <p className="font-body text-cream/70 text-base max-w-xl mx-auto leading-relaxed">
            Enactus is an international nonprofit that brings together student, academic,
            and business leaders committed to using the power of entrepreneurial action
            to transform lives and shape a better, more sustainable world.
          </p>
        </div>

      </div>
    </main>
  );
}