import Breadcrumbs from "../../components/Breadcrumbs";
import PdfExportButton from "../../components/PdfExportButton";

/* ===============================
   STYLES (ONE SYSTEM)
================================ */
const pageStyle: React.CSSProperties = {
  padding: 32,
  maxWidth: 1100,
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  gap: 16,
  padding: "18px 22px",
  marginBottom: 28,
  borderRadius: 12,
  background: "#020617",
};

const accentStyle: React.CSSProperties = {
  width: 4,
  borderRadius: 4,
  background: "#22c55e",
};

const contentStyle: React.CSSProperties = {
  flex: 1,
};

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  marginBottom: 8,
};

const textStyle: React.CSSProperties = {
  lineHeight: 1.7,
  opacity: 0.9,
};

/* ===============================
   PAGE
================================ */
export default function Aquaculture() {
  const pdfContent = `
Aquaculture Water Quality Monitoring System

Session-based monitoring, classification,
and automated tank routing for aquaculture environments.
`;

  return (
    <div style={pageStyle}>
      <Breadcrumbs items={["Home", "Applications", "Aquaculture"]} />

      <h1 style={{ marginBottom: 8 }}>🐟 Aquaculture Applications</h1>
      <p style={{ opacity: 0.75, marginBottom: 28 }}>
        Intelligent, session-driven water-quality monitoring for aquaculture systems.
      </p>

      <PdfExportButton
        title="Aquaculture_Water_Quality_System"
        content={pdfContent}
      />

      {/* 1 */}
      <section style={sectionStyle}>
        <div style={accentStyle} />
        <div style={contentStyle}>
          <div style={titleStyle}>1. Problem Context</div>
          <p style={textStyle}>
            Aquaculture systems are extremely sensitive to water quality.
            Minor deviations in chemical parameters can lead to stress,
            disease outbreaks, and economic loss.
          </p>
        </div>
      </section>

      {/* 2 */}
      <section style={sectionStyle}>
        <div style={accentStyle} />
        <div style={contentStyle}>
          <div style={titleStyle}>2. Key Water Quality Parameters</div>
          <p style={textStyle}>
            The system continuously evaluates pH, turbidity, and Total Dissolved
            Solids (TDS) to represent chemical balance, particulate load, and
            ionic concentration.
          </p>
        </div>
      </section>

      {/* 3 */}
      <section style={sectionStyle}>
        <div style={accentStyle} />
        <div style={contentStyle}>
          <div style={titleStyle}>3. Live Session-Based Monitoring</div>
          <p style={textStyle}>
            Data is collected only during explicitly initiated sessions.
            This guarantees traceable, intentional data capture and avoids
            background noise.
          </p>
        </div>
      </section>

      {/* 4 */}
      <section style={sectionStyle}>
        <div style={accentStyle} />
        <div style={contentStyle}>
          <div style={titleStyle}>4. Iteration History & Analysis</div>
          <p style={textStyle}>
            Each completed session is stored as an iteration containing
            timestamps, averages, raw values, and system decisions,
            enabling long-term trend analysis.
          </p>
        </div>
      </section>

      {/* 5 */}
      <section style={sectionStyle}>
        <div style={accentStyle} />
        <div style={contentStyle}>
          <div style={titleStyle}>5. Decision Logic & Classification</div>
          <p style={textStyle}>
            Session averages are processed through deterministic thresholds
            and classified into filtration brackets (F1–F5), ensuring
            explainable and reproducible outcomes.
          </p>
        </div>
      </section>

      {/* 6 */}
      <section style={sectionStyle}>
        <div style={accentStyle} />
        <div style={contentStyle}>
          <div style={titleStyle}>6. Tank Routing & Pump Control</div>
          <p style={textStyle}>
            Based on classification results, control signals route water
            to reusable or treatment tanks, preventing cross-contamination
            and protecting aquatic life.
          </p>
        </div>
      </section>

      {/* 7 */}
      <section style={sectionStyle}>
        <div style={accentStyle} />
        <div style={contentStyle}>
          <div style={titleStyle}>7. Operational Benefits for Farmers</div>
          <ul style={textStyle}>
            <li>Reduced fish mortality and disease risk</li>
            <li>Lower water replacement and treatment costs</li>
            <li>Improved yield predictability</li>
            <li>Reduced dependency on manual testing</li>
          </ul>
        </div>
      </section>

      {/* 8 */}
      <section style={sectionStyle}>
        <div style={accentStyle} />
        <div style={contentStyle}>
          <div style={titleStyle}>8. Sustainability & Compliance</div>
          <p style={textStyle}>
            Controlled reuse minimizes freshwater extraction and wastewater
            discharge. Stored iteration logs support audits and regulatory
            compliance.
          </p>
        </div>
      </section>

      {/* 9 */}
      <section style={sectionStyle}>
        <div style={accentStyle} />
        <div style={contentStyle}>
          <div style={titleStyle}>9. Scalability & Cross-Domain Adaptability</div>
          <p style={textStyle}>
            The same architecture and iteration-based decision model can
            be applied to agriculture irrigation and industrial water
            reuse systems with minimal modification.
          </p>
        </div>
      </section>
    </div>
  );
}
