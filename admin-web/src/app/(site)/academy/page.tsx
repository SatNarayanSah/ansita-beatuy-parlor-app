"use client";

import { AnimatePresence, motion } from "motion/react";
import { Award, BookOpen, CalendarDays, ChevronDown, Clock, GraduationCap, Layers, Users } from "lucide-react";
import { useState } from "react";
import { EnquiryForm, SUBJECTS } from "@/components/site/enquiry-form";
import { Container, PageHero, Reveal } from "@/components/site/section";
import { Badge, Button, EmptyState, ErrorState, Modal, Skeleton } from "@/components/ui";
import { formatDate, label, money, time12 } from "@/lib/format";
import { useBatchAvailability, useCourses, useStaff } from "@/lib/queries";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/utils";

function Batches({ course }: { course: Course }) {
  const availability = useBatchAvailability(course.id);
  const list = (availability.data ?? []).filter((b) => b.batch.status !== "completed");
  if (availability.isLoading) return <Skeleton className="h-20" />;
  if (!list.length) return <p className="text-sm text-muted">No batches are scheduled right now. Enquire and we&apos;ll let you know when the next one opens.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {list.map(({ batch, seatsLeft, seatsTaken, isFull }, i) => {
        const pct = batch.seats ? Math.min(100, (seatsTaken / batch.seats) * 100) : 0;
        return (
          <motion.div
            key={batch.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-line bg-bg/60 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-ink">{batch.name}</p>
              <Badge tone={isFull ? "red" : batch.status === "ongoing" ? "green" : "blue"}>{isFull ? "Full" : label(batch.status)}</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(batch.startDate, "d MMM")} – {formatDate(batch.endDate, "d MMM yyyy")}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3.5 w-3.5" />
              {batch.days.map((d) => label(d)).join(", ")} · {time12(batch.startTime)} – {time12(batch.endTime)}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
              <motion.div
                className={cn("h-full rounded-full", isFull ? "bg-danger" : pct > 70 ? "bg-gold" : "bg-gradient-to-r from-primary to-plum")}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              />
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-ink-2">
              {isFull ? "No seats left" : `${seatsLeft} of ${batch.seats} seats left`}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

function CourseCard({ course, instructor, index, onEnquire }: { course: Course; instructor?: string; index: number; onEnquire: () => void }) {
  const [open, setOpen] = useState(false);
  const [openModule, setOpenModule] = useState<string | null>(null);
  const totalHours = course.syllabus.reduce((sum, m) => sum + (m.hours || 0), 0);

  return (
    <Reveal delay={Math.min(index, 6) * 0.06}>
      <motion.article layout className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-shadow hover:shadow-lift">
        <motion.div layout="position" className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-plum to-[#35222f] text-white shadow-lg">
            {course.image && /^https?:\/\//.test(course.image) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <GraduationCap className="h-8 w-8 text-[#f7edd8]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="plum">{label(course.type)}</Badge>
              <Badge tone="gold">{label(course.level)}</Badge>
              {course.certificate && (
                <Badge tone="green">
                  <Award className="h-3 w-3" /> Certificate
                </Badge>
              )}
            </div>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">{course.title}</h3>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {course.duration}
              </span>
              {totalHours > 0 && (
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" /> {course.syllabus.length} {course.syllabus.length === 1 ? "module" : "modules"} · {totalHours} {totalHours === 1 ? "hr" : "hrs"}
                </span>
              )}
              {instructor && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Led by {instructor}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <p className="font-display text-2xl font-semibold text-primary-dark">{money(course.fee)}</p>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex cursor-pointer items-center gap-1 text-sm font-medium text-primary hover:underline"
              aria-expanded={open}
            >
              {open ? "Hide details" : "View details"}
              <motion.span animate={{ rotate: open ? 180 : 0 }}>
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            </button>
          </div>
        </motion.div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 28 }}
              className="overflow-hidden"
            >
              <div className="grid gap-6 border-t border-line p-4 lg:grid-cols-2">
                <div>
                  {course.description && <p className="mb-4 text-sm leading-relaxed text-ink-2">{course.description}</p>}
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-gold-text uppercase">
                    <BookOpen className="h-4 w-4" /> Syllabus
                  </h4>
                  {course.syllabus.length === 0 ? (
                    <p className="text-sm text-muted">The full syllabus is shared on enquiry.</p>
                  ) : (
                    <ol className="flex flex-col gap-2">
                      {course.syllabus.map((module, i) => {
                        const expanded = openModule === module.id;
                        return (
                          <li key={module.id} className="overflow-hidden rounded-2xl border border-line">
                            <button
                              type="button"
                              onClick={() => setOpenModule(expanded ? null : module.id)}
                              className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-alt"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-xs font-bold text-primary-dark">{i + 1}</span>
                              <span className="flex-1 text-sm font-medium text-ink">{module.title}</span>
                              {module.hours > 0 && <span className="text-xs text-muted">{module.hours} h</span>}
                              <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
                                <ChevronDown className="h-4 w-4 text-muted" />
                              </motion.span>
                            </button>
                            <AnimatePresence initial={false}>
                              {expanded && (
                                <motion.ul
                                  initial={{ height: 0 }}
                                  animate={{ height: "auto" }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden bg-bg/50"
                                >
                                  <div className="flex flex-wrap gap-1.5 px-4 py-3">
                                    {module.topics.length ? (
                                      module.topics.map((topic) => (
                                        <li key={topic} className="rounded-full bg-surface px-2.5 py-1 text-xs text-ink-2 shadow-soft">
                                          {topic}
                                        </li>
                                      ))
                                    ) : (
                                      <li className="text-xs text-muted">Topics shared in class.</li>
                                    )}
                                  </div>
                                </motion.ul>
                              )}
                            </AnimatePresence>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-gold-text uppercase">
                    <CalendarDays className="h-4 w-4" /> Upcoming batches
                  </h4>
                  <Batches course={course} />
                  <Button className="mt-4 w-full sm:w-auto" size="lg" onClick={onEnquire}>
                    Enquire to join
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>
    </Reveal>
  );
}

export default function AcademyPage() {
  const courses = useCourses();
  const staff = useStaff();
  const [enquiring, setEnquiring] = useState<Course | null>(null);
  const staffNames = new Map((staff.data ?? []).map((s) => [s.id, s.name]));
  const list = (courses.data ?? []).filter((c) => c.isActive);

  return (
    <>
      <title>Academy · Ansita Beauty Parlour</title>
      <PageHero
        eyebrow="Ansita Academy"
        title={
          <>
            Learn from the <span className="text-gradient">artists</span>
          </>
        }
        subtitle="Certification courses, diplomas and short workshops in small batches, with plenty of hands-on practice."
      >
        <div className="mx-auto grid max-w-xl grid-cols-3 gap-3">
          {[
            { icon: Users, text: "Small batches" },
            { icon: Award, text: "Certified" },
            { icon: GraduationCap, text: "Hands-on" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface/70 p-3 text-xs font-medium text-ink-2 backdrop-blur">
              <Icon className="h-5 w-5 text-primary" />
              {text}
            </div>
          ))}
        </div>
      </PageHero>

      <Container className="flex flex-col gap-4 py-8">
        {courses.isError ? (
          <ErrorState error={courses.error} onRetry={() => courses.refetch()} />
        ) : courses.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)
        ) : list.length === 0 ? (
          <EmptyState icon={<GraduationCap className="h-7 w-7" />} title="No courses open yet" message="New courses will be announced here soon." />
        ) : (
          list.map((course, i) => (
            <CourseCard key={course.id} course={course} instructor={staffNames.get(course.instructor)} index={i} onEnquire={() => setEnquiring(course)} />
          ))
        )}
      </Container>

      <Modal
        open={!!enquiring}
        onClose={() => setEnquiring(null)}
        title="Enquire to join"
        description={enquiring ? `${enquiring.title} · ${money(enquiring.fee)}` : undefined}
        className="sm:max-w-xl"
      >
        {enquiring && (
          <EnquiryForm
            key={enquiring.id}
            defaultSubject={`Course: ${enquiring.title}`}
            subjects={SUBJECTS}
            onDone={() => setEnquiring(null)}
          />
        )}
      </Modal>
    </>
  );
}
