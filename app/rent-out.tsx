import { HostLanding } from "../components/host/HostLanding";

const steps = [
  { title: "Tell Suzi about your place", body: "Upload a few photos and the area. Suzi detects the rest." },
  { title: "Make it stand out", body: "Agency-quality exposé, FAQ and translations are written for you." },
  { title: "Finish up and publish", body: "Review, set a price, and publish. Suzi pre-qualifies enquiries 24/7. €20/month flat while the listing is live, cancel any month." },
];

export default function RentOutScreen() {
  return (
    <HostLanding
      title="Rent out your home with Suzi"
      subtitle="Publish a professional listing in minutes instead of days. No commission — Zouza never takes a cut."
      imageSeed="zouza-rent-out"
      stepsTitle="It's easy to get started"
      steps={steps}
    />
  );
}
