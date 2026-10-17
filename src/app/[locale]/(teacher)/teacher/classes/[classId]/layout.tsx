import { notFound } from "next/navigation";
import { ClassHeader } from "@/components/features/teacher/ClassHeader";
import { getClass } from "@/lib/classes/queries";

/** Every class screen (T6, T11, T12, T13, T15): header, join code and section tabs. RLS hides other teachers' classes. */
export default async function ClassLayout({ params, children }: LayoutProps<"/[locale]/teacher/classes/[classId]">) {
  const { classId } = await params;
  const cls = await getClass(classId);
  if (!cls) notFound();
  return (
    <div className="flex flex-col gap-6">
      <ClassHeader cls={cls} />
      {children}
    </div>
  );
}
