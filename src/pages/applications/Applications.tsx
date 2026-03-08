import { useNavigate } from "react-router-dom";

export default function Applications() {
  const navigate = useNavigate();

  const cardStyle: React.CSSProperties = {
    background: "#1e293b",
    borderRadius: "16px",
    padding: "26px",
    cursor: "pointer",
    border: "1px solid #334155",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  };

  const cards = [
    {
      title: "Aquaculture",
      icon: "🐟",
      desc: "Scientific monitoring of water quality in fish farms, ponds, and hatcheries.",
      path: "/applications/aquaculture",
    },
    {
      title: "Agriculture",
      icon: "🌱",
      desc: "Water quality assessment for irrigation, soil protection, and crop productivity.",
      path: "/applications/agriculture",
    },
    {
      title: "Industrial",
      icon: "🏭",
      desc: "Monitoring and treatment of industrial wastewater for reuse and compliance.",
      path: "/applications/industrial",
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: "10px" }}>Real-World Applications</h1>
      <p style={{ opacity: 0.75, marginBottom: "28px" }}>
        Explore how intelligent water-quality monitoring systems are applied
        across different domains.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
        }}
      >
        {cards.map((card) => (
          <div
            key={card.title}
            style={cardStyle}
            onClick={() => navigate(card.path)}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 12px 30px rgba(0,0,0,0.35)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow = "none")
            }
          >
            <div style={{ fontSize: "42px", marginBottom: "10px" }}>
              {card.icon}
            </div>
            <h2>{card.title}</h2>
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              {card.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
