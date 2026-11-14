/** Shop rules in one place. Figures marked "assumed" need confirming. */
export const SHOP = {
  name: "DRINQ",
  company: "DRINQSG PTE LTD",
  uen: "202016031N",
  freeDeliveryFrom: 8000, // cents — assumed $80
  deliveryFee: 1000, // cents — assumed $10 below free-delivery amount
  minLeadHours: 3, // earliest slot starts at least this long after ordering — assumed
  daysAhead: 14,
  // Singapore: no retail liquor sales 10.30pm–7am, so deliveries only run in these slots.
  slots: [
    { id: "10:00-13:00", label: "10am – 1pm", start: 10 },
    { id: "13:00-16:00", label: "1pm – 4pm", start: 13 },
    { id: "16:00-19:00", label: "4pm – 7pm", start: 16 },
    { id: "19:00-22:00", label: "7pm – 10pm", start: 19 },
  ],
  telegramUrl: process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/DrinQalcoholdelivery",
};
