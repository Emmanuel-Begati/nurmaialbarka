import { className, formatDate, RATING_LABELS, studentName, termLabel } from "@/lib/format";
import { ordinal } from "@/lib/grading";
import { photoUrl } from "@/lib/photo-url";
import type { reportCard } from "@/lib/report";
import { Logo } from "@/components/logo";

type Data = NonNullable<Awaited<ReturnType<typeof reportCard>>>;

const r = (n: number | null | undefined) => (n ? RATING_LABELS[n] : "—");

export function ReportCard({ d }: { d: Data }) {
  const { student, term, settings, quran, report } = d;
  return (
    <div className="print-sheet mx-3 my-4 max-w-4xl break-after-page rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm sm:mx-auto sm:my-6 sm:p-8">
      {/* Header */}
      <div className="border-b-2 border-brand-700 pb-3 text-center">
        <Logo className="mx-auto mb-2 h-16 sm:h-20" />
        <h1 className="text-lg font-bold text-brand-800 uppercase sm:text-2xl">{settings?.name}</h1>
        <p className="text-xs text-gray-600">{settings?.address}</p>
        {settings?.motto && <p className="text-xs text-gray-500 italic">&ldquo;{settings.motto}&rdquo;</p>}
        <p className="mt-2 font-semibold tracking-wide">STUDENT TERMLY REPORT: {termLabel(term).toUpperCase()}</p>
      </div>

      {/* Student info */}
      <div className="mt-4 flex items-start gap-4">
      {student.photoAt && (
        // eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image route
        <img
          src={photoUrl("student", student.id, student.photoAt)!}
          alt={`Photo of ${studentName(student)}`}
          className="h-24 w-20 shrink-0 rounded border border-gray-300 object-cover sm:h-28 sm:w-24"
        />
      )}
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-1 min-[480px]:grid-cols-2 sm:grid-cols-3 print:grid-cols-3">
        <Info k="Name" v={studentName(student)} />
        <Info k="Adm. No." v={student.admissionNo} />
        <Info k="Class" v={student.class ? className(student.class) : "—"} />
        <Info k="Gender" v={student.gender === "M" ? "Male" : "Female"} />
        <Info k="Position" v={d.position ? `${ordinal(d.position)} of ${d.classSize}` : "—"} />
        <Info k="Average" v={d.subjects.length ? `${d.average.toFixed(1)}% (${d.overallGrade.grade})` : "—"} />
        <Info k="Days opened" v={String(d.attendance.opened)} />
        <Info k="Days present" v={String(d.attendance.present)} />
        <Info k="Days absent" v={String(d.attendance.absent)} />
      </div>
      </div>

      {/* Academic */}
      <h2 className="mt-5 mb-1 font-semibold text-brand-800">Academic performance</h2>
      <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[560px] border-collapse text-xs print:min-w-0">
        <thead>
          <tr className="bg-brand-50">
            <Th left>Subject</Th>
            {d.components.map((c) => (
              <Th key={c.key}>
                {c.label} ({c.maxScore})
              </Th>
            ))}
            <Th>Total (100)</Th>
            <Th>Grade</Th>
            <Th>Position</Th>
            <Th>Class avg</Th>
            <Th left>Remark</Th>
          </tr>
        </thead>
        <tbody>
          {d.subjects.map((s) => (
            <tr key={s.name}>
              <Td left>{s.name}</Td>
              {d.components.map((c) => (
                <Td key={c.key}>{s.components[c.key] ?? "—"}</Td>
              ))}
              <Td bold>{s.total}</Td>
              <Td bold>{s.grade}</Td>
              <Td>{s.position ? ordinal(s.position) : "—"}</Td>
              <Td>{s.classAverage.toFixed(1)}</Td>
              <Td left>{s.remark}</Td>
            </tr>
          ))}
          {d.subjects.length === 0 && (
            <tr>
              <td colSpan={99} className="border border-gray-300 py-3 text-center text-gray-500">
                No scores recorded.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {/* Qur'an */}
        <div>
          <h2 className="mb-1 font-semibold text-brand-800">Qur&apos;an memorisation (Hifz)</h2>
          <table className="w-full border-collapse text-xs">
            <tbody>
              <Row k="Memorised this term" v={quran ? `${quran.memorisedFrom || "—"} → ${quran.memorisedTo || "—"}` : "—"} />
              <Row k="Current juz" v={quran?.currentJuz ?? "—"} />
              <Row k="Total juz memorised" v={quran ? `${quran.totalJuz}` : "—"} />
              <Row k="Hifz (memorisation)" v={r(quran?.hifzRating)} />
              <Row k="Tajweed" v={r(quran?.tajweedRating)} />
              <Row k="Recitation / fluency" v={r(quran?.recitationRating)} />
              <Row k="Qur'an teacher's remark" v={quran?.remark || "—"} />
            </tbody>
          </table>
        </div>
        {/* Affective + key */}
        <div>
          <h2 className="mb-1 font-semibold text-brand-800">Character &amp; conduct</h2>
          <table className="w-full border-collapse text-xs">
            <tbody>
              <Row k="Conduct (Akhlaq)" v={r(report?.conduct)} />
              <Row k="Punctuality" v={r(report?.punctuality)} />
              <Row k="Neatness" v={r(report?.neatness)} />
            </tbody>
          </table>
          <h2 className="mt-3 mb-1 font-semibold text-brand-800">Grading key</h2>
          <p className="text-xs text-gray-600">{d.bands.map((b) => `${b.grade} (${b.min}–${b.max}) ${b.remark}`).join(" · ")}</p>
        </div>
      </div>

      {/* Remarks */}
      <div className="mt-5 space-y-3">
        <Remark k="Class teacher's remark" v={report?.teacherRemark} sign={student.class?.classTeacher ? `${student.class.classTeacher.title} ${student.class.classTeacher.fullName}` : ""} />
        <Remark k="Principal's remark" v={report?.principalRemark} sign={settings?.principalName ?? ""} />
      </div>
      <p className="mt-4 text-xs text-gray-600">
        Next term begins: <strong>{formatDate(term.nextTermBegins)}</strong>
      </p>
    </div>
  );
}

const Info = ({ k, v }: { k: string; v: string }) => (
  <div className="flex gap-2 border-b border-dotted border-gray-300 py-0.5">
    <span className="text-gray-500">{k}:</span>
    <span className="font-medium">{v}</span>
  </div>
);
const Th = ({ children, left }: { children: React.ReactNode; left?: boolean }) => (
  <th className={`border border-gray-300 px-2 py-1 font-semibold ${left ? "text-left" : "text-center"}`}>{children}</th>
);
const Td = ({ children, left, bold }: { children: React.ReactNode; left?: boolean; bold?: boolean }) => (
  <td className={`border border-gray-300 px-2 py-1 ${left ? "text-left" : "text-center"} ${bold ? "font-semibold" : ""}`}>{children}</td>
);
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <tr>
    <td className="w-1/2 border border-gray-300 bg-gray-50 px-2 py-1">{k}</td>
    <td className="border border-gray-300 px-2 py-1">{v}</td>
  </tr>
);
const Remark = ({ k, v, sign }: { k: string; v?: string; sign: string }) => (
  <div className="rounded border border-gray-300 p-2">
    <div className="text-xs text-gray-500">{k}</div>
    <div className="min-h-5">{v || ""}</div>
    <div className="mt-1 text-right text-xs text-gray-500">{sign}</div>
  </div>
);
