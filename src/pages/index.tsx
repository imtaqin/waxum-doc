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
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <img
          src="/img/logo.png"
          alt="Waxum mascot"
          style={{
            width: 144,
            height: 144,
            marginBottom: '1.25rem',
          }}
        />
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/docs/getting-started">
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/api/sessions"
            style={{marginLeft: '0.75rem'}}>
            API Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

function Feature({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: string;
}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="padding-horiz--md padding-vert--lg">
        {icon && (
          <div
            style={{
              fontSize: '1.6rem',
              lineHeight: 1,
              marginBottom: '0.75rem',
              color: 'var(--ifm-color-primary)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}>
            {icon}
          </div>
        )}
        <Heading as="h3" style={{marginBottom: '0.4rem'}}>
          {title}
        </Heading>
        <p style={{opacity: 0.75}}>{description}</p>
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
            icon="//"
            title="Multi-Session"
            description="Run dozens of WhatsApp accounts side by side. Each session is isolated with its own storage."
          />
          <Feature
            icon="{ }"
            title="Built with Rust"
            description="Native Tokio runtime. Small memory footprint, low latency, no GC pauses."
          />
          <Feature
            icon="/*"
            title="REST + Swagger"
            description="Plain HTTP+JSON. OpenAPI schema and Swagger UI baked in at /swagger-ui."
          />
        </div>
        <div className="row">
          <Feature
            icon="->"
            title="Webhooks"
            description="Every event fans out to your endpoint with HMAC-SHA256 signature and circuit-breaker retries."
          />
          <Feature
            icon="[]"
            title="JWT Auth"
            description="Bearer tokens with per-session scopes. Superadmin token for provisioning."
          />
          <Feature
            icon="**"
            title="Multi-DB"
            description="PostgreSQL, MySQL, or SQLite. Docker Compose bundled with NATS JetStream fan-out."
          />
        </div>
        <div className="row">
          <Feature
            icon="<>"
            title="Rich Messages"
            description="Text, image, video, audio, document, sticker, location, polls, buttons, lists, native-flow."
          />
          <Feature
            icon="::"
            title="Live Dashboard"
            description="Bundled UI at / — session control, QR pair, connection status, event log."
          />
          <Feature
            icon="**"
            title="QR + Pair Code"
            description="Pair by scanning the QR or by phone-code — same flow as WhatsApp Web / Desktop."
          />
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout title="Home" description="WhatsApp REST API Gateway built with Rust">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
