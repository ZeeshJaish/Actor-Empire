/**
 * The Platform room's PRODUCT tab as a showcase (#126; plan §19.13). Zeesh, 2026-11-02: "जो पुराने जितने प्रोडक्ट्स थे
 * 11 प्रोडक्ट, उसमें और जो लगता है कि हमें फ्यूचर में ऐड करने चाहिए टोटल 15-20 … कमिंग ऑन द वे … प्रोडक्ट पेज में लिस्ट
 * कर देना चाहिए", each card "जैसे कैसे यूट्यूब वीडियो का थंबनेल दिखता है … एक प्रीव्यू चला है छोटा छोटा"; then "सिनेमा …
 * इसको हटाना" and "नॉर्थ स्टार प्लस का ज़रूरत नहीं … न्यूज़ है तो न्यूज़ … वर्ल्ड है तो वर्ल्ड".
 *
 * Every product here is coming in a future update: nothing is bought or built, and the economy is unchanged. The
 * products a save launched in the old Product Lab keep running (services/streamingProductSuite.ts) and show above
 * the showcase. Names are the product's own, never the service's brand.
 */

export type ProductShowcaseSection = 'WATCH' | 'EARN' | 'REACH';

export type ProductShowcaseId =
  | 'KIDS' | 'LIVE' | 'GAMES' | 'INTERACTIVE' | 'SHORTS' | 'PODCASTS' | 'MUSIC'
  | 'FAN_CLUB' | 'PREMIERES' | 'MERCH' | 'FESTIVAL' | 'TOURS' | 'WORLD'
  | 'STICK' | 'TELCO' | 'NEWS' | 'CREATORS' | 'AWARDS' | 'VR';

export interface ProductShowcaseItem {
  id: ProductShowcaseId;
  section: ProductShowcaseSection;
  name: string;
  /** the one line under the name, as a video's channel line */
  line: string;
  /** the sheet's opening sentence */
  about: string;
  /** what it will do, three short lines */
  will: [string, string, string];
  accent: string;
  /** a far-off idea, marked ✦ as Tech marks its futuristic steps */
  futuristic?: boolean;
}

export const PRODUCT_SHOWCASE_SECTIONS: ReadonlyArray<{ id: ProductShowcaseSection; name: string; line: string }> = [
  { id: 'WATCH', name: 'Watch more', line: 'New ways to watch and play' },
  { id: 'EARN', name: 'Earn more', line: 'Fans, events and things to buy' },
  { id: 'REACH', name: 'Reach more', line: 'New homes, new screens' },
];

/* Accents keep a section's neighbours apart and stay off the status colours' exact hues; every card also carries
   its name and icon, so no product is told apart by colour alone. */
