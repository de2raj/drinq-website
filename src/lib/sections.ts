import type { Section } from "./types";

/** DRINQ's menu: the source categories grouped into sections. Every section and sub is its own page. */
export const SECTIONS: Section[] = [
  {
    name: "Whisky", slug: "whisky", cats: ["Whisky"],
    blurb: "Single malts, blends and world whiskies, from everyday pours to collector bottles.",
    subs: [
      { name: "Single Malt", slug: "single-malt", cats: ["Single Malt"] },
      { name: "Blended", slug: "blended", cats: ["Blended Whisky"] },
      { name: "Bourbon", slug: "bourbon", cats: ["Bourbon"] },
      { name: "Japanese", slug: "japanese", cats: ["Japanese Whisky"] },
      { name: "Indian", slug: "indian", cats: ["Indian Whisky"] },
    ],
  },
  {
    name: "Spirits", slug: "spirits", cats: ["Gin", "Vodka", "Rum", "Tequila & Mezcal", "Brandy & Cognac", "Liqueur"],
    blurb: "Gin, vodka, rum, tequila, cognac and liqueurs for every bar cart.",
    subs: [
      { name: "Gin", slug: "gin", cats: ["Gin"] },
      { name: "Vodka", slug: "vodka", cats: ["Vodka"] },
      { name: "Rum", slug: "rum", cats: ["Rum"] },
      { name: "Tequila & Mezcal", slug: "tequila-mezcal", cats: ["Tequila & Mezcal"] },
      { name: "Cognac & Brandy", slug: "cognac-brandy", cats: ["Brandy & Cognac"] },
      { name: "Liqueur", slug: "liqueur", cats: ["Liqueur"] },
    ],
  },
  {
    name: "Wine & Champagne", slug: "wine", cats: ["WINES & CHAMPAGNE", "Red Wine", "White Wine", "Rose Wine", "Champagne", "Sparkling Wine", "Prosecco"],
    blurb: "Reds, whites, rosé and bubbles for dinners and celebrations.",
    subs: [
      { name: "Red", slug: "red", cats: ["Red Wine"] },
      { name: "White", slug: "white", cats: ["White Wine"] },
      { name: "Rosé", slug: "rose", cats: ["Rose Wine"] },
      { name: "Champagne", slug: "champagne", cats: ["Champagne"] },
      { name: "Sparkling & Prosecco", slug: "sparkling", cats: ["Sparkling Wine", "Prosecco"] },
    ],
  },
  {
    name: "Beer, Soju & RTD", slug: "beer", cats: ["Beers", "Soju & Sake", "Ready To Drink"],
    blurb: "Cold cases of beer, soju, sake and ready-to-drink cocktails.",
    subs: [
      { name: "Beer", slug: "beer", cats: ["Beers"] },
      { name: "Soju & Sake", slug: "soju-sake", cats: ["Soju & Sake"] },
      { name: "Ready To Drink", slug: "ready-to-drink", cats: ["Ready To Drink"] },
    ],
  },
  {
    name: "Mixers & Syrups", slug: "mixers", cats: ["Syrup", "MIXERS & BEVERAGES", "Aperitif, Vermouth & Bitters", "Alcohol Free"],
    blurb: "Syrups, tonics, juices, vermouth and bitters for cocktails at home or behind the bar.",
    subs: [
      { name: "Syrups", slug: "syrups", cats: ["Syrup"] },
      { name: "Mixers & Soft Drinks", slug: "soft-drinks", cats: ["MIXERS & BEVERAGES"] },
      { name: "Vermouth & Bitters", slug: "vermouth-bitters", cats: ["Aperitif, Vermouth & Bitters"] },
      { name: "Alcohol Free", slug: "alcohol-free", cats: ["Alcohol Free"] },
    ],
  },
  {
    name: "Party & Snacks", slug: "party", cats: ["Snacks, Ice & Miscellaneous", "Snacks", "Party Essentials", "Miscellaneous"],
    blurb: "Ice, snacks and party essentials to go with your order.",
    subs: [
      { name: "Snacks", slug: "snacks", cats: ["Snacks"] },
      { name: "Ice & Party", slug: "ice-party", cats: ["Party Essentials", "Snacks, Ice & Miscellaneous", "Miscellaneous"] },
    ],
  },
  {
    name: "Deals", slug: "deals", cats: ["Promotions"], deal: true,
    blurb: "This week's promotions and bundle prices.",
    subs: [],
  },
];

export const findSection = (slug: string) => SECTIONS.find((s) => s.slug === slug);
