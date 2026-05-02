import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter } as any);

const STATUSES = ["New", "In Progress", "Under Review", "Approved", "Completed", "Cancelled"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.space.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const amy = await prisma.user.create({
    data: { name: "Amy W.", email: "amy@example.com", color: "#f59e0b" },
  });
  const julia = await prisma.user.create({
    data: { name: "Julia H.", email: "julia@example.com", color: "#6366f1" },
  });
  const jason = await prisma.user.create({
    data: { name: "Jason S.", email: "jason@example.com", color: "#10b981" },
  });

  const users = [amy, julia, jason];

  // ── Space 1: Manufacturing ───────────────────────────────────────────────
  const mfgSpace = await prisma.space.create({
    data: { name: "Manufacturing", color: "#f97316", position: 0 },
  });

  const mfgFolders = await Promise.all([
    prisma.folder.create({ data: { name: "Production Planning", spaceId: mfgSpace.id, position: 0 } }),
    prisma.folder.create({ data: { name: "Quality Control", spaceId: mfgSpace.id, position: 1 } }),
    prisma.folder.create({ data: { name: "Supply Chain", spaceId: mfgSpace.id, position: 2 } }),
  ]);

  const mfgProjects = await Promise.all([
    prisma.project.create({ data: { name: "Q3 Production Schedule", folderId: mfgFolders[0].id, color: "#f97316", position: 0 } }),
    prisma.project.create({ data: { name: "Assembly Line Upgrade", folderId: mfgFolders[0].id, color: "#ef4444", position: 1 } }),
    prisma.project.create({ data: { name: "ISO 9001 Audit Prep", folderId: mfgFolders[1].id, color: "#8b5cf6", position: 0 } }),
    prisma.project.create({ data: { name: "Vendor Onboarding", folderId: mfgFolders[2].id, color: "#06b6d4", position: 0 } }),
  ]);

  const mfgTaskDefs = [
    { title: "Define production targets", projectId: mfgProjects[0].id, status: "Completed", assigneeId: amy.id, startDate: daysFromNow(-20), dueDate: daysFromNow(-10) },
    { title: "Schedule machine maintenance", projectId: mfgProjects[0].id, status: "In Progress", assigneeId: jason.id, startDate: daysFromNow(-5), dueDate: daysFromNow(5) },
    { title: "Coordinate shift rotations", projectId: mfgProjects[0].id, status: "New", assigneeId: julia.id, startDate: daysFromNow(1), dueDate: daysFromNow(14) },
    { title: "Source replacement conveyor parts", projectId: mfgProjects[1].id, status: "In Progress", assigneeId: amy.id, startDate: daysFromNow(-3), dueDate: daysFromNow(7) },
    { title: "Install new robotics arm", projectId: mfgProjects[1].id, status: "New", assigneeId: jason.id, startDate: daysFromNow(8), dueDate: daysFromNow(20) },
    { title: "Run safety tests post-upgrade", projectId: mfgProjects[1].id, status: "New", assigneeId: julia.id, startDate: daysFromNow(21), dueDate: daysFromNow(25) },
    { title: "Compile ISO documentation", projectId: mfgProjects[2].id, status: "Under Review", assigneeId: julia.id, startDate: daysFromNow(-15), dueDate: daysFromNow(-2) },
    { title: "Internal pre-audit review", projectId: mfgProjects[2].id, status: "Approved", assigneeId: amy.id, startDate: daysFromNow(-1), dueDate: daysFromNow(3) },
    { title: "Schedule external auditor", projectId: mfgProjects[2].id, status: "New", assigneeId: jason.id, startDate: daysFromNow(4), dueDate: daysFromNow(10) },
    { title: "Evaluate 3 new suppliers", projectId: mfgProjects[3].id, status: "In Progress", assigneeId: amy.id, startDate: daysFromNow(-8), dueDate: daysFromNow(2) },
    { title: "Negotiate contracts", projectId: mfgProjects[3].id, status: "New", assigneeId: julia.id, startDate: daysFromNow(3), dueDate: daysFromNow(15) },
    { title: "Set up supplier portal", projectId: mfgProjects[3].id, status: "New", assigneeId: jason.id, startDate: daysFromNow(10), dueDate: daysFromNow(18) },
  ];

  const mfgTasks = await Promise.all(
    mfgTaskDefs.map((t, i) =>
      prisma.task.create({
        data: { ...t, priority: pick(PRIORITIES), position: i, effort: Math.random() * 8, plannedCost: Math.random() * 2000 },
      })
    )
  );

  // Add some subtasks to first mfg task
  await prisma.task.create({
    data: { title: "Review last quarter targets", projectId: mfgProjects[0].id, status: "Completed", parentId: mfgTasks[0].id, assigneeId: amy.id, position: 0 },
  });
  await prisma.task.create({
    data: { title: "Update forecasting spreadsheet", projectId: mfgProjects[0].id, status: "Completed", parentId: mfgTasks[0].id, assigneeId: julia.id, position: 1 },
  });

  // ── Space 2: Creative Development ────────────────────────────────────────
  const creativeSpace = await prisma.space.create({
    data: { name: "Creative Development", color: "#6366f1", position: 1 },
  });

  const creativeFolders = await Promise.all([
    prisma.folder.create({ data: { name: "Brand Identity", spaceId: creativeSpace.id, position: 0 } }),
    prisma.folder.create({ data: { name: "Marketing Campaigns", spaceId: creativeSpace.id, position: 1 } }),
    prisma.folder.create({ data: { name: "Web & Digital", spaceId: creativeSpace.id, position: 2 } }),
  ]);

  const creativeProjects = await Promise.all([
    prisma.project.create({ data: { name: "Logo Redesign 2024", folderId: creativeFolders[0].id, color: "#ec4899", position: 0 } }),
    prisma.project.create({ data: { name: "Brand Guidelines V2", folderId: creativeFolders[0].id, color: "#f59e0b", position: 1 } }),
    prisma.project.create({ data: { name: "Summer Campaign", folderId: creativeFolders[1].id, color: "#10b981", position: 0 } }),
    prisma.project.create({ data: { name: "Product Launch — Nova", folderId: creativeFolders[1].id, color: "#3b82f6", position: 1 } }),
    prisma.project.create({ data: { name: "Website Redesign", folderId: creativeFolders[2].id, color: "#8b5cf6", position: 0 } }),
    prisma.project.create({ data: { name: "Social Media Automation", folderId: creativeFolders[2].id, color: "#06b6d4", position: 1 } }),
  ]);

  const creativeTaskDefs = [
    { title: "Mood board research", projectId: creativeProjects[0].id, status: "Completed", assigneeId: julia.id, startDate: daysFromNow(-30), dueDate: daysFromNow(-20) },
    { title: "Initial logo concepts (x5)", projectId: creativeProjects[0].id, status: "Completed", assigneeId: amy.id, startDate: daysFromNow(-20), dueDate: daysFromNow(-12) },
    { title: "Stakeholder review round 1", projectId: creativeProjects[0].id, status: "Under Review", assigneeId: jason.id, startDate: daysFromNow(-12), dueDate: daysFromNow(-5) },
    { title: "Final logo refinements", projectId: creativeProjects[0].id, status: "In Progress", assigneeId: julia.id, startDate: daysFromNow(-4), dueDate: daysFromNow(4) },
    { title: "Export all formats (SVG/PNG/EPS)", projectId: creativeProjects[0].id, status: "New", assigneeId: amy.id, startDate: daysFromNow(5), dueDate: daysFromNow(8) },
    { title: "Write colour palette guidelines", projectId: creativeProjects[1].id, status: "In Progress", assigneeId: julia.id, startDate: daysFromNow(-7), dueDate: daysFromNow(3) },
    { title: "Typography selection & pairing", projectId: creativeProjects[1].id, status: "New", assigneeId: amy.id, startDate: daysFromNow(2), dueDate: daysFromNow(9) },
    { title: "Photography style guide", projectId: creativeProjects[1].id, status: "New", assigneeId: jason.id, startDate: daysFromNow(8), dueDate: daysFromNow(16) },
    { title: "Campaign concept development", projectId: creativeProjects[2].id, status: "Approved", assigneeId: amy.id, startDate: daysFromNow(-10), dueDate: daysFromNow(-3) },
    { title: "Ad copy & headlines", projectId: creativeProjects[2].id, status: "In Progress", assigneeId: julia.id, startDate: daysFromNow(-2), dueDate: daysFromNow(5) },
    { title: "Social media assets (30 posts)", projectId: creativeProjects[2].id, status: "New", assigneeId: jason.id, startDate: daysFromNow(4), dueDate: daysFromNow(14) },
    { title: "Email newsletter design", projectId: creativeProjects[2].id, status: "New", assigneeId: amy.id, startDate: daysFromNow(8), dueDate: daysFromNow(15) },
    { title: "Press release draft", projectId: creativeProjects[3].id, status: "In Progress", assigneeId: jason.id, startDate: daysFromNow(-5), dueDate: daysFromNow(2) },
    { title: "Influencer outreach list", projectId: creativeProjects[3].id, status: "New", assigneeId: julia.id, startDate: daysFromNow(1), dueDate: daysFromNow(10) },
    { title: "Launch event planning", projectId: creativeProjects[3].id, status: "New", assigneeId: amy.id, startDate: daysFromNow(7), dueDate: daysFromNow(21) },
    { title: "Wireframes — all pages", projectId: creativeProjects[4].id, status: "Completed", assigneeId: julia.id, startDate: daysFromNow(-25), dueDate: daysFromNow(-15) },
    { title: "UI Design system setup", projectId: creativeProjects[4].id, status: "In Progress", assigneeId: amy.id, startDate: daysFromNow(-14), dueDate: daysFromNow(1) },
    { title: "Homepage hero design", projectId: creativeProjects[4].id, status: "Under Review", assigneeId: jason.id, startDate: daysFromNow(-3), dueDate: daysFromNow(4) },
    { title: "Mobile responsive layouts", projectId: creativeProjects[4].id, status: "New", assigneeId: julia.id, startDate: daysFromNow(5), dueDate: daysFromNow(12) },
    { title: "Accessibility audit", projectId: creativeProjects[4].id, status: "New", assigneeId: amy.id, startDate: daysFromNow(13), dueDate: daysFromNow(17) },
    { title: "Set up scheduling tool", projectId: creativeProjects[5].id, status: "Completed", assigneeId: jason.id, startDate: daysFromNow(-12), dueDate: daysFromNow(-6) },
    { title: "Connect Instagram & LinkedIn APIs", projectId: creativeProjects[5].id, status: "In Progress", assigneeId: julia.id, startDate: daysFromNow(-5), dueDate: daysFromNow(3) },
    { title: "Create content calendar template", projectId: creativeProjects[5].id, status: "New", assigneeId: amy.id, startDate: daysFromNow(2), dueDate: daysFromNow(8) },
  ];

  const creativeTasks = await Promise.all(
    creativeTaskDefs.map((t, i) =>
      prisma.task.create({
        data: { ...t, priority: pick(PRIORITIES), position: i, effort: Math.random() * 8, plannedCost: Math.random() * 3000 },
      })
    )
  );

  // Subtasks for "Final logo refinements"
  const parentTask = creativeTasks[3];
  await Promise.all([
    prisma.task.create({ data: { title: "Refine stroke weights", projectId: creativeProjects[0].id, status: "Completed", parentId: parentTask.id, assigneeId: julia.id, position: 0 } }),
    prisma.task.create({ data: { title: "Adjust colour saturation", projectId: creativeProjects[0].id, status: "In Progress", parentId: parentTask.id, assigneeId: amy.id, position: 1 } }),
    prisma.task.create({ data: { title: "Test on dark backgrounds", projectId: creativeProjects[0].id, status: "New", parentId: parentTask.id, assigneeId: jason.id, position: 2 } }),
  ]);

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
