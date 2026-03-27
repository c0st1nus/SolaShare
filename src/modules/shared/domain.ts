import { z } from "zod";
import {
  assetDocumentTypeEnum,
  assetStatusEnum,
  energyTypeEnum,
  revenueSourceTypeEnum,
  revenueStatusEnum,
  saleStatusEnum,
  storageProviderEnum,
  userRoleEnum,
  verificationDecisionOutcomeEnum,
  verificationRequestStatusEnum,
} from "../../db/schema";

export const userRoleSchema = z.enum(userRoleEnum.enumValues);
export const energyTypeSchema = z.enum(energyTypeEnum.enumValues);
export const assetStatusSchema = z.enum(assetStatusEnum.enumValues);
export const assetDocumentTypeSchema = z.enum(assetDocumentTypeEnum.enumValues);
export const storageProviderSchema = z.enum(storageProviderEnum.enumValues);
export const saleStatusSchema = z.enum(saleStatusEnum.enumValues);
export const revenueSourceTypeSchema = z.enum(revenueSourceTypeEnum.enumValues);
export const revenueStatusSchema = z.enum(revenueStatusEnum.enumValues);
export const verificationRequestStatusSchema = z.enum(verificationRequestStatusEnum.enumValues);
export const verificationDecisionOutcomeSchema = z.enum(verificationDecisionOutcomeEnum.enumValues);
