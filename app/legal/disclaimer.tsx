import { LegalScreenLayout } from "../../components/ui/LegalScreenLayout";

export default function DisclaimerScreen() {
  return (
    <LegalScreenLayout
      title="Disclaimer"
      paragraphs={[
        "Zouza is an independent concept and is not affiliated with Airbnb, Idealista, ThinkSpain, Zillow, Booking, or any other rental or property platform.",
        "Zouza does not provide legal advice, payment processing, escrow, deposit management, rent guarantees, tax advice, or deposit custody in the MVP.",
        "Property verification badges reflect information provided by owners and reviewed by Zouza on a best-effort basis. They are not a guarantee of ownership, legal title, or the accuracy of listing information.",
        "AI-generated exposés, FAQs, translations, and property assistant answers are produced automatically and may contain errors. Always verify details directly with the property owner before making decisions.",
        "Price breakdowns (rent, utilities and deposit) are estimates provided for transparency and do not constitute a binding offer.",
        "Use of Zouza is at your own discretion. Always conduct your own due diligence and consult qualified professionals for legal, financial, or tax matters.",
      ]}
    />
  );
}
