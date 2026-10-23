import mongoose, { Connection } from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const RAW_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://aids23anmolsoni_db_user:7QlJdlhPLInSZgoc@fullstack.tlfwh2o.mongodb.net';


function getClusterBaseUri(uri: string): string {
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/[^/?#]+)/i);
  return match ? match[1] : uri.split('?')[0].replace(/\/+$/, '');
}

const CLUSTER_BASE_URI = getClusterBaseUri(RAW_URI);

console.log(`[Database] Initializing multi-database connections to cluster: ${CLUSTER_BASE_URI}`);


export const usersDb: Connection = mongoose.createConnection(
  `${CLUSTER_BASE_URI}/users_db?retryWrites=true&w=majority`
);

export const projectsDb: Connection = mongoose.createConnection(
  `${CLUSTER_BASE_URI}/projects_db?retryWrites=true&w=majority`
);

export const tasksDb: Connection = mongoose.createConnection(
  `${CLUSTER_BASE_URI}/tasks_db?retryWrites=true&w=majority`
);

export const pmPlatformDb: Connection = mongoose.createConnection(
  `${CLUSTER_BASE_URI}/pm_platform?retryWrites=true&w=majority`
);

usersDb.on('connected', () => console.log('[Database: Users] Connected to users_db'));
projectsDb.on('connected', () => console.log('[Database: Projects] Connected to projects_db'));
tasksDb.on('connected', () => console.log('[Database: Tasks] Connected to tasks_db'));
pmPlatformDb.on('connected', () => console.log('[Database: Main] Connected to pm_platform'));

usersDb.on('error', (err) => console.error('[Database: Users] Error:', err));
projectsDb.on('error', (err) => console.error('[Database: Projects] Error:', err));
tasksDb.on('error', (err) => console.error('[Database: Tasks] Error:', err));
pmPlatformDb.on('error', (err) => console.error('[Database: Main] Error:', err));


export async function mirrorSave(collectionName: string, doc: any) {
  try {
    const raw = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
    if (!raw || !raw._id) return;
    await pmPlatformDb.collection(collectionName).replaceOne(
      { _id: raw._id },
      raw,
      { upsert: true }
    );
    console.log(`[Mongo Sync] Synced ${collectionName} document to pm_platform: ${raw._id}`);
  } catch (err) {
    console.error(`[Mongo Sync Error] Failed mirroring to pm_platform.${collectionName}:`, err);
  }
}

export async function mirrorDelete(collectionName: string, id: any) {
  try {
    const objId = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
    await pmPlatformDb.collection(collectionName).deleteOne({ _id: objId });
    console.log(`[Mongo Sync] Deleted ${collectionName} document from pm_platform: ${objId}`);
  } catch (err) {
    console.error(`[Mongo Sync Error] Failed deleting from pm_platform.${collectionName}:`, err);
  }
}

export async function mirrorDeleteMany(collectionName: string, filter: any) {
  try {
    await pmPlatformDb.collection(collectionName).deleteMany(filter);
    console.log(`[Mongo Sync] Bulk deleted from pm_platform.${collectionName}`);
  } catch (err) {
    console.error(`[Mongo Sync Error] Failed bulk deleting from pm_platform.${collectionName}:`, err);
  }
}

export async function waitForDbConnections(): Promise<void> {
  await Promise.all([
    usersDb.asPromise(),
    projectsDb.asPromise(),
    tasksDb.asPromise(),
    pmPlatformDb.asPromise(),
  ]);
  console.log('[Database] All databases (users_db, projects_db, tasks_db, and pm_platform) connected successfully.');

  
  try {
    const usersInUsersDb = await usersDb.collection('users').find({}).toArray();
    for (const u of usersInUsersDb) {
      await pmPlatformDb.collection('users').replaceOne({ _id: u._id }, u, { upsert: true });
    }
    const projectsInProjectsDb = await projectsDb.collection('projects').find({}).toArray();
    for (const p of projectsInProjectsDb) {
      await pmPlatformDb.collection('projects').replaceOne({ _id: p._id }, p, { upsert: true });
    }
    console.log(`[Database Sync] Synced ${usersInUsersDb.length} users and ${projectsInProjectsDb.length} projects to pm_platform.`);
  } catch (syncErr) {
    console.warn('[Database Sync Warning]', syncErr);
  }
}
