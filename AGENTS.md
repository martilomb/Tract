<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Governed delivery

- Treat `.project/DELIVERY_PLAN.md` as approved scope and `.project/STATUS.md` as the current handoff; every change must trace to an existing requirement, milestone, release item, activation input, or demonstrated defect.
- Preserve provider-neutral, configurable enterprise behavior with tenant isolation, security, auditability, accounting integrity, and evidence controls; keep unsupported functionality disabled.
- Do not activate credentials, paid services, production resources, or irreversible changes without explicit approval; never commit secrets, customer documents, licensed data, or credentials.
- Maintain status, requirements traceability, milestones, and release-checklist evidence as work progresses, and validate with `pnpm check` plus relevant targeted tests before pushing.
- Use exactly one outcome label from `docs/release-readiness.md` in every delivery handoff; never infer final acceptance or production readiness from an increment's tests.
