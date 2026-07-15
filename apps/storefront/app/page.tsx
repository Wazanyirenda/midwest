import type { Metadata } from "next"
import { HomeClient } from "@/components/home/home-client"

export const metadata: Metadata = {
  title: "Midwestern Peptides — Research Peptides",
  description: "High-purity research peptides. ≥98% purity by HPLC. Third-party tested, batch-verified.",
}

export default function HomePage() {
  return <HomeClient />
}
