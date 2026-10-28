import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Vibe Kit',
  description: 'End-to-end AI coding workflow toolkit: reusable rules, skills, templates, and safety-focused CLI for Google Antigravity & AI agents.',
  base: '/vibe-kit/',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/vibe-kit/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#6366f1' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Vibe Kit — AI Coding Workflow Toolkit' }],
    ['meta', { property: 'og:description', content: 'End-to-end AI coding workflow toolkit with reusable rules, skills, templates, and a safety-focused CLI.' }],
    ['meta', { property: 'og:url', content: 'https://doni354.github.io/vibe-kit/' }]
  ],

  sitemap: {
    hostname: 'https://doni354.github.io/vibe-kit/'
  },

  themeConfig: {
    logo: { src: '/logo.svg', alt: 'Vibe Kit Logo' },
    siteTitle: 'Vibe Kit',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'CLI Reference', link: '/reference/cli' },
      { text: 'Profiles & Assets', link: '/guide/profiles' },
      { text: 'Architecture & Safety', link: '/guide/workflow-architecture' },
      { text: 'FAQ', link: '/guide/troubleshooting' },
      {
        text: 'v0.1.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/doni354/vibe-kit/blob/main/CHANGELOG.md' },
          { text: 'npm Registry', link: 'https://www.npmjs.com/package/@doni354/vibe-kit' }
        ]
      }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction & Overview', link: '/index' },
          { text: 'Installation & Quick Start', link: '/guide/getting-started' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Profiles & Workflow Assets', link: '/guide/profiles' },
          { text: 'Workflow & Safety Architecture', link: '/guide/workflow-architecture' }
        ]
      },
      {
        text: 'Command Reference',
        items: [
          { text: 'CLI Commands & Options', link: '/reference/cli' }
        ]
      },
      {
        text: 'Support & Community',
        items: [
          { text: 'Troubleshooting & FAQ', link: '/guide/troubleshooting' },
          { text: 'Contributing & Releases', link: '/community/contributing' }
        ]
      }
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/doni354/vibe-kit' },
      {
        icon: {
          svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>npm</title><path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.336h-4.604v-9.67h-4.62v9.67H5.13z"/></svg>'
        },
        link: 'https://www.npmjs.com/package/@doni354/vibe-kit',
        ariaLabel: 'npm'
      }
    ],

    editLink: {
      pattern: 'https://github.com/doni354/vibe-kit/edit/main/docs/:path',
      text: 'Suggest changes to this page'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 doni354. Designed for Google Antigravity & autonomous AI coding agents.'
    }
  }
});