export const PRODUCT_SHOWCASE: ReadonlyArray<ProductShowcaseItem> = [
  {
    id: 'LIVE', section: 'WATCH', name: 'Live & Sports', line: 'Matches, concerts and big nights, live', accent: '#f43f5e',
    about: 'Big matches, concerts and award nights, streamed live on your service.',
    will: ['Buy the rights to sports around the world: cricket, football, racing and more', 'Match nights bring a rush of viewers, and of load on your servers', 'A Live row and a countdown in your app'],
  },
  {
    id: 'KIDS', section: 'WATCH', name: 'Kids', line: 'A safe, bright app just for kids', accent: '#fbbf24',
    about: 'An app of its own for children, with only the shows made for them.',
    will: ['Kids profiles open their own bright, safe home', 'Parents choose what and how long their kids watch', 'Families stay subscribed for longer'],
  },
  {
    id: 'GAMES', section: 'WATCH', name: 'Games', line: 'Play inside the worlds of your shows', accent: '#a78bfa',
    about: 'Games set in the worlds of your Originals, on every screen your app runs on.',
    will: ['Each hit Original can have its own game', 'Play on phones, TVs and consoles', 'Players watch more, and stay longer'],
  },
  {
    id: 'INTERACTIVE', section: 'WATCH', name: 'Interactive', line: 'Viewers choose what happens next', accent: '#22d3ee',
    about: 'Specials that stop at a choice and let the viewer decide the story.',
    will: ['Every choice opens a different way through', 'Viewers come back to try the other ending', 'The deepest way to keep viewers hooked'],
  },
  {
    id: 'SHORTS', section: 'WATCH', name: 'Shorts', line: 'Quick vertical clips from your shows', accent: '#e879f9',
    about: 'A swipe feed of short clips cut from everything on your service.',
    will: ['Short clips from every show, one swipe at a time', 'Draws younger viewers in', 'A clip leads straight to the full episode'],
  },
  {
    id: 'PODCASTS', section: 'WATCH', name: 'Podcasts', line: 'The stories behind your hits', accent: '#fb923c',
    about: 'Hosts, cast and crew talk about your shows, episode by episode.',
    will: ['A podcast for every big show', 'New episodes each week a show is on', 'Keeps fans talking between seasons'],
  },
  {
    id: 'MUSIC', section: 'WATCH', name: 'Music', line: 'Soundtracks and songs from your shows', accent: '#34d399',
    about: 'Every soundtrack on your service, ready to play like a music app.',
    will: ['Every show\'s soundtrack in one place', 'A hit show\'s song can top the charts', 'Fans listen even when they are not watching'],
  },
  {
    id: 'FAN_CLUB', section: 'EARN', name: 'Fan Club', line: 'Members get extras and early news', accent: '#f472b6',
    about: 'A membership for your biggest fans, with things nobody else gets.',
    will: ['Behind-the-scenes extras for members', 'First looks and early news', 'Members pay a little every month'],
  },
  {
    id: 'PREMIERES', section: 'EARN', name: 'Premieres', line: 'Pay once to watch a new hit first', accent: '#ef4444',
    about: 'Your biggest new films and shows, a week early, for one price.',
    will: ['Fans pay once to watch on opening night', 'Big openings earn on day one', 'Everyone else watches a week later'],
  },
  {
    id: 'MERCH', section: 'EARN', name: 'Merch Shop', line: 'Tees, posters and toys of your hits', accent: '#facc15',
    about: 'A shop full of things from your Originals.',
    will: ['Tees, posters, mugs and toys', 'Every new hit adds new merch', 'Collector drops sell out fast'],
  },
  {
    id: 'FESTIVAL', section: 'EARN', name: 'Fan Festival', line: 'A yearly fan event with stars and reveals', accent: '#818cf8',
    about: 'A yearly festival where your stars meet fans and show what is coming.',
    will: ['Your stars on stage, in front of the fans', 'Trailers and first looks revealed live', 'The whole world talks about it'],
  },
  {
    id: 'TOURS', section: 'EARN', name: 'Studio Tours', line: 'Fans walk through your sets', accent: '#38bdf8',
    about: 'Guided tours of the sets where your shows are made.',
    will: ['Fans walk through real sets', 'A new set opens with every big hit', 'Tickets sell all year round'],
  },
  {
    id: 'WORLD', section: 'EARN', name: 'World', line: 'A theme park built from your shows', accent: '#2dd4bf', futuristic: true,
    about: 'A theme park with a land for each of your biggest Originals.',
    will: ['A land for each hit: rides, shops and characters', 'Parades and fireworks every night', 'A trip fans remember for life'],
  },
  {
    id: 'STICK', section: 'REACH', name: 'Stick', line: 'Plug it in and any TV is a smart TV', accent: '#60a5fa',
    about: 'A small stick that plugs into any TV and opens your app first.',
    will: ['Turns any TV into a smart TV', 'Homes without a smart TV can watch', 'Your app is the first thing they see'],
  },
  {
    id: 'TELCO', section: 'REACH', name: 'Telco Bundles', line: 'Your service with phone plans', accent: '#4ade80',
    about: 'Phone companies include your service in their plans.',
    will: ['Comes free with a phone plan', 'Millions sign up through their phone company', 'The phone company keeps a share'],
  },
  {
    id: 'NEWS', section: 'REACH', name: 'News', line: 'A news channel, live all day', accent: '#f87171',
    about: 'A news channel on your service, live around the clock.',
    will: ['Breaking stories as they happen', 'A reason to open your app every morning', 'Brings in viewers who come only for the news'],
  },
  {
    id: 'CREATORS', section: 'REACH', name: 'Creators', line: 'Creators upload and grow with you', accent: '#f59e0b',
    about: 'Video creators post on your service and build their audience there.',
    will: ['Creators upload their own videos', 'The best get their own shows', 'Fresh videos every day, at little cost'],
  },
  {
    id: 'AWARDS', section: 'REACH', name: 'Awards', line: 'Your own awards night, live', accent: '#eab308',
    about: 'An awards night of your own, broadcast live to the world.',
    will: ['Stars, speeches and big wins on stage', 'Millions watch it live', 'The winners put your name in the news'],
  },
  {
    id: 'VR', section: 'REACH', name: 'VR Cinema', line: 'A private cinema inside a headset', accent: '#c084fc', futuristic: true,
    about: 'Watch in a cinema of your own, wherever you are, with a headset on.',
    will: ['A giant screen in a headset', 'Front-row seats at premieres, from home', 'Where watching goes next'],
  },
];

export const productShowcaseSectionOf = (id: ProductShowcaseSection) => PRODUCT_SHOWCASE_SECTIONS.find(section => section.id === id)!;
