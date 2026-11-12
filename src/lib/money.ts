export const money = (cents: number) =>
  "$" + (cents / 100).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
