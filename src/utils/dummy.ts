import { Album, Artist, Genre, Project, Track, UserComment } from './models';
import { ref, toRaw } from 'vue';

const description: string = `Lorem ipsum dolor sit amet consectetur adipisicing elit. Dicta
similique nisi mollitia iste natus. Ratione illo ex tenetur est
dolor. Quia at expedita iure eos vel asperiores nulla nihil ipsum.`;

const description2: string = `Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam
nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam
erat, sed diam voluptua.`;

const streamUrl = '/soothing-piano.mp3'
const streamUrl2 = '/since_04.mp3'

export const dummyProjects: Project[] = [
  {

    id: 1,
    slug: 'gaurdian',
    title: 'Gaurdian',
    props: 290,
    group: 'recent-projects',
    proped: false,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00015',
    description,
    collaborator_count: 18,
  },
  {
    id: 2,
    slug: 'organ-jazz',
    title: 'Organ Jazz',
    props: 200,
    group: 'recent-projects',
    proped: true,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00019',
    description,
    collaborator_count: 12,
  },
  {
    id: 3,
    slug: 'bounce-to-this',
    title: 'Bounce To This',
    props: 910,
    group: 'recent-projects',
    proped: false,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00020',
    description,
    collaborator_count: 9,
  },
  {
    id: 3,
    slug: 'believe',
    title: 'Believe',
    props: 1910,
    group: 'open-projects',
    proped: true,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00021',
    description,
    collaborator_count: 2,
  },
  {
    id: 3,
    slug: 'beyond-the-block',
    title: 'Beyond The Block',
    props: 310,
    group: 'open-projects',
    proped: false,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00022',
    description,
    collaborator_count: 5,
  },
  {
    id: 3,
    slug: 'cosmic-suffer',
    title: 'Cosmic Suffer',
    props: 720,
    group: 'open-projects',
    proped: true,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00024',
    description,
    collaborator_count: 12,
  },
]

export const trackList = ref<Track[]>([
  {
    id: 1,
    slug: 'wolven-hearts',
    title: 'Wolven Hearts',
    loved: false,
    streams: 833355,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00014',
    duration: 3.6,
    streamUrl: streamUrl,
    description,
    artist: {
      id: 1,
      name: 'Lecrae',
      about: description2,
      username: 'lecrae',
      imageUrl: 'https://lorem.toneflix.com.ng/images/image/00017',
      verified: false,
      followers: 1000,
      following: 974,
      youFollow: false,
      followsYou: false,
      reputation: 6310,
      projects_count: 108,
    },
  },
  {
    id: 2,
    slug: 'rice-again',
    title: 'Rice Again',
    loved: false,
    streams: 533355,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00040',
    duration: 5,
    streamUrl: streamUrl2,
    description,
    artist: {
      id: 2,
      name: 'Eddie',
      about: description2,
      username: 'eddie',
      imageUrl: 'https://lorem.toneflix.com.ng/images/image/00025',
      verified: false,
      followers: 1000,
      following: 974,
      youFollow: true,
      followsYou: false,
      reputation: 239,
      projects_count: 17,
    },
  },
  {
    id: 3,
    slug: 'speak-now',
    title: 'Speak Now',
    loved: false,
    streams: 335455,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00041',
    duration: 4,
    streamUrl: streamUrl,
    description,
    artist: {
      id: 3,
      name: 'Tailor Swift',
      about: description2,
      username: 'tailor_swift',
      imageUrl: 'https://lorem.toneflix.com.ng/images/image/00026',
      verified: true,
      followers: 1000,
      following: 974,
      youFollow: true,
      followsYou: false,
      reputation: 912,
      projects_count: 33,
    },
  },
  {
    id: 4,
    slug: 'stronger',
    title: 'Stronger',
    loved: false,
    streams: 3093355,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00042',
    duration: 6,
    streamUrl: streamUrl2,
    description,
    artist: {
      id: 4,
      name: 'Kelly Klarkson',
      about: description2,
      username: 'kelly_klarkson',
      imageUrl: 'https://lorem.toneflix.com.ng/images/image/00028',
      verified: false,
      followers: 1000,
      following: 974,
      youFollow: true,
      followsYou: false,
      reputation: 100,
      projects_count: 98,
    },
  },
  {
    id: 5,
    slug: 'yellow-submarine',
    title: 'Yellow Submarine',
    loved: false,
    streams: 392355,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00047',
    duration: 12,
    streamUrl: streamUrl,
    description,
    artist: {
      id: 5,
      name: 'The Beatles',
      about: description2,
      username: 'the_beatles',
      imageUrl: 'https://lorem.toneflix.com.ng/images/image/00030',
      verified: true,
      followers: 1000,
      following: 974,
      youFollow: false,
      followsYou: false,
      reputation: 763,
      projects_count: 15,
    },
  },
  {
    id: 6,
    slug: 'adhd',
    title: 'ADHD',
    loved: false,
    streams: 1213355,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00049',
    duration: 8,
    streamUrl: streamUrl2,
    description,
    artist: {
      id: 6,
      name: 'Joyner Lucas',
      about: description2,
      username: 'joyner_lucas',
      imageUrl: 'https://lorem.toneflix.com.ng/images/image/00033',
      verified: false,
      followers: 1000,
      following: 974,
      youFollow: true,
      followsYou: false,
      reputation: 320,
      projects_count: 32,
    },
  },
  {
    id: 7,
    slug: 'orion',
    title: 'Orion',
    loved: false,
    streams: 99355,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00037',
    duration: 9,
    streamUrl: streamUrl,
    description,
    artist: {
      id: 7,
      name: 'Volta Music',
      about: description2,
      username: 'volta_music',
      imageUrl: 'https://lorem.toneflix.com.ng/images/image/00044',
      verified: true,
      followers: 1000,
      following: 974,
      youFollow: false,
      followsYou: false,
      reputation: 450,
      projects_count: 50,
    },
  },
  {
    id: 8,
    slug: 'the-miracle',
    title: 'The Miracle',
    loved: false,
    streams: 13355,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00038',
    duration: 3,
    streamUrl: streamUrl2,
    description,
    artist: {
      id: 8,
      name: 'Queen',
      about: description2,
      username: 'queen',
      imageUrl: 'https://lorem.toneflix.com.ng/images/image/00039',
      verified: false,
      followers: 1000,
      following: 974,
      youFollow: true,
      followsYou: false,
      reputation: 500,
      projects_count: 50,
    },
  },
  {
    id: 9,
    slug: 'no-melody',
    title: 'No Melody',
    loved: false,
    streams: 3355,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00045',
    duration: 5,
    streamUrl: streamUrl,
    description,
    artist: {
      id: 9,
      name: 'Jack',
      about: description2,
      username: 'jack',
      imageUrl: 'https://lorem.toneflix.com.ng/images/image/00043',
      verified: false,
      followers: 1000,
      following: 974,
      youFollow: false,
      followsYou: false,
      reputation: 3120,
      projects_count: 50,
    },
  },
]);


