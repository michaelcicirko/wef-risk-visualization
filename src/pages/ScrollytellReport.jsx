import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { riskData, categoryColors } from '../data/risks.js';
import { natoSpending, regionColors, NATO_TARGET_PCT } from '../data/natoSpending.js';
import styles from './ScrollytellReport.module.css';

gsap.registerPlugin(ScrollTrigger);

const CATEGORIES = ['geopolitical', 'economic', 'societal', 'technological', 'environmental'];

// ── Section 1: Risk timeline bars ──────────────────────────────────────────
function RiskBarsSection({ sectionRef }) {
  const barsRef = useRef([]);
  const labelsRef = useRef([]);
  const year = 2026;
  const risks = riskData[year] || [];

  useEffect(() => {
    const bars = barsRef.current.filter(Boolean);
    const labels = labelsRef.current.filter(Boolean);
    gsap.set(bars, { scaleX: 0, transformOrigin: 'left center' });
    gsap.set(labels, { opacity: 0, x: -10 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 60%',
        end: 'center center',
        scrub: 0.8,
      },
    });

    bars.forEach((bar, i) => {
      tl.to(bar, { scaleX: 1, duration: 0.6, ease: 'power2.out' }, i * 0.08);
      tl.to(labels[i], { opacity: 1, x: 0, duration: 0.4 }, i * 0.08 + 0.1);
    });

    return () => tl.kill();
  }, [sectionRef]);

  const maxVal = 10;

  return (
    <div className={styles.chartArea}>
      <div className={styles.barChart}>
        {risks.map((r, i) => {
          const color = categoryColors[r.category] || '#5a5a8a';
          const widthPct = (r.value / maxVal) * 100;
          return (
            <div key={r.id} className={styles.barRow}>
              <span className={styles.barLabel}>{r.title.slice(0, 28)}</span>
              <div className={styles.barTrack}>
                <div
                  ref={el => barsRef.current[i] = el}
                  className={styles.bar}
                  style={{ width: `${widthPct}%`, background: color }}
                />
              </div>
              <span
                ref={el => labelsRef.current[i] = el}
                className={styles.barValue}
                style={{ color }}
              >#{r.rank}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section 2: Category totals ──────────────────────────────────────────────
function CategorySection({ sectionRef }) {
  const circleRefs = useRef([]);
  const textRefs = useRef([]);

  const catData = CATEGORIES.map(cat => {
    const score2026 = (riskData[2026] || []).filter(r => r.category === cat).reduce((s, r) => s + r.value, 0);
    const score2036 = (riskData[2036] || []).filter(r => r.category === cat).reduce((s, r) => s + r.value, 0);
    return { cat, score2026, score2036 };
  });

  useEffect(() => {
    const circles = circleRefs.current.filter(Boolean);
    const texts = textRefs.current.filter(Boolean);
    gsap.set(circles, { scale: 0, opacity: 0, transformOrigin: 'center center' });
    gsap.set(texts, { opacity: 0, y: 10 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 70%',
        end: 'center center',
        scrub: 0.8,
      },
    });

    circles.forEach((c, i) => {
      tl.to(c, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }, i * 0.12);
      tl.to(texts[i], { opacity: 1, y: 0, duration: 0.3 }, i * 0.12 + 0.2);
    });

    return () => tl.kill();
  }, [sectionRef]);

  const maxScore = Math.max(...catData.map(d => d.score2036));

  return (
    <div className={styles.chartArea}>
      <div className={styles.bubbleRow}>
        {catData.map(({ cat, score2026, score2036 }, i) => {
          const color = categoryColors[cat];
          const size = 60 + (score2036 / maxScore) * 80;
          const delta = score2036 - score2026;
          return (
            <div key={cat} className={styles.bubbleCol}>
              <div
                ref={el => circleRefs.current[i] = el}
                className={styles.bubble}
                style={{
                  width: size,
                  height: size,
                  background: color,
                  boxShadow: `0 0 ${size * 0.3}px ${color}55`,
                }}
              >
                <span className={styles.bubbleScore}>{score2036}</span>
              </div>
              <span
                ref={el => textRefs.current[i] = el}
                className={styles.bubbleCat}
                style={{ color }}
              >{cat}</span>
              <span className={styles.bubbleDelta} style={{ color: delta > 0 ? '#ff6b6b' : '#00ff88' }}>
                {delta > 0 ? `+${delta}` : delta} by 2036
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section 3: NATO target progress ─────────────────────────────────────────
function NATOSection({ sectionRef }) {
  const barRefs = useRef([]);
  const dotRefs = useRef([]);

  const sorted = [...natoSpending]
    .sort((a, b) => (b[2023]?.gdpPct || 0) - (a[2023]?.gdpPct || 0))
    .slice(0, 16);

  useEffect(() => {
    const bars = barRefs.current.filter(Boolean);
    const dots = dotRefs.current.filter(Boolean);
    gsap.set(bars, { scaleX: 0, transformOrigin: 'left center' });
    gsap.set(dots, { scale: 0, opacity: 0, transformOrigin: 'center center' });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 70%',
        end: 'center center',
        scrub: 0.8,
      },
    });

    bars.forEach((bar, i) => {
      tl.to(bar, { scaleX: 1, duration: 0.5, ease: 'power2.out' }, i * 0.06);
    });
    dots.forEach((dot, i) => {
      tl.to(dot, { scale: 1, opacity: 1, duration: 0.3 }, i * 0.06 + 0.2);
    });

    return () => tl.kill();
  }, [sectionRef]);

  const maxPct = 4.2;

  return (
    <div className={styles.chartArea}>
      <div className={styles.natoGrid}>
        {sorted.map(({ id, flag, country, region, [2023]: d }, i) => {
          const pct = d?.gdpPct || 0;
          const color = regionColors[region] || '#5a5a8a';
          const meetsTarget = pct >= NATO_TARGET_PCT;
          return (
            <div key={id} className={styles.natoRow}>
              <span className={styles.natoFlag}>{flag}</span>
              <div className={styles.natoTrack}>
                <div
                  ref={el => barRefs.current[i] = el}
                  className={styles.natoBar}
                  style={{ width: `${(pct / maxPct) * 100}%`, background: color }}
                />
                {/* 2% target marker */}
                <div
                  className={styles.natoTargetMark}
                  style={{ left: `${(NATO_TARGET_PCT / maxPct) * 100}%` }}
                />
              </div>
              <span
                ref={el => dotRefs.current[i] = el}
                className={styles.natoVal}
                style={{ color: meetsTarget ? '#00ff88' : '#ff6b6b' }}
              >{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
      <div className={styles.natoLegend}>
        <span className={styles.targetLine} />
        <span className={styles.targetLabel}>2% NATO target</span>
        <span style={{ color: '#00ff88', fontSize: 12 }}>✓ Meets target</span>
        <span style={{ color: '#ff6b6b', fontSize: 12 }}>✗ Below target</span>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ScrollytellReport() {
  const heroRef      = useRef();
  const sect1Ref     = useRef();
  const sect2Ref     = useRef();
  const sect3Ref     = useRef();
  const progressRef  = useRef();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progress bar
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: self => setProgress(self.progress * 100),
    });

    // Hero fade
    gsap.fromTo(heroRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.2 }
    );

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, []);

  return (
    <div className={styles.page}>
      {/* Reading progress bar */}
      <div className={styles.progressBar} style={{ width: `${progress}%` }} />

      <nav className={styles.nav}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero} ref={heroRef}>
        <div className={styles.heroTag}>WEF Global Risks Report 2025</div>
        <h1 className={styles.heroTitle}>The World's<br />Greatest Risks</h1>
        <p className={styles.heroSub}>
          A scroll-driven visual narrative exploring the top WEF global risks,
          how they shift over a 10-year horizon, and how NATO nations are
          responding through defence investment.
        </p>
        <div className={styles.scrollHint}>
          <span className={styles.scrollArrow}>↓</span>
          <span>Scroll to explore</span>
        </div>
      </section>

      {/* ── SECTION 1: Top risks 2026 ── */}
      <section className={styles.section} ref={sect1Ref}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionText}>
            <span className={styles.sectionEyebrow}>2026 Outlook</span>
            <h2 className={styles.sectionTitle}>Geopolitics Dominates<br />the Near Term</h2>
            <p className={styles.sectionBody}>
              In 2026, geoeconomic confrontation and state-based armed conflict sit at the apex
              of global risk — driven by ongoing conflicts, sanctions regimes, and fractured
              multilateralism. Extreme weather is already the third-highest risk, signalling
              that environmental concerns are no longer a "long-term" problem.
            </p>
          </div>
          <RiskBarsSection sectionRef={sect1Ref} />
        </div>
      </section>

      {/* ── SECTION 2: 2036 shift ── */}
      <section className={`${styles.section} ${styles.sectionAlt}`} ref={sect2Ref}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionText}>
            <span className={styles.sectionEyebrow}>10-Year Horizon</span>
            <h2 className={styles.sectionTitle}>By 2036, the Climate<br />Becomes Paramount</h2>
            <p className={styles.sectionBody}>
              Looking a decade out, the environmental category surges dramatically. Three of
              the top four risks are environmental. Geopolitical risks recede as a relative
              share, while technological risks — driven by AI and cyber — grow steadily.
              The bubble size shows projected 2036 severity versus today.
            </p>
          </div>
          <CategorySection sectionRef={sect2Ref} />
        </div>
      </section>

      {/* ── SECTION 3: NATO response ── */}
      <section className={styles.section} ref={sect3Ref}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionText}>
            <span className={styles.sectionEyebrow}>NATO Response</span>
            <h2 className={styles.sectionTitle}>Defence Spending:<br />Who's Pulling Their Weight?</h2>
            <p className={styles.sectionBody}>
              As geopolitical risk dominates the near-term outlook, NATO members face mounting
              pressure to meet the 2% GDP defence spending target. In 2023, only a minority
              of members reached the threshold — though the number has grown sharply
              since Russia's full-scale invasion of Ukraine.
            </p>
          </div>
          <NATOSection sectionRef={sect3Ref} />
        </div>
      </section>

      {/* ── CLOSING ── */}
      <section className={styles.closing}>
        <h2 className={styles.closingTitle}>The Polycrisis Is Here</h2>
        <p className={styles.closingBody}>
          Geopolitical fracture, accelerating climate disruption, and the unmanaged rise of
          AI are converging simultaneously — a "polycrisis" where each shock amplifies the
          others. The data tells a clear story: the window to act is narrowing.
        </p>
        <div className={styles.closingLinks}>
          <Link to="/force-graph-3d" className={styles.closingLink}>Explore Risk Network →</Link>
          <Link to="/risk-bubbles-3d" className={styles.closingLink}>See 3D Risk Bubbles →</Link>
          <Link to="/" className={styles.closingLink}>Back to Dashboard →</Link>
        </div>
      </section>
    </div>
  );
}
