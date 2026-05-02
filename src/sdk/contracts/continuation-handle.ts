import {
	type ContinuationHandle as CoreContinuationHandle,
	type ProviderId as CoreProviderId,
	continuationHandleSchema,
	providerIdSchema,
} from "../../core/result-contracts.js";

export { continuationHandleSchema, providerIdSchema };

export type ProviderId = CoreProviderId;
export type ContinuationHandle = CoreContinuationHandle;
