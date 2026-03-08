import Breadcrumbs from "../../components/Breadcrumbs";
import ExpandableSection from "../../components/ExpandableSection";
import PdfExportButton from "../../components/PdfExportButton";

export default function Agriculture() {
  const pdfContent = `
Agriculture Water Quality Monitoring

Water quality plays a crucial role in irrigation, soil health,
and crop productivity. Parameters such as pH, turbidity, and TDS
directly affect nutrient availability, soil structure, and long-term
agricultural sustainability.
`;

  return (
    <div>
      {/* Breadcrumb navigation */}
      <Breadcrumbs items={["Home", "Applications", "Agriculture"]} />

      <h1 style={{ marginBottom: "8px" }}>🌱 Agriculture Applications</h1>
      <p style={{ opacity: 0.75, marginBottom: "18px" }}>
        Role of water-quality monitoring in modern agricultural systems.
      </p>

      {/* PDF Export */}
      <PdfExportButton
        title="Agriculture_Water_Quality"
        content={pdfContent}
      />

      {/* Expandable Sections */}
      <ExpandableSection
        title="Importance of Water Quality in Irrigation"
        icon="💧"
      >
        <p>
          Irrigation water quality significantly influences soil chemistry
          and plant growth. Improper pH levels can reduce nutrient availability,
          while excessive dissolved solids may lead to soil salinization.
        </p>
        <p>
          Monitoring water parameters ensures that irrigation practices
          do not degrade soil health over time.
        </p>
      </ExpandableSection>

      <ExpandableSection
        title="Impact on Crop Yield and Soil Health"
        icon="🌾"
      >
        <p>
          Long-term use of poor-quality water can result in reduced crop yield,
          poor root development, and decreased microbial activity in soil.
        </p>
        <p>
          Data-driven irrigation decisions help farmers optimize water usage
          while maintaining sustainable farming practices.
        </p>
      </ExpandableSection>

      <ExpandableSection
        title="Reuse of Treated Water for Agriculture"
        icon="🔄"
      >
        <p>
          Treated wastewater can be reused for irrigation if it meets
          acceptable quality thresholds. Filtration brackets (F1–F5)
          assist in determining suitability for reuse.
        </p>
        <p>
          Reuse reduces dependency on freshwater resources and supports
          water conservation initiatives.
        </p>
      </ExpandableSection>

      <ExpandableSection
        title="Smart Farming and Automation"
        icon="⚙️"
      >
        <p>
          Integration of sensors, data analytics, and automated decision
          systems enables precision agriculture. Farmers can respond
          quickly to changes in water quality.
        </p>
        <p>
          Automation improves efficiency, reduces manual effort, and
          enhances long-term agricultural sustainability.
        </p>
      </ExpandableSection>
    </div>
  );
}
