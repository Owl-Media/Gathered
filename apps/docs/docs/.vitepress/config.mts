import { defineConfig } from "vitepress";

const sidebar = [
  { text: "Home", link: "/" },
  {
    text: "Getting Started",
    link: "/getting-started/index",
    items: [
      { text: "Create Your Account", link: "/getting-started/create-your-account" },
      { text: "Create Your First Event", link: "/getting-started/create-your-first-event" },
      { text: "Your Dashboard", link: "/getting-started/dashboard" },
    ],
  },
  {
    text: "Managing an Event",
    link: "/events/index",
    items: [
      { text: "Details", link: "/events/details" },
      { text: "Images", link: "/events/images" },
      { text: "Menu", link: "/events/menu" },
      { text: "Guests", link: "/events/guests" },
      { text: "Responses", link: "/events/responses" },
      { text: "Exports", link: "/events/exports" },
    ],
  },
  {
    text: "Invitations",
    link: "/invitations/index",
    items: [
      { text: "The Public Event Page", link: "/invitations/public-event-page" },
      { text: "Private Guest Links", link: "/invitations/private-links" },
      { text: "Invitation Emails", link: "/invitations/emails" },
      { text: "Preview the Guest Journey", link: "/invitations/preview" },
    ],
  },
  {
    text: "The Guest Experience",
    link: "/guests/index",
    items: [
      { text: "Replying to an Invitation", link: "/guests/replying" },
      { text: "Changing a Reply", link: "/guests/changing-a-reply" },
      { text: "After the Deadline", link: "/guests/deadline" },
    ],
  },
  {
    text: "Contributions",
    link: "/contributions/index",
  },
  {
    text: "Privacy",
    link: "/privacy/index",
  },
  {
    text: "Your Account",
    link: "/account/index",
  },
  {
    text: "Admin",
    link: "/admin/index",
    items: [
      { text: "Events", link: "/admin/events" },
      { text: "Audit Log", link: "/admin/audit-log" },
      { text: "System", link: "/admin/system" },
    ],
  },
];

export default defineConfig({
  title: "Gathered",
  description: "Knowledge base for Gathered, the private RSVP platform for small events",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    // The application's own theme colour (cream-100), so the browser chrome
    // matches on mobile.
    ["meta", { name: "theme-color", content: "#fdf8f5" }],
    [
      "script",
      {
        defer: "",
        src: "https://stats.codenameowl.com/script.js",
        // TODO: replace with the Umami website ID created for the Gathered docs site.
        "data-website-id": "REPLACE_WITH_GATHERED_DOCS_WEBSITE_ID",
      },
    ],
  ],
  themeConfig: {
    search: {
      provider: "local",
    },
    nav: [
      { text: "Getting Started", link: "/getting-started/index" },
      { text: "Managing an Event", link: "/events/index" },
      { text: "The Guest Experience", link: "/guests/index" },
      { text: "Privacy", link: "/privacy/index" },
      { text: "Admin", link: "/admin/index" },
    ],
    sidebar: {
      "/": sidebar,
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/owl-media/gathered" },
    ],
  },
});
