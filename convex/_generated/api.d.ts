/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addressHistory from "../addressHistory.js";
import type * as addressSearch from "../addressSearch.js";
import type * as cleanup from "../cleanup.js";
import type * as clerk from "../clerk.js";
import type * as clerkAdmin from "../clerkAdmin.js";
import type * as dailyReports from "../dailyReports.js";
import type * as dailyReports_log from "../dailyReports_log.js";
import type * as debugProjects from "../debugProjects.js";
import type * as debugTicket from "../debugTicket.js";
import type * as emailParsers from "../emailParsers.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as incidents from "../incidents.js";
import type * as migrateProjects from "../migrateProjects.js";
import type * as migrations from "../migrations.js";
import type * as migrations_addUserToOrg from "../migrations/addUserToOrg.js";
import type * as migrations_backfillPriorityTeams from "../migrations/backfillPriorityTeams.js";
import type * as migrations_backfillWOIDAssignments from "../migrations/backfillWOIDAssignments.js";
import type * as migrations_clearDevUsers from "../migrations/clearDevUsers.js";
import type * as migrations_createSampleTickets from "../migrations/createSampleTickets.js";
import type * as migrations_findAddressWithData from "../migrations/findAddressWithData.js";
import type * as migrations_findAddressesWithFiles from "../migrations/findAddressesWithFiles.js";
import type * as migrations_findAddressesWithTickets from "../migrations/findAddressesWithTickets.js";
import type * as migrations_findTicketsData from "../migrations/findTicketsData.js";
import type * as migrations_generateSampleTicketWOIDs from "../migrations/generateSampleTicketWOIDs.js";
import type * as migrations_seedOrganizations from "../migrations/seedOrganizations.js";
import type * as migrations_updateDevUserToken from "../migrations/updateDevUserToken.js";
import type * as migrations_updateUserTokenIdentifier from "../migrations/updateUserTokenIdentifier.js";
import type * as projects from "../projects.js";
import type * as roles from "../roles.js";
import type * as search from "../search.js";
import type * as seedOrgs from "../seedOrgs.js";
import type * as supervisor_project from "../supervisor_project.js";
import type * as taskForce_project from "../taskForce_project.js";
import type * as taskForce_user from "../taskForce_user.js";
import type * as taskForces from "../taskForces.js";
import type * as taskListTaskStatus from "../taskListTaskStatus.js";
import type * as taskListTasks from "../taskListTasks.js";
import type * as taskLists from "../taskLists.js";
import type * as ticketUpdates from "../ticketUpdates.js";
import type * as ticketWOIDs from "../ticketWOIDs.js";
import type * as toolboxTalkAssignments from "../toolboxTalkAssignments.js";
import type * as toolboxTalkSessions from "../toolboxTalkSessions.js";
import type * as toolboxTalks from "../toolboxTalks.js";
import type * as types from "../types.js";
import type * as updateOrgSlug from "../updateOrgSlug.js";
import type * as users from "../users.js";
import type * as woidAssignments from "../woidAssignments.js";
import type * as workOrders from "../workOrders.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  addressHistory: typeof addressHistory;
  addressSearch: typeof addressSearch;
  cleanup: typeof cleanup;
  clerk: typeof clerk;
  clerkAdmin: typeof clerkAdmin;
  dailyReports: typeof dailyReports;
  dailyReports_log: typeof dailyReports_log;
  debugProjects: typeof debugProjects;
  debugTicket: typeof debugTicket;
  emailParsers: typeof emailParsers;
  files: typeof files;
  http: typeof http;
  incidents: typeof incidents;
  migrateProjects: typeof migrateProjects;
  migrations: typeof migrations;
  "migrations/addUserToOrg": typeof migrations_addUserToOrg;
  "migrations/backfillPriorityTeams": typeof migrations_backfillPriorityTeams;
  "migrations/backfillWOIDAssignments": typeof migrations_backfillWOIDAssignments;
  "migrations/clearDevUsers": typeof migrations_clearDevUsers;
  "migrations/createSampleTickets": typeof migrations_createSampleTickets;
  "migrations/findAddressWithData": typeof migrations_findAddressWithData;
  "migrations/findAddressesWithFiles": typeof migrations_findAddressesWithFiles;
  "migrations/findAddressesWithTickets": typeof migrations_findAddressesWithTickets;
  "migrations/findTicketsData": typeof migrations_findTicketsData;
  "migrations/generateSampleTicketWOIDs": typeof migrations_generateSampleTicketWOIDs;
  "migrations/seedOrganizations": typeof migrations_seedOrganizations;
  "migrations/updateDevUserToken": typeof migrations_updateDevUserToken;
  "migrations/updateUserTokenIdentifier": typeof migrations_updateUserTokenIdentifier;
  projects: typeof projects;
  roles: typeof roles;
  search: typeof search;
  seedOrgs: typeof seedOrgs;
  supervisor_project: typeof supervisor_project;
  taskForce_project: typeof taskForce_project;
  taskForce_user: typeof taskForce_user;
  taskForces: typeof taskForces;
  taskListTaskStatus: typeof taskListTaskStatus;
  taskListTasks: typeof taskListTasks;
  taskLists: typeof taskLists;
  ticketUpdates: typeof ticketUpdates;
  ticketWOIDs: typeof ticketWOIDs;
  toolboxTalkAssignments: typeof toolboxTalkAssignments;
  toolboxTalkSessions: typeof toolboxTalkSessions;
  toolboxTalks: typeof toolboxTalks;
  types: typeof types;
  updateOrgSlug: typeof updateOrgSlug;
  users: typeof users;
  woidAssignments: typeof woidAssignments;
  workOrders: typeof workOrders;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
