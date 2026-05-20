import { NextResponse } from "next/server";
import { requireApiSessionUser } from "@/lib/auth";
import { createDashboardPage, createPageBlock, createSavedTaskView, listDashboardPages } from "@/lib/data";

export async function GET(req: Request) {
  try {
    if (!(await requireApiSessionUser())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get("spaceId");
    const pages = await listDashboardPages(spaceId === "workspace" ? null : spaceId ?? undefined);
    return NextResponse.json(pages);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load pages" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireApiSessionUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const template = body.template === "starter";
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Dashboard";
    const page = await createDashboardPage({
      title,
      icon: typeof body.icon === "string" ? body.icon : "Layout",
      spaceId: typeof body.spaceId === "string" ? body.spaceId : null,
      position: typeof body.position === "number" ? body.position : 0,
      createdById: user.id,
    });

    if (template) {
      const [upcomingView, myTasksView] = await Promise.all([
        createSavedTaskView({
          name: "Anstehende Aufgaben",
          spaceId: page.spaceId,
          filters: { lifecycle: "active", due: "week" },
          columns: ["title", "dueDate", "status", "assignee"],
          createdById: user.id,
        }),
        createSavedTaskView({
          name: "Meine Aufgaben",
          spaceId: page.spaceId,
          filters: { lifecycle: "active", assigneeId: [user.id] },
          columns: ["title", "status", "dueDate"],
          createdById: user.id,
          position: 1,
        }),
      ]);

      await Promise.all([
        createPageBlock({
          pageId: page.id,
          blockType: "shortcuts",
          title: "Shortcuts",
          content: { actions: ["Neue Aufgabe", "Neues Projekt", "Zu den Aufgaben"] },
          position: 0,
        }),
        createPageBlock({
          pageId: page.id,
          blockType: "task_view",
          title: upcomingView.name,
          config: { savedViewId: upcomingView.id },
          width: "half",
          position: 1,
        }),
        createPageBlock({
          pageId: page.id,
          blockType: "links",
          title: "Links",
          content: { links: [{ label: "Projektübersicht", url: "/" }] },
          position: 2,
        }),
        createPageBlock({
          pageId: page.id,
          blockType: "task_view",
          title: myTasksView.name,
          config: { savedViewId: myTasksView.id },
          width: "half",
          position: 3,
        }),
        createPageBlock({
          pageId: page.id,
          blockType: "stats",
          title: "Überblick",
          width: "full",
          position: 4,
        }),
      ]);
    }

    const pages = await listDashboardPages(page.spaceId);
    return NextResponse.json(pages.find((candidate) => candidate.id === page.id) ?? page, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create page" },
      { status: 500 }
    );
  }
}
