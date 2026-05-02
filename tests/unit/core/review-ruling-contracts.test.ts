import { describe, expect, test } from "vitest";

import {
	appendReviewRequest,
	appendRulingResponse,
	authorityBoundaryDecisionTypes,
	buildAuthorityBoundaryRulingRequest,
	createCallerInputHistory,
} from "../../../src/core/review-ruling";

describe("review and ruling contracts", () => {
	test("TC-3.4a through TC-3.4i support every required authority-boundary ruling category", () => {
		for (const decisionType of authorityBoundaryDecisionTypes) {
			expect(
				buildAuthorityBoundaryRulingRequest({
					id: `req-${decisionType}`,
					decisionType,
					question: `Question for ${decisionType}`,
					defaultRecommendation: "Pause and ask the caller.",
					evidence: ["evidence.md"],
				}),
			).toEqual(
				expect.objectContaining({
					decisionType,
				}),
			);
		}
	});

	test("tracks review requests and rulings in caller input history", () => {
		const withReview = appendReviewRequest(createCallerInputHistory(), {
			source: "impl-lead",
			decision: "reopen",
			summary: "Please reopen this story.",
			items: [
				{
					id: "review-001",
					severity: "major",
					concern: "Missing evidence",
					requiredResponse: "Add receipt-ready evidence.",
				},
			],
		});
		const withRuling = appendRulingResponse(withReview, {
			rulingRequestId: "req-001",
			decision: "approve",
			rationale: "Proceed with the safe option.",
			source: "impl-lead",
		});

		expect(withRuling.reviewRequests).toHaveLength(1);
		expect(withRuling.rulings).toHaveLength(1);
	});
});
