import { createFileRoute } from "@tanstack/react-router";
import { CaptainConsole } from "@/components/console/CaptainConsole";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <CaptainConsole />;
}
