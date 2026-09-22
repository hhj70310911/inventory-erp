import { depthLabel } from "@/lib/agent-tree";
import type { AgentTeam } from "@/lib/agent-tree";
import { VipMemberRow } from "./VipMemberRow";

const HEADER_GRID =
  "lg:grid-cols-[minmax(10rem,1.2fr)_6.5rem_5.5rem_minmax(12rem,2fr)_3rem]";

type Props = {
  team: AgentTeam;
};

export function VipTeamSection({ team }: Props) {
  return (
    <section className="overflow-x-auto rounded border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-100 px-3 py-2">
        <h2 className="text-sm font-semibold text-neutral-800">
          團隊：{team.rootLabel}
          <span className="ml-2 font-normal text-neutral-500">
            （頂層代理 · {team.members.length} 人）
          </span>
        </h2>
      </div>
      <div
        className={`hidden min-w-[48rem] gap-x-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-500 lg:grid ${HEADER_GRID}`}
      >
        <span>成員</span>
        <span>指派費率</span>
        <span>稱呼</span>
        <span>後台備註</span>
        <span />
      </div>
      <ul className="min-w-[48rem] divide-y divide-neutral-200">
        {team.members.map((m) => (
          <VipMemberRow
            key={m.id}
            userId={m.id}
            email={m.email}
            displayName={m.displayName}
            adminNote={m.adminNote}
            myRatePercent={m.myRatePercent}
            depthLabel={depthLabel(m.depth, m.role)}
            memberLabel={m.memberLabel}
            indentLevel={m.indentLevel}
          />
        ))}
      </ul>
    </section>
  );
}
