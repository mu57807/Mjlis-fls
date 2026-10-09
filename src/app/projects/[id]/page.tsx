import { ReviewEditor } from "@/components/review/ReviewEditor";

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  return <ReviewEditor id={id} />;
}
