import { ProjectCard } from "@/components/ProjectCard";
import { getDbSingleton, queries } from "@shveyka/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Каталог проектов — Швейка",
};

export default async function ProjectsPage() {
  const db = getDbSingleton();
  const projectList = await queries.listProjects(db);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-stone-900">Каталог проектов</h1>
        <p className="text-stone-600">Найдено {projectList.length} проектов</p>
      </div>

      {projectList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-2xl mb-2">🧵</p>
          <p className="text-stone-600">Проектов пока нет. Загляните позже.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectList.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
