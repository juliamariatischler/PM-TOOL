import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const demoUsers = [
  {
    name: "Julia T.",
    email: "juliamariatischler@gmail.com",
    password: "Julia1234!",
    color: "#10b981",
  },
  {
    name: "Rafaela Kamper",
    email: "office@am-sonnenhof.at",
    password: "Rafaela1234!",
    color: "#f97316",
  },
  {
    name: "Amy W.",
    email: "amy@example.com",
    password: "Amy1234!",
    color: "#3b82f6",
  },
];

function expect(data, error, message) {
  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }
  return data;
}

async function listAllAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    const payload = expect(data, error, "Unable to list auth users");

    users.push(...payload.users);
    if (payload.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return users;
}

async function ensureAuthUser(user) {
  const authUsers = await listAllAuthUsers();
  const existing = authUsers.find((item) => item.email?.toLowerCase() === user.email.toLowerCase());

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name },
    });
    expect(data, error, `Unable to update auth user ${user.email}`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { name: user.name },
  });
  const created = expect(data, error, `Unable to create auth user ${user.email}`);

  return created.user.id;
}

async function ensureProfiles() {
  const profiles = [];

  for (const user of demoUsers) {
    const authUserId = await ensureAuthUser(user);
    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          id: authUserId,
          name: user.name,
          email: user.email,
          color: user.color,
        },
        { onConflict: "id" }
      )
      .select("id, name, email, color")
      .single();
    const profile = expect(data, error, `Unable to upsert profile ${user.email}`);

    profiles.push(profile);
  }

  return profiles;
}

async function clearWorkspace() {
  {
    const { data, error } = await supabase.from("tasks").delete().not("id", "is", null);
    expect(data, error, "Unable to clear tasks");
  }
  {
    const { data, error } = await supabase.from("projects").delete().not("id", "is", null);
    expect(data, error, "Unable to clear projects");
  }
  {
    const { data, error } = await supabase.from("folders").delete().not("id", "is", null);
    expect(data, error, "Unable to clear folders");
  }
  {
    const { data, error } = await supabase.from("spaces").delete().not("id", "is", null);
    expect(data, error, "Unable to clear spaces");
  }
}

async function insertSpace(space) {
  const { data, error } = await supabase.from("spaces").insert(space).select("id, name").single();
  return expect(data, error, `Unable to create space ${space.name}`);
}

async function insertFolder(folder) {
  const { data, error } = await supabase.from("folders").insert(folder).select("id, name").single();
  return expect(data, error, `Unable to create folder ${folder.name}`);
}

async function insertProject(project) {
  const { data, error } = await supabase.from("projects").insert(project).select("id, name").single();
  return expect(data, error, `Unable to create project ${project.name}`);
}

async function insertTask(task) {
  const { data, error } = await supabase.from("tasks").insert(task).select("id, title").single();
  return expect(data, error, `Unable to create task ${task.title}`);
}

async function seedWorkspace(profiles) {
  const [julia, rafaela, amy] = profiles;

  const manufacturing = await insertSpace({
    name: "Manufacturing",
    color: "#00B050",
    position: 0,
  });

  const creative = await insertSpace({
    name: "Creative Development",
    color: "#8b5cf6",
    position: 1,
  });

  const mfgFolders = await Promise.all([
    insertFolder({ name: "Production Planning", space_id: manufacturing.id, position: 0 }),
    insertFolder({ name: "Quality Control", space_id: manufacturing.id, position: 1 }),
    insertFolder({ name: "Supply Chain", space_id: manufacturing.id, position: 2 }),
  ]);

  const creativeFolders = await Promise.all([
    insertFolder({ name: "Brand Identity", space_id: creative.id, position: 0 }),
    insertFolder({ name: "Marketing Campaigns", space_id: creative.id, position: 1 }),
    insertFolder({ name: "Web & Digital", space_id: creative.id, position: 2 }),
  ]);

  const projects = await Promise.all([
    insertProject({ name: "Q3 Production Schedule", folder_id: mfgFolders[0].id, color: "#f97316", position: 0 }),
    insertProject({ name: "Assembly Line Upgrade", folder_id: mfgFolders[0].id, color: "#ef4444", position: 1 }),
    insertProject({ name: "ISO 9001 Audit Prep", folder_id: mfgFolders[1].id, color: "#8b5cf6", position: 0 }),
    insertProject({ name: "Vendor Onboarding", folder_id: mfgFolders[2].id, color: "#06b6d4", position: 0 }),
    insertProject({ name: "Logo Redesign 2024", folder_id: creativeFolders[0].id, color: "#ec4899", position: 0 }),
    insertProject({ name: "Brand Guidelines V2", folder_id: creativeFolders[0].id, color: "#f59e0b", position: 1 }),
    insertProject({ name: "Summer Campaign", folder_id: creativeFolders[1].id, color: "#10b981", position: 0 }),
    insertProject({ name: "Product Launch Nova", folder_id: creativeFolders[1].id, color: "#3b82f6", position: 1 }),
    insertProject({ name: "Website Redesign", folder_id: creativeFolders[2].id, color: "#8b5cf6", position: 0 }),
    insertProject({ name: "Social Media Automation", folder_id: creativeFolders[2].id, color: "#06b6d4", position: 1 }),
  ]);

  await Promise.all([
    insertTask({
      title: "Finalize weekly line capacity",
      project_id: projects[0].id,
      status: "In Progress",
      assignee_id: julia.id,
      priority: "High",
      due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
      position: 0,
    }),
    insertTask({
      title: "Confirm packaging vendor timeline",
      project_id: projects[0].id,
      status: "New",
      assignee_id: rafaela.id,
      priority: "Medium",
      due_date: new Date(Date.now() + 6 * 86400000).toISOString(),
      position: 1,
    }),
    insertTask({
      title: "Audit workstation safety checklist",
      project_id: projects[2].id,
      status: "Completed",
      assignee_id: amy.id,
      priority: "High",
      position: 0,
    }),
  ]);

  const parentTask = await insertTask({
    title: "Refine logo mark options",
    project_id: projects[4].id,
    status: "In Progress",
    assignee_id: julia.id,
    priority: "High",
    description: "Prepare the final three directions for stakeholder review.",
    position: 0,
  });

  await Promise.all([
    insertTask({
      title: "Refine stroke weights",
      project_id: projects[4].id,
      parent_id: parentTask.id,
      status: "Completed",
      assignee_id: julia.id,
      position: 0,
    }),
    insertTask({
      title: "Adjust colour saturation",
      project_id: projects[4].id,
      parent_id: parentTask.id,
      status: "In Progress",
      assignee_id: amy.id,
      position: 1,
    }),
    insertTask({
      title: "Test on dark backgrounds",
      project_id: projects[4].id,
      parent_id: parentTask.id,
      status: "New",
      assignee_id: rafaela.id,
      position: 2,
    }),
  ]);

  await Promise.all([
    insertTask({
      title: "Landing page wireframes",
      project_id: projects[8].id,
      status: "In Progress",
      assignee_id: amy.id,
      priority: "Medium",
      position: 0,
    }),
    insertTask({
      title: "Analytics event plan",
      project_id: projects[9].id,
      status: "New",
      assignee_id: rafaela.id,
      priority: "Low",
      position: 0,
    }),
  ]);
}

async function main() {
  const profiles = await ensureProfiles();
  await clearWorkspace();
  await seedWorkspace(profiles);
  console.log("Supabase seed completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
