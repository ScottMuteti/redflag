/* eslint-disable react/prop-types -- page sections */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  ChartColumn,
  Check,
  GraduationCap,
  LockKeyhole,
  Mail,
  Menu,
  MessageSquare,
  Radar,
  Send,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NAV } from '../../components/shell/nav';
import {
  AreaTrend,
  Badge,
  Button,
  Card,
  CardHeader,
  Logo,
  StatCard,
  StatusBadge,
} from '../../components/ui';
import { cn } from '../../lib/cn';
import {
  COMPARISON,
  CTA,
  FEATURES,
  FOOTER,
  HEADLINE,
  HERO,
  NAV_LINKS,
  PROBLEM_STATS,
  STEPS,
  THREATS,
} from '../../content/marketing';
import { previewCampaigns, previewStats, previewTooltip, previewTrend } from '../../mocks/landing';

// Fade + rise 12px when scrolled into view, once. Static when the user prefers reduced motion.
function Reveal({ as = 'section', className, children, ...props }) {
  const reduce = useReducedMotion();
  const Component = motion[as];
  return (
    <Component
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}

function SectionHeading({ eyebrow, title, body }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <p className="text-xs font-bold tracking-[0.14em] text-brand-700 uppercase">{eyebrow}</p>
      )}
      <h2 className="mt-2 text-[32px] leading-tight font-extrabold tracking-tight text-ink sm:text-[38px]">
        {title}
      </h2>
      {body && <p className="mt-3 text-card leading-relaxed text-ink-2 sm:text-base">{body}</p>}
    </div>
  );
}

function AuthButtons({ user, stacked = false }) {
  if (user) {
    return (
      <Button
        as={Link}
        to={NAV[user.role]?.home || '/'}
        variant="primary"
        iconRight={ArrowRight}
        className={stacked ? 'w-full' : ''}
      >
        Go to Dashboard
      </Button>
    );
  }
  return (
    <>
      <Button as={Link} to="/login" variant="outline" className={stacked ? 'w-full' : ''}>
        Log in
      </Button>
      <Button as={Link} to="/register" variant="primary" className={stacked ? 'w-full' : ''}>
        Sign up
      </Button>
    </>
  );
}

function LandingNav({ user }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-card/95 backdrop-blur transition-[border-color] duration-200',
        'border-b',
        scrolled ? 'border-line' : 'border-transparent',
      )}
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link to="/" aria-label="RedFlag home">
          <Logo tone="dark" />
        </Link>
        <ul className="mx-auto hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-body font-medium text-ink-2 transition hover:text-brand-700"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <AuthButtons user={user} />
        </div>
        <button
          type="button"
          className="ml-auto grid size-10 place-items-center rounded-control text-ink md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="landing-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>
      {open && (
        <div
          id="landing-menu"
          className="animate-fade border-t border-line bg-card px-5 pt-3 pb-5 md:hidden"
        >
          <ul className="grid gap-1">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-control px-2 py-2.5 text-card font-medium text-ink hover:bg-brand-50"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2">
            <AuthButtons user={user} stacked />
          </div>
        </div>
      )}
    </header>
  );
}

