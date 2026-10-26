<template>
  <LegalDocument
    title="Privacy Policy"
    updated="26 October 2026"
    intro="This policy explains what Toneflix Music collects about you, why, and the choices you have."
    :sections="sections"
  />
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import LegalDocument, { type LegalSection } from 'src/components/Legal/LegalDocument.vue';

const sections: LegalSection[] = [
  {
    heading: 'What we collect',
    body: ['We collect what you give us, what you create, and some information about how you use the app:'],
    list: [
      'Account details: your name, email address, phone number if you add one, password (stored encrypted), username and profile photo.',
      'Your content: tracks, stems, lyrics, artwork, projects, comments and messages.',
      'Activity: what you play, like, follow, search for and buy, so we can show your library and recommend music.',
      'Payments: what you bought or sold and your payout details. Card details are handled by our payment partners and never stored by us.',
      'Device and usage data: browser, device type, IP address, and sign-in times, which keep your account secure.',
    ],
  },
  {
    heading: 'How we use it',
    body: [],
    list: [
      'to run your account and the features you use, such as the studio, projects and messages',
      'to recommend music, artists and creators based on what you play, like and follow',
      'to process payments, tips and withdrawals',
      'to send codes, receipts and the notifications you chose',
      'to review reports, fight fraud and spam, and keep the service safe',
      'to understand how the app is used and improve it',
    ],
  },
  {
    heading: 'What other people can see',
    body: [
      'Your profile, public releases, public projects and comments can be seen by anyone. Private projects are visible only to you and the collaborators you invite. Messages are visible to the people in the conversation.',
    ],
  },
  {
    heading: 'Who we share it with',
    body: [
      'We do not sell your personal information. We share it only with:',
    ],
    list: [
      'service providers that host files, send email and text messages, or run AI tools you choose to use, acting on our instructions',
      'payment partners that process payments and payouts',
      'authorities, when the law requires it or to protect people\'s safety',
      'a buyer or successor, if Toneflix Music is sold or merged, under this same policy',
    ],
  },
  {
    heading: 'Cookies and storage on your device',
    body: [
      'We use a cookie to keep you signed in, and your browser\'s storage to remember settings and keep copies of studio audio so projects open faster. We do not use advertising cookies. You can clear these in your browser at any time, which signs you out.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'We keep your information while your account is open. When you delete content or your account, we remove it within 30 days, except records we must keep for tax, payments or legal reasons, and backups, which are overwritten on a regular cycle.',
    ],
  },
  {
    heading: 'Your choices and rights',
    body: [
      'You can update your details and notification settings in Settings. You can ask us for a copy of your information, to correct it, or to delete your account by writing to us. Depending on where you live, you may also have the right to object to some uses or to complain to a data protection authority.',
    ],
  },
  {
    heading: 'Security',
    body: [
      'We protect your information with encryption in transit, hashed passwords and access controls. No service is completely secure, so use a strong password and tell us if you notice anything unusual.',
    ],
  },
  {
    heading: 'Children',
    body: [
      'Toneflix Music is not meant for children under 13. If you think a child under 13 has given us information, contact us and we will delete it.',
    ],
  },
  {
    heading: 'Changes to this policy',
    body: [
      'We will update this page when our practices change and tell you in the app or by email about significant changes.',
    ],
  },
];

useMeta({ title: 'Privacy Policy', titleTemplate: (title) => `${title} - Toneflix Music` });
</script>
