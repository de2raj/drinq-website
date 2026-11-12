import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap" style={{ textAlign: "center", padding: "80px 0" }}>
      <h1 className="display" style={{ fontSize: 56 }}>Not found</h1>
      <p style={{ margin: "14px 0 24px", fontWeight: 500 }}>That page doesn&apos;t exist, or the product is no longer listed.</p>
      <Link className="btn" href="/">Back to the shop</Link>
    </div>
  );
}
