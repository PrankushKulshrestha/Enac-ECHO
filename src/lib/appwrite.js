import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account   = new Account(client);
export const databases = new Databases(client);
export const storage   = new Storage(client);
export { ID, Query };

export const DB_ID = import.meta.env.VITE_APPWRITE_DB_ID;

export const COLLECTIONS = {
  USERS:       'users',
  SUBMISSIONS: 'submissions',
  REWARDS:     'rewards',
  REDEMPTIONS: 'redemptions',
  GROUPS:      'groups',
  INVITES:     'invites',
};