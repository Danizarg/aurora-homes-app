import { HostLanding } from "../components/host/HostLanding";

const steps = [
  { title: "Tell Aurora about your place", body: "Upload a few photos and the area. Aurora detects the rest." },
  { title: "Make it stand out", body: "Agency-quality exposé, FAQ and translations are written for you." },
  { title: "Finish up and publish", body: "Review, set a price, and publish. The AI assistant pre-qualifies enquiries 24/7." },
];

export default function RentOutScreen() {
  return (
    <HostLanding
      title="Rent out your home with Aurora"
      subtitle="Publish a professional listing in minutes instead of days — with a lower, transparent platform fee than a traditional agent."
      imageSeed="aurora-rent-out"
      stepsTitle="It's easy to get started"
      steps={steps}
    />
  );
}
