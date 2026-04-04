import { Elysia } from "elysia";
import { authPlugin, requireAuthenticatedUser } from "../../plugins/auth";
import {
  meClaimsResponseSchema,
  meKycCancelResponseSchema,
  meKycOverviewResponseSchema,
  meKycSubmitBodySchema,
  meKycSubmitResponseSchema,
  mePortfolioResponseSchema,
  meProfileResponseSchema,
  meProfileUpdateBodySchema,
} from "./contracts";
import { meService } from "./service";

export const meRoutes = new Elysia({ prefix: "/me", tags: ["Investor"] })
  .use(authPlugin)
  .get(
    "/profile",
    ({ auth }) => meService.getProfile(requireAuthenticatedUser(auth).id),
    {
      detail: {
        summary: "Get the authenticated user profile",
      },
      response: {
        200: meProfileResponseSchema,
      },
    },
  )
  .patch(
    "/profile",
    ({ auth, body }) =>
      meService.updateProfile(requireAuthenticatedUser(auth).id, body),
    {
      body: meProfileUpdateBodySchema,
      detail: {
        summary: "Update the authenticated user profile",
      },
      response: {
        200: meProfileResponseSchema,
      },
    },
  )
  .get(
    "/kyc",
    ({ auth }) => meService.getKycOverview(requireAuthenticatedUser(auth).id),
    {
      detail: {
        summary: "Get the authenticated user KYC workflow state",
      },
      response: {
        200: meKycOverviewResponseSchema,
      },
    },
  )
  .post(
    "/kyc/submit",
    ({ auth, body }) =>
      meService.submitKyc(requireAuthenticatedUser(auth).id, body),
    {
      body: meKycSubmitBodySchema,
      detail: {
        summary: "Submit investor KYC for review",
      },
      response: {
        200: meKycSubmitResponseSchema,
      },
    },
  )
  .post(
    "/kyc/cancel",
    ({ auth }) => meService.cancelKyc(requireAuthenticatedUser(auth).id),
    {
      detail: {
        summary: "Cancel the latest pending KYC submission",
      },
      response: {
        200: meKycCancelResponseSchema,
      },
    },
  )
  .get(
    "/portfolio",
    ({ auth }) => meService.getPortfolio(requireAuthenticatedUser(auth).id),
    {
      detail: {
        summary: "Get authenticated investor portfolio",
      },
      response: {
        200: mePortfolioResponseSchema,
      },
    },
  )
  .get(
    "/claims",
    ({ auth }) => meService.getClaims(requireAuthenticatedUser(auth).id),
    {
      detail: {
        summary: "Get authenticated investor claim history",
      },
      response: {
        200: meClaimsResponseSchema,
      },
    },
  );
