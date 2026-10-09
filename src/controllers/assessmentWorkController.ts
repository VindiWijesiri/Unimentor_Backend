import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import {
  ASSESSMENT_KINDS,
  AssessmentAttempt,
  AssessmentGrowth,
  AssessmentPaper,
  CatalogMaterial,
  type AssessmentKind,
  type WorkAnswer,
  type WorkQuestion,
} from '../models/assessmentWork';
import { ensureAssessmentCatalog, ensureStudentAssessmentExtras } from '../services/seedAssessmentWork';
import { notify } from '../services/notify';

function words(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function gradeLabel(score: number, max: number): string {
  const pct = max ? (score / max) * 100 : 0;
  if (pct >= 90) return 'Grade A';
  if (pct >= 85) return 'Grade A-';
  if (pct >= 80) return 'Grade B+';
  if (pct >= 75) return 'Grade B';
  if (pct >= 70) return 'Grade B-';
  if (pct >= 60) return 'Grade C';
  return 'Grade D';
}

function sameSet(left: string[] = [], right: string[] = []): boolean {
  const a = [...left].sort().join('|');
  const b = [...right].sort().join('|');
  return a === b && a.length > 0;
}

function blankOk(given: string | undefined, accepted: string[] = []): boolean {
  const value = (given ?? '').trim().toLowerCase();
  return accepted.some((item) => item.trim().toLowerCase() === value);
}

type GradeRow = {
  questionId: string;
  prompt: string;
  awarded: number;
  max: number;
  correct: boolean;
  note: string;
  expected?: string;
  given?: string;
  manual: boolean;
};

function gradeQuestion(question: WorkQuestion, answer: WorkAnswer | undefined): GradeRow {
  const max = question.marks;
  const key = question.key ?? {};
  const base = { questionId: question.id, prompt: question.prompt, max, manual: Boolean(question.manual) };

  if (question.manual || question.kind === 'essay' || question.kind === 'file_project') {
    const given = question.kind === 'essay'
      ? `${words(answer?.text ?? '')} words`
      : `${answer?.files?.length ?? 0} file(s)`;
    return { ...base, awarded: 0, correct: false, note: 'Awaiting tutor review', given };
  }

  if (question.kind === 'mcq' || question.kind === 'scenario') {
    const got = answer?.choiceIds ?? [];
    const ok = sameSet(got, key.choiceIds);
    return {
      ...base, awarded: ok ? max : 0, correct: ok,
      note: ok ? 'Correct option' : 'Incorrect option',
      expected: (key.choiceIds ?? []).join(', '),
      given: got.join(', ') || 'No selection',
    };
  }

  if (question.kind === 'true_false') {
    const ok = answer?.boolean === key.boolean && answer?.boolean !== null && answer?.boolean !== undefined;
    return {
      ...base, awarded: ok ? max : 0, correct: ok,
      note: ok ? 'Correct' : 'Incorrect',
      expected: key.boolean ? 'True' : 'False',
      given: answer?.boolean === undefined || answer?.boolean === null ? 'No selection' : answer.boolean ? 'True' : 'False',
    };
  }

  if (question.kind === 'short_answer') {
    const given = (answer?.text ?? '').trim();
    const expected = key.text ?? '';
    const numeric = Number(given);
    const target = Number(expected);
    const ok = Number.isFinite(numeric) && Number.isFinite(target)
      ? Math.abs(numeric - target) <= (key.tolerance ?? 0)
      : given.toLowerCase() === expected.toLowerCase();
    return { ...base, awarded: ok ? max : 0, correct: ok, note: ok ? 'Matches the expected value' : 'Does not match', expected, given: given || 'Blank' };
  }

  if (question.kind === 'fill_blank') {
    const blanks = key.blanks ?? {};
    const ids = Object.keys(blanks);
    const correctCount = ids.filter((id) => blankOk(answer?.blanks?.[id], blanks[id])).length;
    const awarded = ids.length ? Math.round((correctCount / ids.length) * max * 10) / 10 : 0;
    return {
      ...base, awarded, correct: correctCount === ids.length && ids.length > 0,
      note: `${correctCount} of ${ids.length} blanks`,
      expected: ids.map((id) => blanks[id][0]).join(' · '),
      given: ids.map((id) => answer?.blanks?.[id] || '—').join(' · '),
    };
  }

  if (question.kind === 'matching') {
    const expected = key.matches ?? {};
    const ids = Object.keys(expected);
    const correctCount = ids.filter((id) => answer?.matches?.[id] === expected[id]).length;
    const awarded = ids.length ? Math.round((correctCount / ids.length) * max * 10) / 10 : 0;
    return { ...base, awarded, correct: correctCount === ids.length && ids.length > 0, note: `${correctCount} of ${ids.length} pairs`, expected: `${ids.length} pairs`, given: `${Object.keys(answer?.matches ?? {}).length} linked` };
  }

  if (question.kind === 'ordering') {
    const expected = key.order ?? [];
    const given = answer?.order ?? [];
    const ok = expected.length > 0 && expected.every((id, index) => given[index] === id);
    return { ...base, awarded: ok ? max : 0, correct: ok, note: ok ? 'Sequence matches' : 'Sequence differs', expected: expected.join(' → '), given: given.join(' → ') || 'Not ordered' };
  }

  if (question.kind === 'drag_drop') {
    const expected = key.placements ?? {};
    const ids = Object.keys(expected);
    const correctCount = ids.filter((id) => answer?.placements?.[id] === expected[id]).length;
    const awarded = ids.length ? Math.round((correctCount / ids.length) * max * 10) / 10 : 0;
    return { ...base, awarded, correct: correctCount === ids.length && ids.length > 0, note: `${correctCount} of ${ids.length} tokens`, expected: `${ids.length} placements`, given: `${Object.keys(answer?.placements ?? {}).length} placed` };
  }

  if (question.kind === 'coding') {
    const code = answer?.text ?? '';
    const needles = key.includes ?? [];
    const correctCount = needles.filter((needle) => code.toLowerCase().includes(needle.toLowerCase())).length;
    const awarded = needles.length ? Math.round((correctCount / needles.length) * max * 10) / 10 : 0;
    return { ...base, awarded, correct: correctCount === needles.length && needles.length > 0, note: `${correctCount} of ${needles.length} checks passed`, expected: needles.join(', '), given: code.trim() ? 'Code submitted' : 'Empty editor' };
  }

  return { ...base, awarded: 0, correct: false, note: 'No automatic grader', given: '' };
}

function publicQuestion(question: WorkQuestion, reveal: boolean) {
  if (reveal) return question;
  const copy = { ...question };
  delete copy.key;
  return copy;
}

function secondsLeft(startedAt: Date | undefined, durationMin: number): number {
  if (!durationMin) return 0;
  const elapsed = startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0;
  return Math.max(0, durationMin * 60 - elapsed);
}

function actionFor(status: string, kind: AssessmentKind, urgent: boolean): string {
  if (status === 'graded') return 'Review Answers & Feedback';
  if (status === 'submitted') return 'View Submission';
  if (status === 'in_progress') return kind === 'coding' ? 'Continue Coding Challenge' : 'Resume';
  if (kind === 'scenario') return 'View Details & Brief';
  if (urgent) return 'Start Assessment Now';
  return 'Start';
}

function bucketFor(status: string, urgent: boolean, dueLabel: string): 'dueSoon' | 'inProgress' | 'completed' | 'upcoming' {
  if (status === 'graded' || status === 'submitted') return 'completed';
  if (status === 'in_progress') return 'inProgress';
  if (urgent || /tomorrow|due in|friday/i.test(dueLabel)) return 'dueSoon';
  return 'upcoming';
}

async function studentReady(req: AuthRequest): Promise<string> {
  const studentId = String(req.userId);
  await ensureStudentAssessmentExtras(studentId);
  return studentId;
}

export async function getAssessmentCenter(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await studentReady(req);
    const [growth, papers, attempts] = await Promise.all([
      AssessmentGrowth.findOne({ studentId }),
      AssessmentPaper.find({ status: { $in: ['published', 'closed'] } }).sort({ createdAt: 1 }),
      AssessmentAttempt.find({ studentId }),
    ]);
    const byPaper = new Map(attempts.map((item) => [String(item.paperId), item]));
    const items = papers
      .filter((paper) => {
        const assigned = (paper.assignedStudentIds ?? []).map((id: any) => String(id));
        const forStudent = assigned.length === 0 || assigned.includes(studentId);
        return forStudent && (paper.status === 'published' || byPaper.has(String(paper._id)));
      })
      .map((paper) => {
        const attempt = byPaper.get(String(paper._id));
        const status = attempt?.status ?? 'not_started';
        const bucket = bucketFor(status, paper.urgent, paper.dueLabel);
        return {
          paperId: paper._id,
          title: paper.title,
          moduleCode: paper.moduleCode,
          moduleName: paper.moduleName,
          kind: paper.kind,
          kindLabel: paper.kindLabel,
          chips: paper.chips,
          dueLabel: paper.dueLabel,
          detail: paper.detail,
          status,
          progress: attempt?.progress ?? 0,
          score: attempt?.status === 'graded' ? attempt.score : null,
          maxScore: attempt?.maxScore || paper.marks,
          gradeLabel: attempt?.gradeLabel || '',
          feedback: attempt?.feedback || '',
          tutorName: paper.tutorName,
          urgent: paper.urgent,
          bucket,
          action: actionFor(status, paper.kind, paper.urgent),
        };
      });
    const counts = {
      all: items.length,
      dueSoon: items.filter((item) => item.bucket === 'dueSoon').length,
      inProgress: items.filter((item) => item.bucket === 'inProgress').length,
      completed: items.filter((item) => item.bucket === 'completed').length,
    };
    const resume = items.find((item) => item.status === 'in_progress') ?? items.find((item) => item.urgent);
    res.json({
      cohort: 'Cohort: 2026 Semester 2',
      health: {
        ...(growth?.momentum ?? { avgScore: 0, completed: 0, pending: 0, urgent: 0, percentile: '', spotlightTitle: '', spotlightDetail: '' }),
        resumePaperId: resume?.paperId,
      },
      counts,
      items,
    });
  } catch (err) {
    next(err);
  }
}

