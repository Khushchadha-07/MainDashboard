import { Link } from "react-router-dom";

export default function Breadcrumbs({ items }: { items: string[] }) {
  return (
    <div style={{ marginBottom: "16px", fontSize: "14px", opacity: 0.8 }}>
      {items.map((item, i) => (
        <span key={i}>
          {i !== 0 && " › "}
          {i === items.length - 1 ? (
            <span>{item}</span>
          ) : (
            <Link to="/" style={{ color: "#7dd3fc" }}>
              {item}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}
