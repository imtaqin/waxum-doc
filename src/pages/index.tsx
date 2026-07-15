import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <img
          src="/img/logo.png"
          alt="Waxum Logo"
          style={{width: '150px', marginBottom: '1rem', borderRadius: '20px'}}
        />
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Feature({title, description, icon}: {title: string; description: string; icon?: string}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md padding-vert--lg">
        {icon && <div style={{fontSize: '2.5rem', marginBottom: '0.5rem'}}>{icon}</div>}
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <Feature
            icon="📱"
            title="Multi-Session"
            description="Manage multiple WhatsApp accounts simultaneously with separate sessions."
          />
          <Feature
            icon="🦀"
            title="Built with Rust"
            description="High performance and memory safety with the Rust programming language."
          />
          <Feature
            icon="🔌"
            title="REST API"
            description="Simple HTTP API with Swagger UI documentation for easy integration."
          />
        </div>
        <div className="row">
          <Feature
            icon="🪝"
            title="Webhooks"
            description="Receive real-time events with HMAC-SHA256 signature verification."
          />
          <Feature
            icon="🔐"
            title="JWT Auth"
            description="Secure API access with JSON Web Token authentication."
          />
          <Feature
            icon="🐳"
            title="Docker Ready"
            description="Deploy easily with Docker Compose and PostgreSQL."
          />
        </div>
        <div className="row">
          <Feature
            icon="💬"
            title="Rich Messages"
            description="Send text, images, documents, audio, video, stickers, and location messages."
          />
          <Feature
            icon="🖥️"
            title="Terminal Dashboard"
            description="Beautiful hacker-style dashboard with real-time session management."
          />
          <Feature
            icon="📲"
            title="QR & Pair Code"
            description="Connect via QR code scanning or phone number pairing."
          />
        </div>
      </div>
    </section>
  );
}

function DonationSection() {
  return (
    <section style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '4rem 0',
      color: '#fff'
    }}>
      <div className="container">
        <div className="text--center">
          <Heading as="h2" style={{color: '#00ff9d', marginBottom: '1rem'}}>
            Support This Project
          </Heading>
          <p style={{maxWidth: '600px', margin: '0 auto 2rem', color: '#a0a0a0'}}>
            If Waxum helps you, consider supporting the development to keep the project alive and growing.
          </p>

          <div className="row" style={{justifyContent: 'center', gap: '2rem'}}>
            {/* Saweria */}
            <div className="col col--4" style={{
              background: 'rgba(0, 255, 157, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid rgba(0, 255, 157, 0.3)'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>☕</div>
              <Heading as="h3" style={{color: '#fff', fontSize: '1.2rem'}}>Saweria</Heading>
              <p style={{color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '1rem'}}>
                Support via Saweria (Indonesia)
              </p>
              <a
                href="https://saweria.co/fdciabdul"
                target="_blank"
                rel="noopener noreferrer"
                className="button button--primary"
                style={{background: '#00ff9d', color: '#000', border: 'none'}}
              >
                Donate via Saweria
              </a>
            </div>

            {/* Bank Transfer */}
            <div className="col col--4" style={{
              background: 'rgba(100, 150, 255, 0.1)',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid rgba(100, 150, 255, 0.3)'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>🏦</div>
              <Heading as="h3" style={{color: '#fff', fontSize: '1.2rem'}}>Bank Transfer</Heading>
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem',
                textAlign: 'left',
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}>
                <div style={{marginBottom: '1rem'}}>
                  <div style={{color: '#6c99bb'}}>// BNI</div>
                  <div style={{color: '#00ff9d'}}>1882264360</div>
                  <div style={{color: '#a0a0a0'}}>A/N: Abdul Muttaqin</div>
                </div>
                <div>
                  <div style={{color: '#6c99bb'}}>// Bank Mandiri</div>
                  <div style={{color: '#00ff9d'}}>1330028497212</div>
                  <div style={{color: '#a0a0a0'}}>A/N: Anisa Septiani Timur</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description="WhatsApp REST API Gateway built with Rust">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <DonationSection />
      </main>
    </Layout>
  );
}
