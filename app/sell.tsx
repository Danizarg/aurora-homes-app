import { HostLanding } from "../components/host/HostLanding";

const steps = [
  { title: "Upload photos", body: "Interior, exterior and standout features — Aurora writes a sales exposé built for serious buyers." },
  { title: "Answer buyers before they ask", body: "A buyer FAQ and a property AI agent handle the back-and-forth for you." },
  { title: "Meet buyers directly", body: "Viewing requests and messages come straight to you — no middleman, optional verification badge." },
];

export default function SellScreen() {
  return (
    <HostLanding
      title="Sell your property with agency-level presentation"
      subtitle="Without the agency process."
      imageSeed="aurora-sell"
      stepsTitle="How selling works"
      steps={steps}
      ctaLabel="Start with photos"
      disclaimer={{
        title: "Legal disclaimer",
        body: "Aurora Homes does not provide legal advice, payment processing, escrow, or contract negotiation. All sales are conducted directly between the owner and buyer; please engage a licensed professional for legal and tax matters.",
      }}
    />
  );
}
