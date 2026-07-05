import { LegalScreenLayout } from "../../components/ui/LegalScreenLayout";

export default function PrivacyScreen() {
  return (
    <LegalScreenLayout
      title="Privacy Policy"
      paragraphs={[
        "Aurora Homes collects the information you provide directly, such as your name, email, listing details, uploaded photos, and messages sent through the platform.",
        "Listing photos and details are used to generate AI-powered marketing content (exposés, FAQs, translations, and property assistant answers) for your property.",
        "If Supabase is configured, your data is stored securely in your project's Supabase database and storage buckets. If not configured, data is stored locally on your device only and is not transmitted anywhere.",
        "Aurora Homes does not sell personal data to third parties.",
        "You may request deletion of your account and associated data at any time by contacting support.",
        "This policy is a placeholder for demonstration purposes and will be replaced with a full privacy policy before public launch.",
      ]}
    />
  );
}
