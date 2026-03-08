import Breadcrumbs from "../../components/Breadcrumbs";
import ExpandableSection from "../../components/ExpandableSection";
import PdfExportButton from "../../components/PdfExportButton";

export default function Industrial() {
  const pdfContent = `
Industrial Water Quality Monitoring

Industrial processes generate wastewater that must be monitored,
treated, and reused or disposed of according to environmental
regulations. Monitoring pH, turbidity, and TDS is essential for
process efficiency and regulatory compliance.
`;

  return (
    <div>
      {/* Breadcrumb navigation */}
      <Breadcrumbs items={["Home", "Applications", "Industrial"]} />

      <h1 style={{ marginBottom: "8px" }}>🏭 Industrial Applications</h1>
      <p style={{ opacity: 0.75, marginBottom: "18px" }}>
        Application of intelligent water-quality monitoring in industrial systems.
      </p>

      {/* PDF Export */}
      <PdfExportButton
        title="Industrial_Water_Quality"
        content={pdfContent}
      />

      {/* Expandable Sections */}
      <ExpandableSection
        title="Industrial Wastewater Characteristics"
        icon="🧪"
      >
        <p>
          Industrial wastewater often contains high levels of dissolved solids,
          suspended particles, and chemical residues. Continuous monitoring
          helps identify harmful discharge levels.
        </p>
        <p>
          Early detection prevents damage to treatment infrastructure
          and downstream ecosystems.
        </p>
      </ExpandableSection>

      <ExpandableSection
        title="Reuse vs Disposal Decision-Making"
        icon="🔁"
      >
        <p>
          Based on measured parameters, wastewater is classified into
          filtration brackets (F1–F5). Reusable water can be recycled
          within industrial processes.
        </p>
        <p>
          Non-reusable water undergoes advanced treatment or is safely
          discharged following regulatory standards.
        </p>
      </ExpandableSection>

      <ExpandableSection
        title="Regulatory Compliance and Monitoring"
        icon="📜"
      >
        <p>
          Environmental regulations require industries to maintain
          strict control over effluent quality. Automated monitoring
          ensures continuous compliance.
        </p>
        <p>
          Historical data supports audits, reporting, and regulatory inspections.
        </p>
      </ExpandableSection>

      <ExpandableSection
        title="Efficiency, Cost Reduction, and Sustainability"
        icon="⚙️"
      >
        <p>
          Intelligent water reuse reduces freshwater intake and operational
          costs. Automation minimizes manual intervention and process delays.
        </p>
        <p>
          Sustainable water management improves corporate responsibility
          and environmental stewardship.
        </p>
      </ExpandableSection>
    </div>
  );
}
