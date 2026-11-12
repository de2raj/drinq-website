const s = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export const IconSearch = () => (<svg width="18" height="18" viewBox="0 0 24 24" {...s} strokeWidth="2.5"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const IconMenu = () => (<svg width="22" height="22" viewBox="0 0 24 24" {...s} strokeWidth="2.5"><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const IconClose = () => (<svg width="22" height="22" viewBox="0 0 24 24" {...s} strokeWidth="2.6"><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconBag = () => (<svg width="22" height="22" viewBox="0 0 24 24" {...s} strokeWidth="2.3"><path d="M5 7h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" /><path d="M9 10V6a3 3 0 0 1 6 0v4" /></svg>);
export const IconTelegram = ({ size = 34, color = "#FFC515" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M21.6 3.3 2.9 10.5c-1.3.5-1.3 1.2-.2 1.6l4.8 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.6.2 1.8-.8l3.2-15.2c.3-1.3-.5-1.9-1.6-1.4zM8.4 13.2l9.9-6.2c.5-.3.9-.1.6.2l-8.5 7.7-.3 3.5z" /></svg>
);
