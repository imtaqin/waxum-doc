import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'WA-RS',
  tagline: 'WhatsApp REST API Gateway built with Rust',
  favicon: 'img/logo.png',

  future: {
    v4: true,
  },

  url: 'https://wa-rs.imtaqin.id',
  baseUrl: '/',

  organizationName: 'fdciabdul',
  projectName: 'wa-rs-doc',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/fdciabdul/wa-rs/tree/main/documentation/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'WA-RS',
      logo: {
        alt: 'WA-RS Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/docs/api/sessions',
          label: 'API',
          position: 'left',
        },
        {
          to: '/docs/api/webhooks',
          label: 'Webhooks',
          position: 'left',
        },
        {
          to: '/docs/api/health',
          label: 'Health',
          position: 'left',
        },
        {
          href: 'https://wa-rs.imtaqin.id/llms.txt',
          label: 'llms.txt',
          position: 'right',
        },
        {
          href: 'https://github.com/fdciabdul/wa-rs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/' },
            { label: 'Installation', to: '/docs/installation' },
            { label: 'Getting Started', to: '/docs/getting-started' },
            { label: 'Authentication', to: '/docs/authentication' },
            { label: 'Dashboard', to: '/docs/dashboard' },
          ],
        },
        {
          title: 'API',
          items: [
            { label: 'Sessions', to: '/docs/api/sessions' },
            { label: 'Messages', to: '/docs/api/messages' },
            { label: 'Groups', to: '/docs/api/groups' },
            { label: 'Contacts', to: '/docs/api/contacts' },
            { label: 'Media', to: '/docs/api/media' },
            { label: 'Calls', to: '/docs/api/calls' },
          ],
        },
        {
          title: 'Runtime',
          items: [
            { label: 'Webhooks', to: '/docs/api/webhooks' },
            { label: 'Health & Metrics', to: '/docs/api/health' },
            { label: 'Presence', to: '/docs/api/presence' },
            { label: 'Privacy', to: '/docs/api/privacy' },
            { label: 'NATS', to: '/docs/api/nats' },
            { label: 'Operations', to: '/docs/api/operations' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/fdciabdul/wa-rs' },
            { label: 'Docs source', href: 'https://github.com/fdciabdul/wa-rs-doc' },
            { label: 'Releases', href: 'https://github.com/fdciabdul/wa-rs/releases' },
            { label: 'Issues', href: 'https://github.com/fdciabdul/wa-rs/issues' },
            { label: 'llms.txt', href: 'https://wa-rs.imtaqin.id/llms.txt' },
            { label: 'llms-full.txt', href: 'https://wa-rs.imtaqin.id/llms-full.txt' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} WA-RS. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
