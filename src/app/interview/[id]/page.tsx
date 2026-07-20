import { notFound } from "next/navigation";
import { getInterviewer, INTERVIEWERS } from "@/lib/interviewers";
import InterviewRoom from "@/components/InterviewRoom";

export function generateStaticParams() {
  return INTERVIEWERS.map((i) => ({ id: i.id }));
}

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const interviewer = getInterviewer(id);
  if (!interviewer) notFound();
  return <InterviewRoom interviewer={interviewer} />;
}
