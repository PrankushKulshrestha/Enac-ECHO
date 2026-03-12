import { Client, Account, Databases, Storage, Functions, ID, Query, Permission, Role } from 'appwrite';

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export { client };
export const account   = new Account(client);
export const databases = new Databases(client);
export const storage   = new Storage(client);
export const functions = new Functions(client);

export { ID, Query, Permission, Role };

export const DB_ID = import.meta.env.VITE_APPWRITE_DB_ID;

export const COLLECTIONS = {
  COUPON_CODES:        'coupon_codes',
  USERS:               'users',
  SUBMISSIONS:         'submissions',
  REWARDS:             'rewards',
  REDEMPTIONS:         'redemptions',
  GROUPS:              'groups',
  INVITES:             'invites',
  GROUP_ACHIEVEMENTS:  'group_achievements',
};
