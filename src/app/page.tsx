"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

const pillars = [
  { number: "01", title: "Curiosity first", copy: "Lessons are built to make questions feel like the beginning of something, never the end." },
  { number: "02", title: "Character always", copy: "We help young people grow with empathy, courage, and a quiet confidence in their own voice." },
  { number: "03", title: "A wider horizon", copy: "Academic foundations meet creative practice, collaboration, and the confidence to look outward." },
];

export default function HomePage() {
  useEffect(() => {
    const revealItems = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="welcome-page">
      <nav className="welcome-nav" aria-label="Main navigation">
        <Link href="/" className="brand-lockup" aria-label="Divine Wonders Academy home">
          <span className="brand-mark"><Image src="/dwa-logo.png" alt="" width={42} height={42} /></span>
          <span className="brand-name">Divine Wonders<br /><em>Academy</em></span>
        </Link>
        <div className="nav-links"><a href="#story">Our story</a><a href="#learning">Learning</a><a href="#contact">Contact</a></div>
        <Link href="/sign-in" className="nav-sign-in">Sign in <span aria-hidden="true">↗</span></Link>
      </nav>

      <section className="welcome-hero" aria-labelledby="welcome-title">
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="hero-copy" data-reveal>
          <p className="eyebrow"><span /> A place to become</p>
          <h1 id="welcome-title">Where wonder<br /><i>takes root.</i></h1>
          <p className="hero-intro">Divine Wonders Academy is a thoughtful, spirited school for curious minds and kind hearts.</p>
          <div className="hero-actions"><a href="#story" className="primary-action">Discover our world <span aria-hidden="true">↓</span></a><Link href="/sign-in" className="text-action">Portal sign in <span aria-hidden="true">↗</span></Link></div>
        </div>
        <div className="hero-art" data-reveal>
          <div className="art-sun" /><div className="art-arch arch-back" /><div className="art-arch arch-front"><span className="arch-window" /></div>
          <div className="art-plant plant-left"><i /><i /><i /></div><div className="art-plant plant-right"><i /><i /><i /><i /></div>
          <div className="art-caption">Grow boldly<br /><span>·</span> live brightly</div>
        </div>
        <div className="hero-scroll"><span className="scroll-line" /> Scroll to explore</div>
      </section>

      <section className="story-section" id="story">
        <div className="section-label" data-reveal><span>01</span> The DWA difference</div>
        <div className="story-content" data-reveal><h2>A school shaped<br />by <i>possibility.</i></h2><div className="story-copy"><p>At Divine Wonders Academy, education is more than what happens in a classroom. It is the steady work of helping every student notice their strengths, find their people, and imagine what comes next.</p><a href="#learning" className="circle-link" aria-label="Explore our approach">↘</a></div></div>
        <div className="story-stats" data-reveal><div><strong>01</strong><span>Guiding principle</span><b>Wonder</b></div><div><strong>∞</strong><span>Room to grow</span><b>Every day</b></div><div><strong>1</strong><span>Shared community</span><b>Many voices</b></div></div>
      </section>

      <section className="learning-section" id="learning">
        <div className="learning-heading" data-reveal><div className="section-label"><span>02</span> What guides us</div><h2>Small moments.<br /><i>Lasting impact.</i></h2></div>
        <div className="pillar-list">{pillars.map((pillar, index) => <article className="pillar" data-reveal key={pillar.number} style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}><span className="pillar-number">{pillar.number}</span><h3>{pillar.title}</h3><p>{pillar.copy}</p><span className="pillar-arrow" aria-hidden="true">↗</span></article>)}</div>
      </section>

      <section className="welcome-cta" id="contact" data-reveal><div><p className="eyebrow"><span /> Begin here</p><h2>Your next chapter<br /><i>starts with wonder.</i></h2></div><div className="cta-right"><p>Families, students, and staff can step inside the Divine Wonders community through the school portal.</p><Link href="/sign-in" className="primary-action light-action">Enter the school portal <span aria-hidden="true">↗</span></Link></div></section>

      <footer className="welcome-footer"><Link href="/" className="brand-lockup"><span className="brand-mark"><Image src="/dwa-logo.png" alt="" width={34} height={34} /></span><span className="brand-name">Divine Wonders<br /><em>Academy</em></span></Link><p>Learning with purpose. Living with wonder.</p><span>© {new Date().getFullYear()} DWA</span></footer>
    </main>
  );
}
