<template>
  <LegalDocument
    title="Terms of Service"
    updated="26 October 2026"
    intro="These terms cover your use of Toneflix Music: listening, sharing your music, and making music with other people. By creating an account or using the app, you agree to them."
    :sections="sections"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMeta } from 'quasar';
import LegalDocument, { type LegalSection } from 'src/components/Legal/LegalDocument.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';

const boot = useBootstrapStore();
const share = computed(() => Number(boot.configuration.creator_share || 85));

const sections = computed<LegalSection[]>(() => [
  {
    heading: 'Your account',
    body: [
      'You need an account to upload music, join projects, buy or sell anything, and use the studio. Give accurate details, keep your password private, and tell us if you think someone else is using your account.',
      'You must be at least 13 years old, or the minimum age to use online services where you live if that is higher. If you are under 18, a parent or guardian must agree to these terms for you.',
      'You are responsible for what happens on your account. We may ask you to confirm your email address or phone number before you use some features.',
    ],
  },
  {
    heading: 'Your music and content',
    body: [
      'You keep ownership of everything you upload or create here, including tracks, stems, lyrics, artwork, comments and messages.',
      'So we can run the service, you give Toneflix Music a worldwide, non-exclusive, royalty-free licence to host, store, copy, process, stream and display your content, and to make formats and previews of it. This licence covers what you choose to share: private projects stay visible only to you and the people you invite. It ends when you delete the content or your account, except for copies other people already bought or that we must keep by law.',
      'Only upload content you own or have permission to use. If your content includes samples, beats or vocals from someone else, you need their permission.',
    ],
  },
  {
    heading: 'Projects and collaboration',
    body: [
      'A project belongs to the person who created it. The owner decides who can join, what is released and how. When you add stems, lyrics or other work to someone else\'s project, you allow the project owner and the other collaborators to use that work inside the project and in releases made from it.',
      'Agree any splits of credit or money with your collaborators yourselves. Toneflix Music pays earnings from a release to the account that released it and does not divide them between collaborators.',
    ],
  },
  {
    heading: 'AI tools',
    body: [
      'Some studio and writing tools use AI, for example to split a song into stems, suggest lyrics or generate audio. Their output can be inaccurate or similar to existing work. Check it before you publish, and make sure your release does not infringe anyone\'s rights.',
      'AI tools use credits. Credits included in a plan or bought separately have no cash value and cannot be transferred.',
    ],
  },
  {
    heading: 'Releases, sales and tips',
    body: [
      `When you sell a release or stems, or receive a tip, you keep ${share.value}% of each payment. The rest covers payment fees and running Toneflix Music. We may change this share; the change applies to payments made after we announce it.`,
      'Earnings clear after a holding period before you can withdraw them. Withdrawals go through our payment partners and can require identity or bank details. We may hold or reverse earnings tied to fraud, chargebacks, refunds or content we take down.',
      'Releases can be reviewed before they go live. Buyers get access to what they paid for, including downloads where offered, for as long as we run the service.',
    ],
  },
  {
    heading: 'Premium plans',
    body: [
      'Premium plans add features such as downloads, higher limits and AI credits. Plans are paid in advance for the billing period you choose. Unless the law says otherwise, payments are not refundable, but you keep the plan until the end of the period you paid for.',
    ],
  },
  {
    heading: 'Rules for using Toneflix Music',
    body: ['Do not use Toneflix Music to:'],
    list: [
      'upload content that infringes copyright or other rights, or that you have no permission to share',
      'harass, threaten or impersonate others, or post hateful, sexually exploitative or violent content',
      'manipulate plays, follows, rankings or payments, or create fake accounts',
      'spread malware, scrape the service, or interfere with how it works',
      'break the law or help someone else break it',
    ],
  },
  {
    heading: 'Reports, takedowns and appeals',
    body: [
      'Anyone can report a track, release, project or profile. Moderators review reports and may remove content or limit accounts that break these terms. If something of yours is taken down, you will see the reason and can appeal once.',
      'To report copyright infringement, use the report button on the content or write to us with the work you own, where it appears on Toneflix Music, and your contact details.',
    ],
  },
  {
    heading: 'Suspension and closing your account',
    body: [
      'You can stop using Toneflix Music at any time. We may suspend or close accounts that break these terms or put other people or the service at risk. Where we can, we will tell you why and give you a chance to respond.',
    ],
  },
  {
    heading: 'The service',
    body: [
      'We work to keep Toneflix Music available and your files safe, but the service is provided as is. We do not promise it will always be available or free of errors, and you should keep your own copies of important work.',
      'To the extent the law allows, Toneflix Music is not liable for indirect or consequential losses, or for lost profits, data or opportunities. Our total liability to you is limited to the amount you paid us in the 12 months before the claim.',
    ],
  },
  {
    heading: 'Changes to these terms',
    body: [
      'We may update these terms as the service changes. When a change is significant, we will tell you in the app or by email before it takes effect. If you keep using Toneflix Music after that, the new terms apply.',
    ],
  },
]);

useMeta({ title: 'Terms of Service', titleTemplate: (title) => `${title} - Toneflix Music` });
</script>