// Product preview built from the real dashboard components, tilted with a brand-tinted shadow.
function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] lg:mx-0" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[32px] bg-brand-50" />
      <div className="relative grid gap-3 rounded-[20px] border border-line bg-page p-3 shadow-brand [transform:perspective(1800px)_rotateY(-9deg)_rotateX(4deg)] sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {previewStats.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              period={s.period}
              value={s.value}
              suffix={s.suffix}
              trend={s.trend}
              invertGood={s.invertGood}
              series={s.series}
              formatPoint={(v) => (s.suffix ? v : `${v}%`)}
            />
          ))}
        </div>
        <Card>
          <CardHeader title="Vulnerability trend" subtitle="Org score per simulation wave" />
          <AreaTrend data={previewTrend} height={120} />
        </Card>
        <Card padded={false} className="hidden overflow-hidden sm:block">
          <table className="w-full text-body">
            <tbody>
              {previewCampaigns.map((c) => (
                <tr key={c.id} className="h-11 border-b border-line last:border-0">
                  <td className="pl-4 text-xs text-ink-3">{c.id}</td>
                  <td className="px-3 font-medium text-ink">{c.name}</td>
                  <td className="px-3 text-ink-2">{c.channel}</td>
                  <td className="pr-4 text-right">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <div className="absolute -bottom-5 -left-4 rounded-card bg-tooltip px-4 py-3 text-white shadow-pop sm:-left-8">
        <p className="text-micro text-white-70">{previewTooltip.title}</p>
        <p className="text-card font-bold">{previewTooltip.value}</p>
        <p className="text-micro text-white-70">{previewTooltip.note}</p>
      </div>
    </div>
  );
}

function Hero({ user }) {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-14 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-28">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800">
            <span className="size-1.5 rounded-full bg-brand-700" aria-hidden="true" />
            {HERO.badge}
          </span>
          <h1 className="mt-5 text-[44px] leading-[1.02] font-extrabold tracking-tight text-ink sm:text-[56px]">
            {HEADLINE.lead} <span className="text-brand-700">{HEADLINE.accent}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">{HERO.subheading}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              as={Link}
              to={user ? NAV[user.role]?.home || '/' : '/register'}
              variant="primary"
              size="lg"
              iconRight={ArrowRight}
            >
              {user ? 'Go to Dashboard' : 'Get Started'}
            </Button>
            {!user && (
              <Button as={Link} to="/login" variant="outline" size="lg">
                Log in
              </Button>
            )}
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
            {HERO.reassurance.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-body font-medium text-ink-2">
                <Check size={16} strokeWidth={2.5} className="text-brand-700" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <HeroPreview />
        </motion.div>
      </div>
    </section>
  );
}

function ProblemStrip() {
  const stats = PROBLEM_STATS.filter((s) => s.value);
  if (stats.length === 0) return null;
  return (
    <Reveal className="bg-sidebar text-white" aria-label="The problem">
      <div
        className={cn(
          'mx-auto grid max-w-6xl gap-10 px-5 py-14 text-center',
          stats.length > 1 && 'md:grid-cols-3',
        )}
      >
        {stats.map((s) => (
          <div key={s.caption}>
            <p className="text-[52px] leading-none font-extrabold tracking-tight">{s.value}</p>
            <p className="mx-auto mt-3 max-w-sm text-card text-white">{s.caption}</p>
            <p className="mt-2 text-xs text-sidebar-text">Source: {s.source}</p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

const STEP_ICONS = [Send, Radar, GraduationCap];

function HowItWorks() {
  return (
    <Reveal id="how-it-works" className="scroll-mt-20 bg-card py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="How it works"
          title="Simulate. Measure. Train."
          body="Three steps that turn your people from the weakest link into the first line of defence."
        />
        <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
          <span
            className="absolute top-[52px] right-[16%] left-[16%] hidden h-px bg-brand-100 md:block"
            aria-hidden="true"
          />
          {STEPS.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <li key={step.title} className="relative">
                <Card className="h-full text-center">
                  <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand-700 ring-8 ring-card">
                    <Icon size={26} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-xs font-bold tracking-[0.14em] text-brand-700 uppercase">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-ink">{step.title}</h3>
                  <p className="mt-2 text-body leading-relaxed text-ink-2">{step.body}</p>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>
    </Reveal>
  );
}

function ThreatCard({ threat }) {
  const sms = threat.channel === 'SMS';
  return (
    <Card className="flex h-full flex-col" interactive>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-card font-bold text-ink">{threat.name}</h3>
        <div className="flex gap-1.5">
          <Badge tone="brand" icon={sms ? MessageSquare : Mail}>
            {threat.channel}
          </Badge>
          <Badge tone="neutral">{threat.difficulty}</Badge>
        </div>
      </div>
      {sms ? (
        <div className="mt-4 flex-1 rounded-[22px] border-4 border-ink bg-page p-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink" aria-hidden="true" />
          <p className="text-center text-micro font-semibold text-ink-3">{threat.sender}</p>
          <p className="mt-2 rounded-2xl rounded-bl-sm bg-card p-3 text-xs leading-relaxed text-ink shadow-card">
            {threat.preview}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex-1 overflow-hidden rounded-control border border-line">
          <div className="border-b border-line bg-page px-3 py-2 text-micro text-ink-2">
            <span className="font-semibold text-ink">From:</span> {threat.sender}
          </div>
          <p className="p-3 text-xs leading-relaxed text-ink">{threat.preview}</p>
        </div>
      )}
    </Card>
  );
}

function Threats() {
  return (
    <Reveal id="threats" className="scroll-mt-20 bg-page py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Kenyan threat landscape"
          title="Built for the attacks Kenyans actually get."
          body="Templates modelled on the scams hitting Kenyan inboxes and phones every day."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {THREATS.map((t) => (
            <ThreatCard key={t.name} threat={t} />
          ))}
        </div>
      </div>
    </Reveal>
  );
}

const FEATURE_ICONS = {
  email: Mail,
  sms: MessageSquare,
  score: BrainCircuit,
  training: GraduationCap,
  analytics: ChartColumn,
  privacy: LockKeyhole,
};

function Features() {
  return (
    <Reveal id="features" className="scroll-mt-20 bg-card py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading eyebrow="Features" title="Everything you need to harden the human layer." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = FEATURE_ICONS[f.key];
            return (
              <Card key={f.key} interactive>
                <span className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-card font-bold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-body leading-relaxed text-ink-2">{f.body}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </Reveal>
  );
}

function Mark({ yes }) {
  return yes ? (
    <span className="inline-flex items-center gap-1.5 font-semibold text-brand-700">
      <Check size={18} strokeWidth={2.75} aria-hidden="true" />
      <span className="sr-only">Yes</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-ink-3">
      <X size={18} strokeWidth={2.25} aria-hidden="true" />
      <span className="sr-only">No</span>
    </span>
  );
}

function WhyRedFlag() {
  return (
    <Reveal id="why" className="scroll-mt-20 bg-page py-24">
      <div className="mx-auto max-w-4xl px-5">
        <SectionHeading eyebrow="Why RedFlag" title="Made for Kenya, not adapted for it." />
        <Card padded={false} className="mt-12 overflow-hidden">
          <table className="w-full text-body">
            <caption className="sr-only">RedFlag compared with typical global platforms</caption>
            <thead>
              <tr className="border-b border-line bg-page">
                <th scope="col" className="px-5 py-3.5 text-left text-xs font-medium text-ink-3">
                  Capability
                </th>
                <th
                  scope="col"
                  className="px-5 py-3.5 text-center text-xs font-bold text-brand-800"
                >
                  RedFlag
                </th>
                <th scope="col" className="px-5 py-3.5 text-center text-xs font-medium text-ink-3">
                  Typical global platforms
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((r) => (
                <tr key={r.row} className="h-14 border-b border-line last:border-0">
                  <th scope="row" className="px-5 text-left font-medium text-ink">
                    {r.row}
                  </th>
                  <td className="bg-brand-50 px-5 text-center">
                    <Mark yes={r.redflag} />
                  </td>
                  <td className="px-5 text-center">
                    <Mark yes={r.global} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </Reveal>
  );
}

function FinalCta({ user }) {
  return (
    <Reveal className="bg-card px-5 py-20">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[20px] bg-brand-800 px-6 py-14 text-center sm:px-12">
        <div
          className="absolute -top-24 -right-24 size-72 rounded-full bg-white-10"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -left-20 size-72 rounded-full bg-white-10"
          aria-hidden="true"
        />
        <h2 className="relative mx-auto max-w-2xl text-[30px] leading-tight font-extrabold tracking-tight text-white sm:text-[38px]">
          {CTA.headline}
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-card text-white-70">{CTA.body}</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          {user ? (
            <Button
              as={Link}
              to={NAV[user.role]?.home || '/'}
              variant="white"
              size="lg"
              iconRight={ArrowRight}
            >
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button as={Link} to="/register" variant="white" size="lg">
                Sign up
              </Button>
              <Button as={Link} to="/login" variant="white-outline" size="lg">
                Log in
              </Button>
            </>
          )}
        </div>
      </div>
    </Reveal>
  );
}

function Footer() {
  return (
    <footer className="bg-sidebar text-sidebar-text">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-body leading-relaxed">{FOOTER.blurb}</p>
        </div>
        {FOOTER.columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-bold tracking-[0.12em] text-white uppercase">
              {col.title}
            </h3>
            <ul className="mt-4 grid gap-2.5">
              {col.links.map((link) => (
                <li key={link}>
                  {/* Placeholder links until these pages exist. */}
                  <a href="#top" className="text-body transition hover:text-white">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-sidebar-divider">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-5 py-5 text-xs">
          <span>{FOOTER.credit}</span>
          <span>© {new Date().getFullYear()} RedFlag. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  const { user } = useAuth();
  return (
    <div id="top" className="min-h-screen bg-card">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <LandingNav user={user} />
      <main id="content">
        <Hero user={user} />
        <ProblemStrip />
        <HowItWorks />
        <Threats />
        <Features />
        <WhyRedFlag />
        <FinalCta user={user} />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
