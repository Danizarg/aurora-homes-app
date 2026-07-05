import { LegalScreenLayout } from "../../components/ui/LegalScreenLayout";

export default function TermsScreen() {
  return (
    <LegalScreenLayout
      title="Terms of Service"
      paragraphs={[
        "Aurora Homes is an independent concept and is not affiliated with Airbnb, Idealista, ThinkSpain, Zillow, Booking, or any other rental or property platform.",
        "Aurora Homes provides listings, search, messaging, verification options, appointment requests, reviews, a contract template area, and AI-generated marketing content (exposés, FAQs, translations, and a per-listing AI assistant).",
        "Aurora Homes does not provide payment processing, rent collection, escrow, deposit management, rent guarantees, legal advice, or tax advice in the MVP.",
        "All agreements, viewings, and transactions are conducted directly between property owners and prospective tenants or buyers. Aurora Homes acts solely as an intermediary marketplace.",
        "AI-generated content (exposés, FAQs, translations, and property assistant answers) is provided for convenience and may contain errors. Owners are responsible for reviewing and confirming the accuracy of their listing before publishing.",
        "By using Aurora Homes, you agree to provide accurate information and to use the platform in good faith. Fake or misleading listings may be removed at any time.",
        "These terms are a placeholder for demonstration purposes and will be replaced with a full legal agreement before public launch.",
      ]}
    />
  );
}
