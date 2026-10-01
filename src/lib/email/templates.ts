import type { DecisionCode } from "../types";

export interface TemplateContext {
  candidateName: string;
  roleTitle: string;
  reviewerName: string;
  companyName: string;
}

/**
 * Candidate-facing messages. They never include scores, tiers, AI reasoning or
 * comparisons to other people — only the human decision, in plain language.
 */
export function buildEmail(decision: DecisionCode, ctx: TemplateContext): { subject: string; body: string } {
  const first = ctx.candidateName.split(/\s+/)[0] || "there";
  const sign = `Best,\n${ctx.reviewerName}\nFounder, ${ctx.companyName}`;

  switch (decision) {
    case "move_forward":
      return {
        subject: `${ctx.companyName} — next step for the ${ctx.roleTitle} role`,
        body: `Hi ${first},

Thank you for applying for the ${ctx.roleTitle} role at ${ctx.companyName}. I've gone through your application and I'd like to meet for a conversation.

Could you reply with two or three times that work for you over the next week? The conversation will be about 45 minutes. We'll talk about the work you've done, how you approach problems close to operations, and what the role at ${ctx.companyName} involves.

The role is in-office in Mumbai. If you're not Mumbai-based, let me know so we can talk about relocation timing.

Looking forward to it.

${sign}`,
      };
    case "hold":
      return {
        subject: `${ctx.companyName} — update on your ${ctx.roleTitle} application`,
        body: `Hi ${first},

Thank you for applying for the ${ctx.roleTitle} role at ${ctx.companyName}. I wanted to give you an update rather than leave you waiting.

I'm still reviewing applications for this role and haven't made a decision on yours yet. I'll write to you again within the next two weeks, whichever way it goes.

Thank you for your patience.

${sign}`,
      };
    case "decline":
      return {
        subject: `${ctx.companyName} — your ${ctx.roleTitle} application`,
        body: `Hi ${first},

Thank you for applying for the ${ctx.roleTitle} role at ${ctx.companyName}, and for the time you put into your application.

After careful review, I've decided not to move forward with your application for this role. This was not an easy call, and it isn't a judgement on your ability.

We're growing quickly, and I'd be glad if you kept an eye on future openings at ${ctx.companyName}.

I wish you the very best in your search.

${sign}`,
      };
  }
}
