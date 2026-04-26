import dynamic from "next/dynamic";
import ScrollSimulation from "@/components/landing/ScrollSimulation";
import {
  ProblemSection,
  FeatureStackSection,
  FinalCTA,
} from "@/components/landing/Sections";

// Portals (Radix Dialog) render into document.body on the client but inline
// during SSR, causing a DOM structure mismatch at hydration time.
// Loading them client-side only avoids the mismatch entirely — they render
// nothing when closed so there is no visual or SEO trade-off.
const WaitlistModal = dynamic(
  () => import("@/components/landing/WaitlistModal"),
  { ssr: false }
);
const DemoVideoModal = dynamic(
  () => import("@/components/landing/DemoVideoModal"),
  { ssr: false }
);
const GeminiKeyModal = dynamic(
  () => import("@/components/landing/GeminiKeyModal"),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="relative bg-[#050507] text-white">
      <div className="grain" />
      <main>
        <ScrollSimulation />
        <div
          className="relative"
          style={{
            backgroundImage: "url('/blueprint-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
            /* Pull up slightly to overlap the video section's bottom edge */
            marginTop: "-4px",
          }}
        >
          {/* Base tint — keeps blueprint readable without washing it out */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(4,4,9,0.10)" }} />

          {/* Section-entry bridge: dissolves from the video section's bottom color into the blueprint */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none"
            style={{
              height: "380px",
              zIndex: 2,
              background: "linear-gradient(to bottom, #040409 0%, rgba(4,4,9,0.60) 25%, rgba(4,4,9,0.20) 55%, rgba(4,4,9,0.04) 80%, transparent 100%)",
            }}
          />

          {/* Sticky edge-fade: text disappears cleanly as it scrolls under the nav */}
          <div
            className="sticky top-0 z-50 pointer-events-none"
            style={{
              height: "72px",
              marginBottom: "-72px",
              background: "linear-gradient(to bottom, rgba(4,4,9,0.96) 0%, rgba(4,4,9,0.75) 35%, rgba(4,4,9,0.18) 68%, transparent 100%)",
            }}
          />
          <ProblemSection />
          <FeatureStackSection />
          <FinalCTA />
        </div>
      </main>
      <WaitlistModal />
      <DemoVideoModal />
      <GeminiKeyModal />
    </div>
  );
}