export const artistList = ref<Artist[]>(toRaw(trackList.value)
  .map(e => e.artist as Artist)
  .filter((artist, i, artists) => artists.indexOf(artist) === i))



export const albumLists: Album[] = [
  {

    id: 1,
    slug: 'gaurdian',
    title: 'Gaurdian',
    loved: true,
    artist: artistList.value[0],
    streams: 3355,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00015',
    duration: 55,
    description,
    tracks_count: 5,
  },
  {
    id: 2,
    slug: 'organ-jazz',
    title: 'Organ Jazz',
    loved: false,
    artist: artistList.value[1],
    streams: 33155,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00019',
    duration: 43,
    description,
    tracks_count: 6,
  },
  {
    id: 3,
    slug: 'bounce-to-this',
    title: 'Bounce To This',
    loved: true,
    artist: artistList.value[2],
    streams: 9355,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00020',
    duration: 61,
    description,
    tracks_count: 9,
  },
  {
    id: 3,
    slug: 'believe',
    title: 'Believe',
    loved: false,
    artist: artistList.value[3],
    streams: 33553,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00021',
    duration: 32,
    description,
    tracks_count: 12,
  },
  {
    id: 4,
    slug: 'beyond-the-block',
    title: 'Beyond The Block',
    loved: true,
    artist: artistList.value[4],
    streams: 53355,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00022',
    duration: 23,
    description,
    tracks_count: 8,
  },
  {
    id: 5,
    slug: 'cosmic-suffer',
    title: 'Cosmic Suffer',
    loved: false,
    artist: artistList.value[5],
    streams: 39355,
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00024',
    duration: 15,
    description,
    tracks_count: 4,
  },
]

export const userComments = ref<UserComment[]>([
  {
    id: 1,
    text: description,
    user: artistList.value[1],
    replies: [],
    expanded: false,
    createdAt: new Date().toUTCString(),
    replies_count: 0,
  },
  {
    id: 1,
    text: description2,
    user: artistList.value[2],
    replies: [
      {
        id: 1,
        text: description2,
        user: artistList.value[3],
        createdAt: new Date().toUTCString(),
      },
      {
        id: 1,
        text: description,
        user: artistList.value[4],
        createdAt: new Date().toUTCString(),
      },
    ],
    expanded: false,
    createdAt: new Date().toUTCString(),
    replies_count: 2,
  },
  {
    id: 1,
    text: description,
    user: artistList.value[5],
    replies: [
      {
        id: 1,
        text: description2,
        user: artistList.value[6],
        createdAt: new Date().toUTCString(),
      },
      {
        id: 1,
        text: description,
        user: artistList.value[7],
        createdAt: new Date().toUTCString(),
      },
    ],
    expanded: false,
    createdAt: new Date().toUTCString(),
    replies_count: 5,
  },
])

export const genres: Genre[] = [
  {
    id: 1,
    slug: 'pop',
    title: 'Pop',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00015'
  },
  {
    id: 2,
    slug: 'rock',
    title: 'Rock',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00016'
  },
  {
    id: 3,
    slug: 'hip-hop',
    title: 'Hip Hop',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00017'
  },
  {
    id: 4,
    slug: 'jazz',
    title: 'Jazz',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00018'
  },
  {
    id: 5,
    slug: 'country',
    title: 'Country',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00019'
  },
  {
    id: 6,
    slug: 'blues',
    title: 'Blues',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00020'
  },
  {
    id: 7,
    slug: 'reggae',
    title: 'Reggae',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00021'
  },
  {
    id: 8,
    slug: 'electronic',
    title: 'Electronic',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00022'
  },
  {
    id: 9,
    slug: 'classical',
    title: 'Classical',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00023'
  },
  {
    id: 10,
    slug: 'metal',
    title: 'Metal',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00024'
  },
  {
    id: 11,
    slug: 'folk',
    title: 'Folk',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00025'
  },
  {
    id: 12,
    slug: 'indie',
    title: 'Indie',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00026'
  },
  {
    id: 13,
    slug: 'r&b',
    title: 'R&B',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00027'
  },
  {
    id: 14,
    slug: 'punk',
    title: 'Punk',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00028'
  },
  {
    id: 15,
    slug: 'soul',
    title: 'Soul',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00029'
  },
  {
    id: 16,
    slug: 'dance',
    title: 'Dance',
    imageUrl: 'https://lorem.toneflix.com.ng/images/image/00030'
  }
];
