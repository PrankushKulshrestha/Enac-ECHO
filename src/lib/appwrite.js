import { Client, Account, Databases, Storage } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || 'your-project-id');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { client };

// Database & Collection IDs
export const DB_ID = import.meta.env.VITE_APPWRITE_DB_ID || 'echo-db';
export const COLLECTIONS = {
  USERS: 'users',
  SUBMISSIONS: 'submissions',
  BINS: 'bins',
  REWARDS: 'rewards',
};
