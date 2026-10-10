import { AlertReview } from "@/components/alerts/AlertReview";

export default async function AlertPage({ params }: PageProps<"/alerts/[id]">) {
  const { id } = await params;
  return <AlertReview id={id} />;
}