export async function getImprovementHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await studentReady(req);
    const growth = await AssessmentGrowth.findOne({ studentId });
    if (!growth) {
      res.status(404).json({ message: 'Improvement history is not ready yet.' });
      return;
    }
    const papers = await AssessmentPaper.find({ seedKey: { $in: growth.timeline.map((item) => item.paperSeed).filter(Boolean) } });
    const bySeed = new Map(papers.map((paper) => [paper.seedKey, String(paper._id)]));
    res.json({
      semester: growth.semester,
      weekLabel: growth.weekLabel,
      growth: growth.growth,
      growthDetail: growth.growthDetail,
      cohortRank: growth.cohortRank,
      stats: growth.stats,
      target: growth.target,
      modules: growth.modules,
      points: growth.points,
      competencies: growth.competencies,
      timeline: growth.timeline.map((item) => ({ ...item, paperId: item.paperSeed ? bySeed.get(item.paperSeed) : undefined })),
      focus: growth.focus,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTakePaper(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await ensureAssessmentCatalog();
    const paper = await AssessmentPaper.findById(req.params.id);
    if (!paper) {
      res.status(404).json({ message: 'Assessment not found.' });
      return;
    }
    const preview = req.userRole === 'mentor' || req.userRole === 'admin' || req.userRole === 'lic';
    if (!preview && paper.status !== 'published' && paper.status !== 'closed') {
      res.status(403).json({ message: 'This assessment is not open yet.' });
      return;
    }
    let attempt = null;
    if (!preview && req.userRole === 'student') {
      await ensureStudentAssessmentExtras(String(req.userId));
      attempt = await AssessmentAttempt.findOne({ paperId: paper._id, studentId: req.userId });
      if (!attempt && paper.status === 'published') {
        attempt = await AssessmentAttempt.create({
          paperId: paper._id,
          studentId: req.userId,
          answers: {},
          flagged: [],
          questionIndex: 0,
          status: 'in_progress',
          score: null,
          maxScore: paper.marks,
          progress: 0,
          startedAt: new Date(),
        });
      }
    }
    const reveal = Boolean(attempt && (attempt.status === 'graded' || attempt.status === 'submitted'));
    res.json({
      paper: {
        _id: paper._id,
        title: paper.title,
        moduleCode: paper.moduleCode,
        moduleName: paper.moduleName,
        kind: paper.kind,
        kindLabel: paper.kindLabel,
        durationMin: paper.durationMin,
        marks: paper.marks,
        tutorName: paper.tutorName,
        status: paper.status,
        questions: (paper.questions as WorkQuestion[]).map((question) => publicQuestion(question, reveal)),
      },
      attempt: {
        answers: attempt?.answers ?? {},
        flagged: attempt?.flagged ?? [],
        questionIndex: attempt?.questionIndex ?? 0,
        status: attempt?.status ?? 'preview',
        secondsLeft: secondsLeft(attempt?.startedAt, paper.durationMin),
        preview,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function saveAttempt(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await studentReady(req);
    const paper = await AssessmentPaper.findById(req.params.id);
    if (!paper || (paper.status !== 'published' && paper.status !== 'closed')) {
      res.status(404).json({ message: 'Assessment not found.' });
      return;
    }
    const attempt = await AssessmentAttempt.findOne({ paperId: paper._id, studentId });
    if (!attempt || attempt.status !== 'in_progress') {
      res.status(409).json({ message: 'This attempt can no longer be edited.' });
      return;
    }
    const questions = paper.questions as WorkQuestion[];
    const answers = (req.body.answers ?? attempt.answers) as Record<string, WorkAnswer>;
    const answered = questions.filter((question) => {
      const answer = answers[question.id];
      if (!answer) return false;
      return Boolean(
        answer.choiceIds?.length
        || answer.boolean !== undefined
        || answer.text?.trim()
        || Object.keys(answer.blanks ?? {}).length
        || Object.keys(answer.matches ?? {}).length
        || answer.order?.length
        || Object.keys(answer.placements ?? {}).length
        || answer.files?.length
        || answer.repoUrl,
      );
    }).length;
    attempt.answers = answers;
    attempt.flagged = Array.isArray(req.body.flagged) ? req.body.flagged : attempt.flagged;
    attempt.questionIndex = Number(req.body.questionIndex ?? attempt.questionIndex);
    attempt.progress = questions.length ? Math.round((answered / questions.length) * 100) : 0;
    if (!attempt.startedAt) attempt.startedAt = new Date();
    await attempt.save();
    res.json({ progress: attempt.progress, questionIndex: attempt.questionIndex, secondsLeft: secondsLeft(attempt.startedAt, paper.durationMin) });
  } catch (err) {
    next(err);
  }
}

export async function submitAttempt(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await studentReady(req);
    const paper = await AssessmentPaper.findOne({ _id: req.params.id, status: 'published' });
    if (!paper) {
      res.status(404).json({ message: 'Assessment is not open for submission.' });
      return;
    }
    const attempt = await AssessmentAttempt.findOne({ paperId: paper._id, studentId });
    if (!attempt || attempt.status !== 'in_progress') {
      res.status(409).json({ message: 'This attempt was already submitted.' });
      return;
    }
    if (req.body.answers) attempt.answers = req.body.answers;
    const questions = paper.questions as WorkQuestion[];
    const rows = questions.map((question) => gradeQuestion(question, attempt.answers?.[question.id]));
    const manual = rows.some((row) => row.manual);
    const autoMax = rows.filter((row) => !row.manual).reduce((sum, row) => sum + row.max, 0);
    const autoScore = rows.filter((row) => !row.manual).reduce((sum, row) => sum + row.awarded, 0);
    attempt.breakdown = rows.map(({ manual: _manual, ...row }) => row);
    attempt.progress = 100;
    attempt.submittedAt = new Date();
    attempt.maxScore = paper.marks;
    if (manual) {
      attempt.status = 'submitted';
      attempt.score = null;
      attempt.gradeLabel = '';
      attempt.feedback = 'Submitted. Your tutor will review the open-ended work.';
    } else {
      const scaled = autoMax ? Math.round((autoScore / autoMax) * paper.marks) : 0;
      attempt.status = 'graded';
      attempt.score = scaled;
      attempt.gradeLabel = gradeLabel(scaled, paper.marks);
      attempt.feedback = scaled >= 80
        ? 'Strong result. Review any missed item before the finals.'
        : 'Submitted and graded. Open the result to see which parts to revise.';
    }
    await attempt.save();
    res.json(await resultPayload(paper, attempt));
  } catch (err) {
    next(err);
  }
}

async function resultPayload(paper: { _id: unknown; title: string; moduleCode: string; moduleName: string; kindLabel: string; tutorName: string; gradesReleased: boolean; marks: number }, attempt: { status: string; score: number | null; maxScore: number; gradeLabel?: string; feedback?: string; breakdown?: unknown[] }) {
  const pending = attempt.status === 'submitted' || (attempt.status === 'graded' && !paper.gradesReleased && attempt.score === null);
  return {
    paperId: paper._id,
    title: paper.title,
    moduleCode: paper.moduleCode,
    moduleName: paper.moduleName,
    kindLabel: paper.kindLabel,
    status: attempt.status,
    score: attempt.status === 'graded' ? attempt.score : null,
    maxScore: attempt.maxScore || paper.marks,
    gradeLabel: attempt.gradeLabel ?? '',
    feedback: attempt.feedback ?? '',
    tutorName: paper.tutorName,
    pendingReview: attempt.status !== 'graded',
    breakdown: attempt.breakdown ?? [],
  };
}

export async function getAttemptResult(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const studentId = await studentReady(req);
    const paper = await AssessmentPaper.findById(req.params.id);
    const attempt = await AssessmentAttempt.findOne({ paperId: req.params.id, studentId });
    if (!paper || !attempt || attempt.status === 'in_progress') {
      res.status(404).json({ message: 'No result for this assessment yet.' });
      return;
    }
    res.json(await resultPayload(paper, attempt));
  } catch (err) {
    next(err);
  }
}

export async function getTutorHub(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await ensureAssessmentCatalog();
    const visible = await AssessmentPaper.find({
      $or: [{ tutorId: req.userId }, { seedKey: { $exists: true } }],
    }).sort({ createdAt: 1 });
    const attempts = await AssessmentAttempt.find({ paperId: { $in: visible.map((item) => item._id) }, status: { $ne: 'in_progress' } });
    const items = visible.map((paper) => {
      const rows = attempts.filter((item) => String(item.paperId) === String(paper._id));
      const graded = rows.filter((item) => item.status === 'graded' && item.score !== null);
      const pendingGrade = rows.filter((item) => item.status === 'submitted').length;
      const average = graded.length ? Math.round(graded.reduce((sum, item) => sum + (item.score ?? 0), 0) / graded.length) : null;
      return {
        paperId: paper._id,
        moduleCode: paper.moduleCode,
        kindLabel: paper.kindLabel,
        title: paper.title,
        submitted: rows.length,
        enrolled: 38,
        average,
        closesLabel: paper.dueLabel,
        pendingGrade,
        status: paper.status,
        reviewNote: paper.reviewNote ?? '',
      };
    });
    const pending = attempts.filter((item) => item.status === 'submitted');
    const gradedScores = attempts.filter((item) => item.status === 'graded' && item.score !== null);
    res.json({
      modules: new Set(visible.map((item) => item.moduleCode)).size,
      enrolled: 86,
      pendingGrading: pending.length,
      pendingShort: pending.length ? Math.max(pending.length - 1, 0) : 0,
      pendingProjects: pending.length ? 1 : 0,
      liveTests: visible.filter((item) => item.status === 'published').length > 0 ? 2 : 0,
      liveParticipants: 42,
      classAverage: gradedScores.length ? Math.round(gradedScores.reduce((sum, item) => sum + (item.score ?? 0), 0) / gradedScores.length) : 78,
      averageDelta: 3.2,
      bankCount: visible.reduce((sum, item) => sum + (item.questions?.length ?? 0), 0) + 120,
      activeCount: visible.filter((item) => item.status === 'published' || item.status === 'pending_review').length,
      items,
    });
  } catch (err) {
    next(err);
  }
}

export async function createTutorPaper(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await ensureAssessmentCatalog();
    const kind = req.body.kind as AssessmentKind;
    if (!ASSESSMENT_KINDS.includes(kind)) {
      res.status(400).json({ message: 'Choose an assessment type.' });
      return;
    }
    if (!req.body.title || !Array.isArray(req.body.questions) || req.body.questions.length === 0) {
      res.status(400).json({ message: 'Add a title and at least one question.' });
      return;
    }
    const tutor = await User.findById(req.userId);
    const paper = await AssessmentPaper.create({
      tutorId: req.userId,
      tutorName: tutor?.name || 'Tutor',
      moduleCode: req.body.moduleCode || 'CS0000',
      moduleName: req.body.moduleName || 'Module',
      title: req.body.title,
      kind,
      kindLabel: req.body.kindLabel || kind,
      marks: Number(req.body.marks) || 10,
      durationMin: Number(req.body.durationMin) || 30,
      chips: req.body.chips ?? [],
      dueLabel: req.body.dueLabel || 'Awaiting schedule',
      detail: req.body.detail || '',
      status: req.body.publish ? 'pending_review' : 'draft',
      urgent: false,
      gradesReleased: false,
      questions: req.body.questions,
    });
    res.status(201).json({ paperId: paper._id, status: paper.status });
  } catch (err) {
    next(err);
  }
}

export async function getTutorSubmissions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const paper = await AssessmentPaper.findById(req.params.id);
    if (!paper) {
      res.status(404).json({ message: 'Assessment not found.' });
      return;
    }
    const attempts = await AssessmentAttempt.find({ paperId: paper._id, status: { $ne: 'in_progress' } }).populate('studentId', 'name email');
    res.json({
      paper: { _id: paper._id, title: paper.title, moduleCode: paper.moduleCode, status: paper.status, gradesReleased: paper.gradesReleased },
      submissions: attempts.map((item) => ({
        attemptId: item._id,
        student: item.studentId,
        status: item.status,
        score: item.score,
        maxScore: item.maxScore,
        feedback: item.feedback,
        submittedAt: item.submittedAt,
        breakdown: item.breakdown,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function gradeSubmission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const score = Number(req.body.score);
    const attempt = await AssessmentAttempt.findById(req.params.attemptId);
    if (!attempt) {
      res.status(404).json({ message: 'Submission not found.' });
      return;
    }
    if (!Number.isFinite(score) || score < 0 || score > attempt.maxScore) {
      res.status(400).json({ message: `Score must be between 0 and ${attempt.maxScore}.` });
      return;
    }
    attempt.score = score;
    attempt.status = 'graded';
    attempt.gradeLabel = gradeLabel(score, attempt.maxScore);
    attempt.feedback = req.body.feedback || attempt.feedback || 'Graded by tutor.';
    await attempt.save();
    await notify(attempt.studentId, {
      kind: 'grade',
      title: 'Assessment graded',
      body: 'Your tutor saved a mark. It appears when grades are released.',
      refId: String(attempt.paperId),
    });
    res.json({ attemptId: attempt._id, score: attempt.score, gradeLabel: attempt.gradeLabel, status: attempt.status });
  } catch (err) {
    next(err);
  }
}

export async function releaseGrades(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const paper = await AssessmentPaper.findByIdAndUpdate(req.params.id, { gradesReleased: true }, { new: true });
    if (!paper) {
      res.status(404).json({ message: 'Assessment not found.' });
      return;
    }
    const attempts = await AssessmentAttempt.find({ paperId: paper._id });
    await Promise.all(attempts.map((attempt) => notify(attempt.studentId, {
      kind: 'grade',
      title: 'Grades released',
      body: `${paper.title} results are ready.`,
      refId: String(paper._id),
    })));
    res.json({ paperId: paper._id, gradesReleased: paper.gradesReleased });
  } catch (err) {
    next(err);
  }
}

export async function assignPaper(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const paper = await AssessmentPaper.findOne({ _id: req.params.id, tutorId: req.userId });
    if (!paper) {
      res.status(404).json({ message: 'Assessment not found.' });
      return;
    }
    const studentIds = Array.isArray(req.body.studentIds) ? req.body.studentIds.map(String) : [];
    if (!studentIds.length) {
      res.status(400).json({ message: 'Choose at least one student.' });
      return;
    }
    paper.assignedStudentIds = studentIds
      .filter((id: string) => mongoose.isValidObjectId(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));
    if (paper.status === 'draft') paper.status = 'pending_review';
    await paper.save();
    await Promise.all(studentIds.map((studentId: string) => notify(studentId, {
      kind: 'grade',
      title: 'Assessment assigned',
      body: paper.status === 'published'
        ? `${paper.title} is on your assessment list.`
        : `${paper.title} was assigned and will appear after it is published.`,
      refId: String(paper._id),
    })));
    res.json({ paperId: paper._id, assigned: studentIds.length, status: paper.status });
  } catch (err) {
    next(err);
  }
}

export async function getAdminPortal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await ensureAssessmentCatalog();
    const [catalog, pending] = await Promise.all([
      CatalogMaterial.find().sort({ createdAt: 1 }),
      AssessmentPaper.find({ status: { $in: ['pending_review', 'changes_requested'] } }).sort({ updatedAt: -1 }),
    ]);
    res.json({
      stats: {
        catalog: 428,
        free: 310,
        premium: 118,
        avgPrice: '1,250',
        span: '500-3.5k',
        cap: '2.5k',
        revenue: '485k',
        tutorShare: '90%',
        poolShare: '10%',
        downloads: '14.8k',
      },
      policy: 'Standard tutor packs capped at LKR 2,500. Automatic 10% subsidy applied for faculty-verified Student Pass holders.',
      campaign: {
        title: 'Bulk Campaign: Exam Season',
        detail: 'Apply a timed 15% finals discount across all Year 2 IT study packs. Tutor royalty rate preserved via the university subsidy pool.',
      },
      pendingPapers: pending.map((paper) => ({
        paperId: paper._id,
        title: paper.title,
        tutorName: paper.tutorName,
        kindLabel: paper.kindLabel,
        moduleCode: paper.moduleCode,
        status: paper.status,
        reviewNote: paper.reviewNote ?? '',
      })),
      catalog,
    });
  } catch (err) {
    next(err);
  }
}

export async function reviewPaper(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const decision = req.body.decision === 'approve' ? 'published' : 'changes_requested';
    const paper = await AssessmentPaper.findById(req.params.id);
    if (!paper) {
      res.status(404).json({ message: 'Assessment not found.' });
      return;
    }
    paper.status = decision;
    paper.reviewNote = req.body.note || (decision === 'published' ? 'Approved by faculty LIC.' : 'Please revise before this can be published.');
    if (decision === 'published') paper.gradesReleased = true;
    await paper.save();
    res.json({ paperId: paper._id, status: paper.status, reviewNote: paper.reviewNote });
  } catch (err) {
    next(err);
  }
}

export async function addCatalogItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.body.title || !req.body.moduleCode) {
      res.status(400).json({ message: 'Module code and title are required.' });
      return;
    }
    const item = await CatalogMaterial.create({
      seedKey: `pack-${Date.now()}`,
      moduleCode: req.body.moduleCode,
      badge: req.body.badge || 'LIC Added',
      title: req.body.title,
      author: req.body.author || 'Campus Admin',
      priceLabel: req.body.priceLabel || 'FREE',
      meta: 'Just added',
      tier: req.body.tier || 'free',
      detail: req.body.detail || 'Added from the campus admin portal.',
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}
