import { redirect } from "next/navigation";

// The app has no standalone home page: the dashboard is the entry point.
// (The (app) layout has already redirected to /onboarding if needed.)
export default function Home() {
  redirect("/dashboard");
}
