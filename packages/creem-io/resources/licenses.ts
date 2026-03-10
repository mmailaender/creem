import { RequestFn } from "../types/core";
import {
  ActivateLicenseRequest,
  DeactivateLicenseRequest,
  ValidateLicenseRequest,
  License,
} from "../types";
import { required, isString } from "../validate";

export const licensesResource = (request: RequestFn) => ({
  activate: (params: ActivateLicenseRequest) => {
    required(params.key, "key");
    isString(params.key, "key");

    required(params.instanceName, "instanceName");
    isString(params.instanceName, "instanceName");

    return request<License>("POST", "/v1/licenses/activate", {
      key: params.key,
      instance_name: params.instanceName,
    });
  },
  deactivate: (params: DeactivateLicenseRequest) => {
    required(params.key, "key");
    isString(params.key, "key");

    required(params.instanceId, "instanceId");
    isString(params.instanceId, "instanceId");

    return request<License>("POST", "/v1/licenses/deactivate", {
      key: params.key,
      instance_id: params.instanceId,
    });
  },
  validate: (params: ValidateLicenseRequest) => {
    required(params.key, "key");
    isString(params.key, "key");

    required(params.instanceId, "instanceId");
    isString(params.instanceId, "instanceId");

    return request<License>("POST", "/v1/licenses/validate", {
      key: params.key,
      instance_id: params.instanceId,
    });
  },
});
