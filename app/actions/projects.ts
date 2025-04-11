'use server';

// Remove Drizzle imports
// import { eq } from 'drizzle-orm';

import { createClient } from '@/utils/supabase/server';
// Remove unused schema imports
// import { profilesTable, projectsTable } from '@/db/schema';

export async function createProject(name: string) {
  const supabase = await createClient();

  // Call the RPC function to handle project creation atomically
  const { data: project, error } = await supabase
    .rpc('create_new_project', { project_name: name })
    .select() // Select the columns returned by the function
    .single(); // Expect a single row representing the new project

  if (error || !project) {
    console.error("Error calling create_new_project RPC:", error);
    // The RPC function handles internal errors, but the call itself might fail (e.g., network, permissions on RPC)
    throw new Error(`Failed to create project using RPC: ${error?.message || 'Unknown error'}`);
  }

  // The RPC function returns the created project details
  return project;
}

export async function getProject(projectUuid: string) {
  const supabase = await createClient();
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }
  const userId = user.id;

  // Check if user is linked to the project
  const { data: link, error: linkError } = await supabase
    .from('users_projects')
    .select('project_uuid') // Select minimal data
    .eq('user_uuid', userId) // Corrected column name
    .eq('project_uuid', projectUuid)
    .maybeSingle();

  if (linkError || !link) {
    console.error(`Auth check failed for user ${userId} and project ${projectUuid}:`, linkError);
    throw new Error('Project not found or user lacks access');
  }

  // User has access, now fetch the project details
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('uuid', projectUuid)
    .single(); // Use single() as we know it exists from the link check

  if (error) {
    console.error(`Error fetching project ${projectUuid}:`, error);
    throw new Error('Failed to fetch project'); // Throw error on DB failure
  }

  // Error handling for the project fetch itself (though unlikely if link exists)
  if (error || !project) {
    console.error(`Error fetching project details ${projectUuid} after auth check:`, error);
    throw new Error('Failed to fetch project details');
  }

  return project; // Return the single object
}

export async function getProjects() {
  const supabase = await createClient();
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Error getting user for getProjects:", userError);
    return []; // Return empty if no user
  }
  const userId = user.id;

  // Get project UUIDs user is linked to
  const { data: userProjectLinks, error: linkError } = await supabase
    .from('users_projects')
    .select('project_uuid')
    .eq('user_uuid', userId); // Corrected column name

  if (linkError) {
    console.error(`Error fetching project links for user ${userId}:`, linkError);
    return []; // Return empty on error
  }

  const projectUuids = userProjectLinks?.map(link => link.project_uuid) || [];

  let projects = [];
  if (projectUuids.length > 0) {
    // Fetch details for those projects
    const { data: projectDetails, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .in('uuid', projectUuids);

    if (projectsError) {
      console.error(`Error fetching project details for user ${userId}:`, projectsError);
      // Fall through to potentially create default project? Or return empty?
      // Let's return empty for now if fetching details fails.
      return [];
    }
    projects = projectDetails || [];
  }

  // (Error handling and array initialization done above)

  if (projects.length === 0) {
    try {
      const defaultProject = await createProject('Default Project'); // Call refactored createProject
      projects = [defaultProject];
    } catch (createError) {
      console.error("Error creating default project:", createError);
      // If default creation fails, return empty array or re-throw?
      return []; // Return empty if default creation fails
    }
  }

  return projects;
}

export async function updateProjectName(projectUuid: string, newName: string) {
  // Fetch first to ensure it exists before updating
  const supabase = await createClient();
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }
  const userId = user.id;

  // Check if user is linked to the project
  const { data: link, error: linkError } = await supabase
    .from('users_projects')
    .select('project_uuid')
    .eq('user_uuid', userId) // Corrected column name
    .eq('project_uuid', projectUuid)
    .maybeSingle();

  if (linkError || !link) {
    console.error(`Auth check failed for user ${userId} and project ${projectUuid}:`, linkError);
    throw new Error('Project not found or user lacks access');
  }

  // (Authorization check done above)

  // Now perform the update
  const { data: updatedProject, error: updateError } = await supabase
    .from('projects') // Use table name string
    .update({ name: newName })
    .eq('uuid', projectUuid)
    .select() // Select the updated row
    .single(); // Expect single result

  if (updateError || !updatedProject) {
    console.error(`Error updating project name ${projectUuid}:`, updateError);
    throw new Error('Failed to update project name');
  }

  return updatedProject; // Return single object
}

export async function deleteProject(projectUuid: string) {
  const supabase = await createClient();
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }
  const userId = user.id;

  // Check if user is linked to the project they are trying to delete
  const { data: link, error: linkError } = await supabase
    .from('users_projects')
    .select('project_uuid')
    .eq('user_uuid', userId) // Corrected column name
    .eq('project_uuid', projectUuid)
    .maybeSingle();

  if (linkError || !link) {
    console.error(`Auth check failed for user ${userId} and project ${projectUuid}:`, linkError);
    throw new Error('Project not found or user lacks access');
  }

  // Check if this is the last project
  // Check project count first
  // Check if this is the user's *only* project
  const { count: userProjectCount, error: countError } = await supabase
    .from('users_projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_uuid', userId); // Corrected column name

  if (countError) {
    console.error(`Error counting projects for user ${userId}:`, countError);
    throw new Error('Failed to count user projects before deletion');
  }

  // Use userProjectCount now
  if (userProjectCount === 1) {
    throw new Error('Cannot delete the last project associated with this user');
  }

  // Perform delete
  const { error: deleteError } = await supabase
    .from('projects') // Use table name string
    .delete()
    .eq('uuid', projectUuid);

  // Check if delete operation itself failed (e.g., RLS, network issue)
  // Note: Supabase delete might not error if the row doesn't exist, it just deletes 0 rows.
  if (deleteError) {
    console.error(`Error deleting project ${projectUuid}:`, deleteError);
    // Check if the error is due to the project not existing (if needed, e.g., PGRST116)
    // For now, assume any error is critical.
    throw new Error('Failed to delete project');
  }

  return { success: true };
}

export async function setActiveProject(projectUuid: string) {
  // Refactor setActiveProject - check user link first, then fetch project
  const supabase = await createClient();
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }
  const userId = user.id;

  // Check if user is linked to the project
  const { data: link, error: linkError } = await supabase
    .from('users_projects')
    .select('project_uuid')
    .eq('user_uuid', userId) // Corrected column name
    .eq('project_uuid', projectUuid)
    .maybeSingle();

  if (linkError || !link) {
    console.error(`Auth check failed for user ${userId} and project ${projectUuid}:`, linkError);
    throw new Error('Project not found or user lacks access');
  }

  // User has access, now fetch the project details
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('uuid', projectUuid)
    .single(); // Use single() as we know it exists

  // Error handling for the project fetch itself
  if (error || !project) {
    console.error(`Error fetching project details ${projectUuid} after auth check:`, error);
    throw new Error('Failed to fetch project details');
  }

  if (!project) {
    throw new Error('Project not found'); // Throw error if null (not found)
  }

  return project; // Return the single object
}
