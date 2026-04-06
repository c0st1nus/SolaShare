import { Elysia } from "elysia";
import { authPlugin, requireAuthenticatedUser } from "../../plugins/auth";
import {
  directUploadQuerySchema,
  directUploadResponseSchema,
  presignUploadBodySchema,
  presignUploadResponseSchema,
  uploadedFileParamsSchema,
} from "./contracts";
import { uploadsService } from "./service";

const getRequestOrigin = (request: Request) => new URL(request.url).origin;

export const uploadsRoutes = new Elysia({
  prefix: "/uploads",
  tags: ["Uploads"],
})
  .use(authPlugin)
  .post(
    "/presign",
    ({ auth, body, request }) =>
      uploadsService.presign(getRequestOrigin(request), requireAuthenticatedUser(auth).id, body),
    {
      body: presignUploadBodySchema,
      detail: {
        summary: "Create a short-lived direct upload URL",
      },
      response: {
        200: presignUploadResponseSchema,
      },
    },
  )
  .put(
    "/direct",
    ({ query, request }) => uploadsService.upload(query.token, getRequestOrigin(request), request),
    {
      query: directUploadQuerySchema,
      detail: {
        summary: "Upload a file using a short-lived upload token",
      },
      response: {
        200: directUploadResponseSchema,
      },
    },
  )
  .get(
    "/files/:purpose/:name",
    ({ params, set }) => {
      set.headers["cache-control"] = "private, max-age=300";
      return uploadsService.resolveFile(params.purpose, params.name);
    },
    {
      params: uploadedFileParamsSchema,
      detail: {
        summary: "Serve an uploaded private document file",
      },
    },
  );
