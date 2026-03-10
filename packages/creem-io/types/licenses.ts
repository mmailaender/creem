import { BaseEntity } from "./general";

/**
 * License instance entity
 */
export interface LicenseInstance extends BaseEntity {
  /** String representing the object's type */
  object: "license-instance";
  /** The name of the license instance */
  name: string;
  /** The status of the license instance */
  status: "active" | "deactivated";
  /** The creation date of the license instance */
  createdAt: Date;
}

/**
 * License entity
 */
export interface License extends BaseEntity {
  /** String representing the object's type */
  object: "license";
  /** The current status of the license key */
  status: "inactive" | "active" | "expired" | "disabled";
  /** The license key */
  key: string;
  /** The number of instances that this license key was activated */
  activation: number;
  /** The activation limit. Null if activations are unlimited */
  activationLimit: number | null;
  /** The date the license key expires. Null if no expiration */
  expiresAt: Date | null;
  /** The creation date of the license key */
  createdAt: Date;
  /** Associated license instance */
  instance?: LicenseInstance | null;
}

/**
 * Request payload for activating a license
 */
export interface ActivateLicenseRequest {
  /** The license key to activate */
  key: string;
  /** The name of the instance to activate */
  instanceName: string;
}

/**
 * Request payload for deactivating a license
 */
export interface DeactivateLicenseRequest {
  /** The license key to deactivate */
  key: string;
  /** The instance ID to deactivate */
  instanceId: string;
}

/**
 * Request payload for validating a license
 */
export interface ValidateLicenseRequest {
  /** The license key to validate */
  key: string;
  /** The instance ID to validate */
  instanceId: string;
}
