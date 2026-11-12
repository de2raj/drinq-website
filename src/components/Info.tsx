import Link from "next/link";

export function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wrap">
      <div className="info">
        <div className="crumbs"><Link href="/">Home</Link> / {title}</div>
        <h1 className="display">{title}</h1>
        {children}
      </div>
    </div>
  );
}
